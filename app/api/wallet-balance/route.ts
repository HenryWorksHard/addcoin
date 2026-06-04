import { NextResponse } from "next/server";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { LAUNCH_WALLET, DEX_PROMO } from "@/lib/coins";

// Reads the current on-chain SOL balance of the launch wallet (and the separate
// Dexscreener promo wallet) and serves it to the site. Read-only: needs only the
// wallets' PUBLIC addresses -- never a private key. Cached in memory so the RPC
// load stays trivial even with many visitors polling.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "cache-control": "no-store" } as const;

type Balances = { launch: number; dex: number; updatedAt: number };

let cache: { at: number; data: Balances } | null = null;
let inflight: Promise<Balances> | null = null;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

async function readBalance(conn: Connection, address: string): Promise<number> {
  if (!address) return 0;
  let key: PublicKey;
  try {
    key = new PublicKey(address);
  } catch {
    return 0;
  }
  const lamports = await withTimeout(conn.getBalance(key), 12000, "getBalance");
  return lamports / LAMPORTS_PER_SOL;
}

export async function GET() {
  const cacheMs = Number(process.env.BALANCE_CACHE_MS ?? 30000);
  const now = Date.now();
  if (cache && now - cache.at < cacheMs) {
    return NextResponse.json({ ok: true, balances: cache.data, cached: true }, { headers: noStore });
  }

  const rpcUrl = (
    process.env.SOLANA_RPC_URL ??
    process.env.PROMO_RPC_URL ??
    "https://api.mainnet-beta.solana.com"
  ).trim();

  try {
    if (!inflight) {
      inflight = (async () => {
        const conn = new Connection(rpcUrl, "confirmed");
        const [launch, dex] = await Promise.all([
          readBalance(conn, LAUNCH_WALLET),
          readBalance(conn, DEX_PROMO.wallet),
        ]);
        return { launch, dex, updatedAt: Date.now() };
      })();
    }
    const data = await inflight;
    inflight = null;
    cache = { at: Date.now(), data };
    return NextResponse.json({ ok: true, balances: data }, { headers: noStore });
  } catch (e) {
    inflight = null;
    // On RPC failure, keep serving the last good read rather than dropping to 0.
    if (cache) {
      return NextResponse.json({ ok: true, balances: cache.data, stale: true }, { headers: noStore });
    }
    const reason = e instanceof Error ? e.message : "rpc-error";
    return NextResponse.json({ ok: false, reason }, { headers: noStore });
  }
}
