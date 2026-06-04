// Auto-refuel (server / worker ONLY).
//
// Keeps the launch wallet funded so the engine never stalls: when the launch
// wallet's balance drops to/below a threshold, it sends a fixed amount of SOL
// from the SEPARATE Dexscreener/promo wallet -> launch wallet.
//
// This is the ONLY place that moves money automatically, and it is NEVER exposed
// over HTTP. It runs inside the trusted always-on worker process (which already
// holds the keys), self-triggered by an on-chain balance read -- so there is no
// public button or endpoint anyone could hit to drain the wallet.
//
// The browser must NEVER import this (it pulls in @solana/web3.js + the secret).

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

export type TopUpMode = "dry" | "real";

export type TopUpOptions = {
  mode: TopUpMode;
  rpcUrl: string;
  fromSecret: string; // dex/promo wallet private key (bs58 or JSON byte array)
  toAddress: string; // launch wallet PUBLIC address (the refuel destination)
  thresholdSol: number; // refuel when launch balance <= this
  amountSol: number; // how much to send each refuel
  reserveSol?: number; // keep at least this much in the source wallet (default 0)
  cooldownMs?: number; // min gap between refuel attempts (default 60s)
  feeBufferSol?: number; // headroom left for the network fee (default 0.001)
};

export type TopUpResult = {
  attempted: boolean; // true when the launch balance was at/below threshold
  sent: boolean; // true only when a real transfer was broadcast + confirmed
  dryRun?: boolean; // true when below threshold in dry mode (no broadcast)
  amountSol: number;
  launchBalance: number; // launch-wallet balance read this check
  signature?: string;
  reason?: string; // why a refuel was skipped (e.g. insufficient source balance)
};

export type TopUp = {
  signerPubkey: string;
  maybeTopUp(): Promise<TopUpResult>;
};

function loadSigner(secret: string): Keypair {
  const raw = (secret ?? "").trim();
  if (!raw) throw new Error("topup: source wallet secret is empty");
  // Support both base58 (Phantom export) and a JSON byte array.
  if (raw.startsWith("[")) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  return Keypair.fromSecretKey(bs58.decode(raw));
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

export function createTopUp(opts: TopUpOptions): TopUp {
  const signer = loadSigner(opts.fromSecret);
  const toPubkey = new PublicKey(opts.toAddress);
  const reserveSol = opts.reserveSol ?? 0;
  const cooldownMs = opts.cooldownMs ?? 60000;
  const feeBufferSol = opts.feeBufferSol ?? 0.001;
  const conn = new Connection(opts.rpcUrl, "confirmed");

  // Guards against a double-send when an on-chain balance read still reflects the
  // pre-refuel state on the very next loop. Only set after an attempt crosses the
  // threshold, so a healthy wallet is never throttled.
  let lastAttemptAt = 0;

  async function balanceSol(key: PublicKey): Promise<number> {
    const lamports = await withTimeout(conn.getBalance(key), 15000, "getBalance");
    return lamports / LAMPORTS_PER_SOL;
  }

  async function maybeTopUp(): Promise<TopUpResult> {
    const launchBalance = await balanceSol(toPubkey);
    if (launchBalance > opts.thresholdSol) {
      return { attempted: false, sent: false, amountSol: opts.amountSol, launchBalance };
    }
    if (Date.now() - lastAttemptAt < cooldownMs) {
      return { attempted: false, sent: false, amountSol: opts.amountSol, launchBalance };
    }
    lastAttemptAt = Date.now();

    const sourceBalance = await balanceSol(signer.publicKey);
    const needed = opts.amountSol + reserveSol + feeBufferSol;
    if (sourceBalance < needed) {
      return {
        attempted: true,
        sent: false,
        amountSol: opts.amountSol,
        launchBalance,
        reason: `source balance ${sourceBalance.toFixed(4)} SOL < needed ${needed.toFixed(4)} SOL`,
      };
    }

    if (opts.mode === "dry") {
      return { attempted: true, sent: false, dryRun: true, amountSol: opts.amountSol, launchBalance };
    }

    const lamports = Math.round(opts.amountSol * LAMPORTS_PER_SOL);
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: signer.publicKey, toPubkey, lamports })
    );
    tx.feePayer = signer.publicKey;
    const { blockhash } = await withTimeout(conn.getLatestBlockhash("confirmed"), 15000, "getLatestBlockhash");
    tx.recentBlockhash = blockhash;
    const signature = await withTimeout(
      sendAndConfirmTransaction(conn, tx, [signer], { commitment: "confirmed" }),
      60000,
      "sendAndConfirmTransaction"
    );
    return { attempted: true, sent: true, amountSol: opts.amountSol, launchBalance, signature };
  }

  return { signerPubkey: signer.publicKey.toBase58(), maybeTopUp };
}
