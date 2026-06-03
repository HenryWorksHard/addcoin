// Real pump.fun launcher (PumpPortal Local Transaction API).
//
// SERVER / WORKER ONLY. This file imports node:fs and @solana/web3.js and reads
// the wallet secret -- it must never be imported by client/browser code. The
// site uses lib/launcher.ts (sim) only; the always-on worker imports this.
//
// Per coin, non-custodial flow (no PumpPortal key needed -- just an RPC + the
// creator wallet):
//   1. upload name/symbol/image to IPFS  -> metadata URI
//   2. generate a fresh mint keypair     -> the contract address (CA)
//   3. ask PumpPortal for an unsigned "create" transaction
//   4. sign locally (mint keypair + creator wallet)
//   5. (real mode only) broadcast via RPC + confirm
//
// Mode "dry" runs steps 1-4 and skips the broadcast, so the whole pipeline is
// exercised for free -- no SOL leaves the wallet.

import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AdCoin } from "./coins";
import type { Launcher, LaunchResult } from "./launcher";

export type LaunchMode = "sim" | "dry" | "real";

export type PumpLauncherOptions = {
  mode: LaunchMode;
  rpcUrl: string;
  walletSecret: string;
  devBuySol?: number; // creator's initial buy in SOL (0 = create only, no buy)
  slippage?: number; // percent
  priorityFee?: number; // SOL
  description?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  imageDir?: string; // where ad images live; default <cwd>/public/popups
};

export type PumpLauncher = Launcher & {
  mode: LaunchMode;
  signerPubkey: string;
  getBalanceSol(): Promise<number>;
};

function loadSigner(secret: string): Keypair {
  const raw = (secret ?? "").trim();
  if (!raw) throw new Error("LAUNCH_WALLET_SECRET is empty");
  // Support both base58 (Phantom export) and a JSON byte array.
  if (raw.startsWith("[")) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  return Keypair.fromSecretKey(bs58.decode(raw));
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}

// A 24/7 worker must never block forever on a stalled connection. Every network
// call is bounded by a timeout.
const IPFS_TIMEOUT_MS = 30000;
const API_TIMEOUT_MS = 20000;
const RPC_TIMEOUT_MS = 20000;

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

async function uploadMetadata(
  coin: AdCoin,
  opts: PumpLauncherOptions
): Promise<{ name: string; symbol: string; uri: string }> {
  const dir = opts.imageDir ?? path.join(process.cwd(), "public", "popups");
  const file = path.join(dir, `${coin.id}.jpg`);
  const buf = await readFile(file);

  const fd = new FormData();
  fd.append("file", new Blob([buf], { type: "image/jpeg" }), `${coin.id}.jpg`);
  fd.append("name", coin.name);
  fd.append("symbol", coin.symbol);
  fd.append("description", opts.description ?? "");
  fd.append("twitter", opts.twitter ?? "");
  fd.append("telegram", opts.telegram ?? "");
  fd.append("website", opts.website ?? "");
  fd.append("showName", "true");

  const res = await fetchWithTimeout("https://pump.fun/api/ipfs", { method: "POST", body: fd }, IPFS_TIMEOUT_MS);
  if (!res.ok) throw new Error(`IPFS upload failed (${res.status}): ${await safeText(res)}`);

  const j = (await res.json()) as { metadataUri?: string; metadata?: { name?: string; symbol?: string } };
  if (!j.metadataUri) throw new Error("IPFS upload returned no metadataUri");
  return {
    name: j.metadata?.name ?? coin.name,
    symbol: j.metadata?.symbol ?? coin.symbol,
    uri: j.metadataUri,
  };
}

async function fetchCreateTx(
  signer: Keypair,
  mint: Keypair,
  meta: { name: string; symbol: string; uri: string },
  opts: PumpLauncherOptions
): Promise<VersionedTransaction> {
  const res = await fetchWithTimeout(
    "https://pumpportal.fun/api/trade-local",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicKey: signer.publicKey.toBase58(),
        action: "create",
        tokenMetadata: { name: meta.name, symbol: meta.symbol, uri: meta.uri },
        mint: mint.publicKey.toBase58(),
        denominatedInSol: "true",
        amount: opts.devBuySol ?? 0,
        slippage: opts.slippage ?? 10,
        priorityFee: opts.priorityFee ?? 0.0005,
        pool: "pump",
      }),
    },
    API_TIMEOUT_MS
  );
  if (res.status !== 200) throw new Error(`trade-local failed (${res.status}): ${await safeText(res)}`);
  const data = await res.arrayBuffer();
  return VersionedTransaction.deserialize(new Uint8Array(data));
}

export function createPumpLauncher(opts: PumpLauncherOptions): PumpLauncher {
  if (opts.mode === "sim") throw new Error("createPumpLauncher called with mode 'sim' -- use simLauncher instead");
  const signer = loadSigner(opts.walletSecret);
  const connection = new Connection(opts.rpcUrl, "confirmed");

  return {
    mode: opts.mode,
    signerPubkey: signer.publicKey.toBase58(),

    async getBalanceSol() {
      const lamports = await withTimeout(connection.getBalance(signer.publicKey), RPC_TIMEOUT_MS, "getBalance");
      return lamports / 1e9;
    },

    async launch(coin: AdCoin): Promise<LaunchResult> {
      const mint = Keypair.generate();
      const meta = await uploadMetadata(coin, opts);
      const tx = await fetchCreateTx(signer, mint, meta, opts);
      tx.sign([mint, signer]);

      if (opts.mode === "dry") {
        return { mint: mint.publicKey.toBase58(), signature: "dry-run", uri: meta.uri, dryRun: true };
      }

      const sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });
      await connection.confirmTransaction(sig, "confirmed");
      return { mint: mint.publicKey.toBase58(), signature: sig, uri: meta.uri };
    },
  };
}
