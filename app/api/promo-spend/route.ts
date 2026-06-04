import { NextResponse } from "next/server";
import { readWalletSpend, type PromoSpend } from "@/lib/promoSpend";
import { LAUNCH_WALLET } from "@/lib/coins";

// Reads the SEPARATE Dexscreener promo wallet's on-chain SOL spend and serves it
// to the site. Promo spend changes rarely, so the result is cached in memory for
// PROMO_CACHE_MS to keep RPC load trivial. Read-only: needs only the wallet's
// PUBLIC address (PROMO_WALLET_ADDRESS) -- never a private key. If no wallet is
// set, the panel falls back to the manual DEX_PROMO numbers in lib/coins.ts.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function splitAddrs(v: string | undefined): string[] {
  return (v ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const noStore = { "cache-control": "no-store" } as const;

let cache: { at: number; data: PromoSpend } | null = null;
let inflight: Promise<PromoSpend> | null = null;

export async function GET() {
  const wallet = (process.env.PROMO_WALLET_ADDRESS ?? "").trim();
  if (!wallet) {
    return NextResponse.json({ ok: false, reason: "no-wallet" }, { headers: noStore });
  }

  const cacheMs = Number(process.env.PROMO_CACHE_MS ?? 300000);
  const now = Date.now();
  if (cache && now - cache.at < cacheMs) {
    return NextResponse.json({ ok: true, spend: cache.data, cached: true }, { headers: noStore });
  }

  const rpcUrl = (
    process.env.PROMO_RPC_URL ??
    process.env.SOLANA_RPC_URL ??
    "https://api.mainnet-beta.solana.com"
  ).trim();
  const boostAddrs = splitAddrs(process.env.DEX_BOOST_ADDRESSES);
  const adAddrs = splitAddrs(process.env.DEX_AD_ADDRESSES);
  // Outflow to the launch wallet is the auto-refuel, not promotion -- exclude it
  // so the panel counts only money actually spent boosting. Add more addresses
  // via PROMO_EXCLUDE_ADDRESSES if needed.
  const excludeAddrs = [LAUNCH_WALLET, ...splitAddrs(process.env.PROMO_EXCLUDE_ADDRESSES)];
  const maxSignatures = Number(process.env.PROMO_MAX_SIGS ?? 200);

  try {
    if (!inflight) {
      inflight = readWalletSpend({
        rpcUrl,
        wallet,
        boostAddrs,
        adAddrs,
        excludeAddrs,
        maxSignatures,
        batchSize: 5,
      });
    }
    const data = await inflight;
    inflight = null;
    cache = { at: Date.now(), data };
    return NextResponse.json({ ok: true, spend: data }, { headers: noStore });
  } catch (e) {
    inflight = null;
    // On RPC failure, keep serving the last good read rather than dropping to $0.
    if (cache) {
      return NextResponse.json({ ok: true, spend: cache.data, stale: true }, { headers: noStore });
    }
    const reason = e instanceof Error ? e.message : "rpc-error";
    return NextResponse.json({ ok: false, reason }, { headers: noStore });
  }
}
