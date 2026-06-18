// Creator-fee claim + sweep agent (server / worker ONLY).
//
// Runs inside the always-on worker on an interval and keeps the money flowing
// exactly as the site describes:
//
//   1. CLAIM  -- collect accrued pump.fun creator fees for BOTH wallets:
//        - the AdFund hub wallet (the 50% share of the main $AdFund coin's
//          fees that pump.fun routes to it), and
//        - the launch wallet (creator of every ad-coin, so their fees accrue
//          there by protocol rule -- that part cannot be redirected).
//   2. SWEEP  -- move everything in the launch wallet above its float over to
//        the hub, so ALL fee revenue builds in the AdFund wallet while the
//        launch wallet stays a small hot float that only mints.
//
// (The reverse direction -- refueling the launch wallet from the hub when it
// dips below the float -- is the existing auto-refuel in lib/topup.ts.)
//
// Claims use PumpPortal's Local Transaction API (action "collectCreatorFee"):
// the unsigned tx comes back serialized, is signed LOCALLY with the wallet's
// own key, and broadcast via our RPC only in real mode. pool "pump" claims
// everything accrued for the signer in one transaction. A wallet with nothing
// to claim is NORMAL -- PumpPortal then returns an error, which is caught and
// reported as a skip, never fatal.
//
// The browser must NEVER import this (it pulls in @solana/web3.js + secrets).

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";

export type FeeAgentMode = "dry" | "real";

export type FeeAgentOptions = {
  mode: FeeAgentMode;
  rpcUrl: string;
  hubSecret: string; // AdFund hub wallet private key (claims its 50% share, receives sweeps)
  launchSecret: string; // launch wallet private key (claims ad-coin fees, gets swept)
  floatSol: number; // launch wallet keeps this much; everything above sweeps to the hub
  priorityFee?: number; // SOL tip on claim txs (default 0.0000005)
  minSweepSol?: number; // skip dust sweeps below this (default 0.01)
  feeBufferSol?: number; // headroom left for network fees (default 0.001)
};

export type ClaimResult = {
  ok: boolean;
  sent: boolean; // a claim tx was broadcast + confirmed (real mode)
  dryRun?: boolean; // built + signed but not broadcast (dry mode)
  signature?: string;
  skipped?: string; // why nothing was claimed (e.g. nothing accrued)
};

export type SweepResult = {
  attempted: boolean;
  sent: boolean;
  dryRun?: boolean;
  amountSol: number;
  signature?: string;
  skipped?: string;
};

export type FeeCycleResult = {
  hubClaim: ClaimResult;
  launchClaim: ClaimResult;
  sweep: SweepResult;
  hubBalance: number; // after the cycle
  launchBalance: number; // after the cycle
};

export type FeeAgent = {
  hubPubkey: string;
  launchPubkey: string;
  runCycle(): Promise<FeeCycleResult>;
};

const API_TIMEOUT_MS = 20000;
const RPC_TIMEOUT_MS = 20000;
const CONFIRM_TIMEOUT_MS = 60000;

function loadSigner(secret: string, label: string): Keypair {
  const raw = (secret ?? "").trim();
  if (!raw) throw new Error(`${label}: wallet secret is empty`);
  // Support both base58 (Phantom export) and a JSON byte array.
  if (raw.startsWith("[")) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  return Keypair.fromSecretKey(bs58.decode(raw));
}

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

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}

export function createFeeAgent(opts: FeeAgentOptions): FeeAgent {
  const hub = loadSigner(opts.hubSecret, "fee-agent hub");
  const launch = loadSigner(opts.launchSecret, "fee-agent launch");
  const conn = new Connection(opts.rpcUrl, "confirmed");
  const priorityFee = opts.priorityFee ?? 0.0000005;
  const minSweepSol = opts.minSweepSol ?? 0.01;
  const feeBufferSol = opts.feeBufferSol ?? 0.001;

  async function balanceSol(key: PublicKey): Promise<number> {
    const lamports = await withTimeout(conn.getBalance(key), RPC_TIMEOUT_MS, "getBalance");
    return lamports / LAMPORTS_PER_SOL;
  }

  // Ask PumpPortal for an unsigned collectCreatorFee tx, sign locally, and
  // broadcast in real mode. "Nothing to claim" comes back as a non-200 from
  // PumpPortal and is reported as a skip.
  async function claimFor(signer: Keypair): Promise<ClaimResult> {
    let res: Response;
    try {
      res = await fetchWithTimeout(
        "https://pumpportal.fun/api/trade-local",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicKey: signer.publicKey.toBase58(),
            action: "collectCreatorFee",
            priorityFee,
            pool: "pump",
          }),
        },
        API_TIMEOUT_MS
      );
    } catch (e) {
      return { ok: false, sent: false, skipped: `pumpportal unreachable: ${e instanceof Error ? e.message : e}` };
    }
    if (res.status !== 200) {
      return { ok: true, sent: false, skipped: `nothing to claim (${res.status}: ${await safeText(res)})` };
    }
    const tx = VersionedTransaction.deserialize(new Uint8Array(await res.arrayBuffer()));
    tx.sign([signer]);

    if (opts.mode === "dry") return { ok: true, sent: false, dryRun: true };

    // Broadcast failures (e.g. preflight rejecting a claim with nothing accrued)
    // are a SKIP for this wallet, never a cycle abort -- the other wallet's claim
    // and the sweep must still run.
    try {
      const sig = await withTimeout(
        conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 }),
        RPC_TIMEOUT_MS,
        "sendRawTransaction"
      );
      await withTimeout(conn.confirmTransaction(sig, "confirmed"), CONFIRM_TIMEOUT_MS, "confirmTransaction");
      return { ok: true, sent: true, signature: sig };
    } catch (e) {
      return { ok: false, sent: false, skipped: `claim send failed: ${e instanceof Error ? e.message : e}` };
    }
  }

  // Move everything above the float from the launch wallet to the hub.
  async function sweepLaunchToHub(): Promise<SweepResult> {
    const bal = await balanceSol(launch.publicKey);
    const excess = bal - opts.floatSol - feeBufferSol;
    if (excess < minSweepSol) {
      return { attempted: false, sent: false, amountSol: 0, skipped: `launch ${bal.toFixed(4)} SOL <= float` };
    }
    if (opts.mode === "dry") {
      return { attempted: true, sent: false, dryRun: true, amountSol: excess };
    }
    try {
      const lamports = Math.round(excess * LAMPORTS_PER_SOL);
      const tx = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: launch.publicKey, toPubkey: hub.publicKey, lamports })
      );
      tx.feePayer = launch.publicKey;
      const { blockhash } = await withTimeout(conn.getLatestBlockhash("confirmed"), RPC_TIMEOUT_MS, "getLatestBlockhash");
      tx.recentBlockhash = blockhash;
      const signature = await withTimeout(
        sendAndConfirmTransaction(conn, tx, [launch], { commitment: "confirmed" }),
        CONFIRM_TIMEOUT_MS,
        "sendAndConfirmTransaction"
      );
      return { attempted: true, sent: true, amountSol: excess, signature };
    } catch (e) {
      return {
        attempted: true,
        sent: false,
        amountSol: excess,
        skipped: `sweep send failed: ${e instanceof Error ? e.message : e}`,
      };
    }
  }

  return {
    hubPubkey: hub.publicKey.toBase58(),
    launchPubkey: launch.publicKey.toBase58(),

    async runCycle(): Promise<FeeCycleResult> {
      // Claims first (fees land where they accrue), then the sweep consolidates
      // everything above the launch float into the hub.
      const hubClaim = await claimFor(hub);
      const launchClaim = await claimFor(launch);
      const sweep = await sweepLaunchToHub();
      const [hubBalance, launchBalance] = await Promise.all([
        balanceSol(hub.publicKey),
        balanceSol(launch.publicKey),
      ]);
      return { hubClaim, launchClaim, sweep, hubBalance, launchBalance };
    },
  };
}
