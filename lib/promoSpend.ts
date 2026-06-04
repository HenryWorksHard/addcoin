// Server / worker only. Reads a Solana wallet's OUTGOING SOL via RPC and, when
// destination addresses are known, splits it into Dexscreener Boosts vs Ads.
//
// Why this exists: the Dexscreener promo wallet is dedicated to promotion, so its
// total outflow == total spent promoting $AdFund. Boosts are paid on-chain to a
// Dexscreener checkout address; ads MAY be paid on-chain (SOL) or off-chain (card).
// We tag an outgoing tx as a boost/ad when its SOL lands on a configured address;
// the rest is "other" (unclassified or non-Dex). USDC and card spend are NOT
// counted here -- this reads native SOL movement only.
//
// The browser must NEVER import this (it pulls in @solana/web3.js + hits RPC). It
// is read-only and needs only the wallet's PUBLIC address -- never a private key.

import { Connection, PublicKey } from "@solana/web3.js";

export type PromoSpend = {
  wallet: string;
  totalSol: number; // promo SOL sent out (excludes internal refuels to excludeAddrs; fees included)
  boostsSol: number; // outflow tagged as a Dex "boost" (or, with no addresses set, all non-refuel outflow)
  adsSol: number; // outflow that landed on a known Dex "ad" address
  otherSol: number; // promo outflow not matched to a known address
  txCount: number; // signatures scanned
  updatedAt: number;
};

const LAMPORTS_PER_SOL = 1_000_000_000;

export type ReadWalletSpendOpts = {
  rpcUrl: string;
  wallet: string;
  boostAddrs?: string[];
  adAddrs?: string[];
  excludeAddrs?: string[]; // outflow to these is NOT promo spend (e.g. the launch wallet auto-refuel)
  startTs?: number; // unix ms; ignore txns before this time (zero-base the counter)
  maxSignatures?: number; // how far back to scan; default 200
  batchSize?: number; // parsed-tx fetch chunk; default 25 (RPCs cap response size)
  delayMs?: number; // pause between batches to stay under rate limits; default 120
  timeoutMs?: number; // per-RPC-call timeout; default 15000
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

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

export async function readWalletSpend(opts: ReadWalletSpendOpts): Promise<PromoSpend> {
  const { rpcUrl, wallet } = opts;
  const maxSignatures = opts.maxSignatures ?? 200;
  const batchSize = Math.max(1, Math.min(opts.batchSize ?? 25, 100));
  const delayMs = opts.delayMs ?? 120;
  const timeoutMs = opts.timeoutMs ?? 15000;
  const boostSet = new Set((opts.boostAddrs ?? []).filter(Boolean));
  const adSet = new Set((opts.adAddrs ?? []).filter(Boolean));
  const excludeSet = new Set((opts.excludeAddrs ?? []).filter(Boolean));
  // When no Dex Boost/Ad addresses are configured, treat every outgoing payment
  // that is NOT an excluded internal refuel as a Dex Boost.
  const tagByAddress = boostSet.size > 0 || adSet.size > 0;

  const conn = new Connection(rpcUrl, "confirmed");
  const owner = new PublicKey(wallet);
  const ownerKey = owner.toBase58();

  const sigInfos = await withTimeout(
    conn.getSignaturesForAddress(owner, { limit: maxSignatures }),
    timeoutMs,
    "getSignaturesForAddress"
  );
  // Optional zero-base: ignore anything before opts.startTs so prior/unrelated
  // wallet history doesn't inflate the spend. Solana sig times are unix seconds.
  const startSec = opts.startTs && opts.startTs > 0 ? Math.floor(opts.startTs / 1000) : 0;
  const sigs = sigInfos
    .filter((s) => !s.err)
    .filter((s) => startSec === 0 || (typeof s.blockTime === "number" && s.blockTime >= startSec))
    .map((s) => s.signature);

  let totalLamports = 0;
  let boostLamports = 0;
  let adLamports = 0;
  let excludeLamports = 0;

  // Fetch one transaction at a time. Batched getParsedTransactions is faster but
  // many RPC providers (Helius included) reject or rate-limit JSON-RPC batches;
  // single calls with a short pause are the portable, reliable path. A dedicated
  // promo wallet has few txns, and the API route caches the result, so the extra
  // round-trips are cheap. `batchSize` controls how many run concurrently.
  for (let i = 0; i < sigs.length; i += batchSize) {
    if (i > 0 && delayMs > 0) await sleep(delayMs);
    const chunk = sigs.slice(i, i + batchSize);
    const txs = await Promise.all(
      chunk.map((sig) =>
        withTimeout(
          conn.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0 }),
          timeoutMs,
          "getParsedTransaction"
        )
      )
    );
    for (const tx of txs) {
      if (!tx || !tx.meta) continue;
      const keys = tx.transaction.message.accountKeys;
      const idx = keys.findIndex((k) => k.pubkey.toBase58() === ownerKey);
      if (idx < 0) continue;
      const pre = tx.meta.preBalances[idx] ?? 0;
      const post = tx.meta.postBalances[idx] ?? 0;
      const outLamports = pre - post; // > 0 means this wallet's balance dropped
      if (outLamports <= 0) continue; // incoming or net-zero for this wallet
      totalLamports += outLamports;

      // Sum what each tracked bucket GAINED from this tx (by recipient address).
      let excludeGain = 0;
      let boostGain = 0;
      let adGain = 0;
      for (let j = 0; j < keys.length; j++) {
        const addr = keys[j].pubkey.toBase58();
        const gain = (tx.meta.postBalances[j] ?? 0) - (tx.meta.preBalances[j] ?? 0);
        if (gain <= 0) continue;
        if (excludeSet.has(addr)) excludeGain += gain;
        else if (boostSet.has(addr)) boostGain += gain;
        else if (adSet.has(addr)) adGain += gain;
      }

      // Refuels to an excluded wallet (e.g. the launch wallet) are internal, not
      // promotion -- drop them from the spend total.
      excludeGain = Math.min(excludeGain, outLamports);
      excludeLamports += excludeGain;
      const promoOut = outLamports - excludeGain;

      if (tagByAddress) {
        const b = Math.min(boostGain, promoOut);
        const a = Math.min(adGain, promoOut - b);
        boostLamports += b;
        adLamports += a;
      } else {
        boostLamports += promoOut; // everything that isn't a refuel counts as a boost
      }
    }
  }

  // "Spent promoting" excludes internal refuels (excludeLamports).
  const promoLamports = Math.max(0, totalLamports - excludeLamports);
  const totalSol = promoLamports / LAMPORTS_PER_SOL;
  const boostsSol = boostLamports / LAMPORTS_PER_SOL;
  const adsSol = adLamports / LAMPORTS_PER_SOL;
  const otherSol = Math.max(0, totalSol - boostsSol - adsSol);

  return {
    wallet: ownerKey,
    totalSol,
    boostsSol,
    adsSol,
    otherSol,
    txCount: sigs.length,
    updatedAt: Date.now(),
  };
}
