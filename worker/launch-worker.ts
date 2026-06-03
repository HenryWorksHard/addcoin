// AdFund always-on launch worker.
//
// Runs OFF Vercel (Railway / Render / Fly / a VPS) as a long-lived process.
// Fires the whole ad-book at once, waits LAUNCH_INTERVAL_MS, then launches the
// next batch -- cycling AD_COINS forever ("batch -> 15s -> batch").
//
//   npm run worker        # mode from .env.local (defaults to sim)
//   npm run worker:dry    # build + sign real txns, never broadcast (free)
//   npm run worker:real   # broadcast for real (spends SOL)
//
// Safety rails (all env-tunable, conservative by default):
//   MAX_LAUNCHES_PER_DAY, MAX_SOL_PER_DAY, MIN_WALLET_BALANCE_SOL,
//   retry/backoff, and a kill switch (create a file at worker/STOP, or KILL=1).

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config(); // fall back to .env without overriding already-set vars

import { existsSync } from "node:fs";
import path from "node:path";
import { AD_COINS } from "../lib/coins";
import { simLauncher, type Launcher, type LaunchResult } from "../lib/launcher";
import { createPumpLauncher, type LaunchMode } from "../lib/pumpLauncher";
import { writeStatus, appendLaunch, clearStatusSync, type LaunchStatus, type LaunchRecord } from "../lib/launchStore";

function numEnv(name: string, dflt: number): number {
  const v = process.env[name];
  if (v == null || v === "") return dflt;
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}
function boolEnv(name: string): boolean {
  const v = (process.env[name] ?? "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

const MODE = (process.env.LAUNCH_MODE ?? "sim").toLowerCase() as LaunchMode;

const INTERVAL_MS = numEnv("LAUNCH_INTERVAL_MS", 15000);
// Brief hold after a batch so the site can show every coin flip to LAUNCHED
// together before the next countdown begins.
const LAUNCHED_HOLD_MS = numEnv("LAUNCHED_HOLD_MS", 2000);
const MAX_PER_DAY = numEnv("MAX_LAUNCHES_PER_DAY", 100);
const MAX_SOL_DAY = numEnv("MAX_SOL_PER_DAY", 0.5);
const MIN_BAL = numEnv("MIN_WALLET_BALANCE_SOL", 0.05);
// Floored: a pump.fun "create" has no priority auction, so the tip can be
// almost nothing. Bump LAUNCH_PRIORITY_FEE in .env.local only if a launch ever
// fails to land under congestion.
const PRIORITY_FEE = numEnv("LAUNCH_PRIORITY_FEE", 0.0000001);
const DEV_BUY = numEnv("LAUNCH_DEV_BUY_SOL", 0);
const SLIPPAGE = numEnv("LAUNCH_SLIPPAGE", 10);
const MAX_RETRIES = numEnv("MAX_RETRIES", 2);
const LAUNCH_ONCE = boolEnv("LAUNCH_ONCE");
const MAX_LAUNCHES = numEnv("MAX_LAUNCHES", 0); // 0 = unlimited
// Rough per-launch SOL estimate, used only for the daily SOL cap. pump.fun
// covers the create rent, so real creator cost is ~base network fee + priority
// fee (+ any dev buy). The per-day count cap is the real backstop.
const EST_SOL_PER_LAUNCH = PRIORITY_FEE + DEV_BUY + 0.00001;

const ROOT = process.cwd();
const STOP_FILE = path.join(ROOT, "worker", "STOP");

function ts(): string {
  return new Date().toISOString();
}
function log(...a: unknown[]): void {
  console.log(`[${ts()}]`, ...a);
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
function killed(): boolean {
  return process.env.KILL === "1" || existsSync(STOP_FILE);
}
// Sleep in 1s slices so the kill switch is honoured promptly.
async function chunkedSleep(ms: number): Promise<void> {
  let left = ms;
  while (left > 0) {
    if (killed()) return;
    const step = Math.min(1000, left);
    await sleep(step);
    left -= step;
  }
}

async function safeWriteStatus(s: LaunchStatus): Promise<void> {
  try {
    await writeStatus(s);
  } catch (e) {
    log(`! status write failed: ${e instanceof Error ? e.message : e}`);
  }
}

async function safeAppend(rec: LaunchRecord): Promise<void> {
  try {
    await appendLaunch(rec);
  } catch (e) {
    log(`! record write failed: ${e instanceof Error ? e.message : e}`);
  }
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      log(`  ! ${label} attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${e instanceof Error ? e.message : e}`);
      if (attempt < MAX_RETRIES) await chunkedSleep(2000 * Math.pow(2, attempt));
    }
  }
  throw lastErr;
}

async function main(): Promise<void> {
  if (!["sim", "dry", "real"].includes(MODE)) {
    log(`bad LAUNCH_MODE "${MODE}" -- use sim | dry | real`);
    process.exit(1);
  }

  let launcher: Launcher;
  let getBalance: (() => Promise<number>) | null = null;
  let pubkey = "(sim)";

  if (MODE === "sim") {
    launcher = simLauncher;
  } else {
    const rpcUrl = process.env.SOLANA_RPC_URL ?? "";
    const walletSecret = process.env.LAUNCH_WALLET_SECRET ?? "";
    if (!rpcUrl) {
      log("SOLANA_RPC_URL missing -- set it in .env.local");
      process.exit(1);
    }
    if (!walletSecret) {
      log("LAUNCH_WALLET_SECRET missing -- set it in .env.local");
      process.exit(1);
    }
    const pl = createPumpLauncher({
      mode: MODE,
      rpcUrl,
      walletSecret,
      devBuySol: DEV_BUY,
      slippage: SLIPPAGE,
      priorityFee: PRIORITY_FEE,
      description: process.env.LAUNCH_DESCRIPTION,
      twitter: process.env.LAUNCH_TWITTER,
      telegram: process.env.LAUNCH_TELEGRAM,
      website: process.env.LAUNCH_WEBSITE,
    });
    launcher = pl;
    getBalance = () => pl.getBalanceSol();
    pubkey = pl.signerPubkey;
  }

  log("=== AdFund launch worker ===");
  log(`mode=${MODE}  batch=${AD_COINS.length} coins every ${INTERVAL_MS}ms (all at once)`);
  log(`caps: <=${MAX_PER_DAY}/day, <=${MAX_SOL_DAY} SOL/day, min balance ${MIN_BAL} SOL`);
  log(`per-launch: devBuy=${DEV_BUY} SOL, priorityFee=${PRIORITY_FEE} SOL (est ${EST_SOL_PER_LAUNCH.toFixed(4)} SOL/launch)`);
  log(`wallet=${pubkey}`);
  if (MODE === "real") log("!! REAL MODE -- broadcasts a transaction and spends SOL on every launch !!");
  if (MODE === "dry") log("dry run -- builds + signs txns but never broadcasts (no SOL spent)");

  if (getBalance) {
    try {
      log(`balance=${(await getBalance()).toFixed(4)} SOL`);
    } catch (e) {
      log(`could not read balance: ${e instanceof Error ? e.message : e}`);
    }
  }

  let day = new Date().toISOString().slice(0, 10);
  let countToday = 0;
  let solToday = 0;
  let totalRun = 0;
  let batchCount = 0;

  // Live snapshot the site mirrors via /api/launches. Written on every launch
  // boundary in ALL modes (sim included) so the wiring can be validated free.
  const counts: Record<string, number> = AD_COINS.reduce<Record<string, number>>(
    (m, c) => {
      m[c.id] = 0;
      return m;
    },
    {}
  );
  let lastLaunch: LaunchStatus["lastLaunch"] = null;
  let lastBatch: LaunchStatus["lastBatch"] = null;
  const status = (over: Partial<LaunchStatus>): LaunchStatus => ({
    mode: MODE,
    phase: "counting",
    onDeckIndex: 0,
    cycle: batchCount + 1,
    total: totalRun,
    counts,
    batchSize: AD_COINS.length,
    lastLaunch,
    lastBatch,
    nextLaunchAt: null,
    intervalMs: INTERVAL_MS,
    updatedAt: Date.now(),
    ...over,
  });
  await safeWriteStatus(status({ cycle: 1, total: 0, nextLaunchAt: Date.now() + INTERVAL_MS }));
  // Count down once up front so the site opens on a clean 15 -> 0 before the very
  // first batch fires (every later batch already gets its own countdown below).
  await chunkedSleep(INTERVAL_MS);

  for (;;) {
    if (killed()) {
      log("kill switch active (worker/STOP file or KILL=1) -- stopping");
      break;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (today !== day) {
      day = today;
      countToday = 0;
      solToday = 0;
      log(`-- new day ${day}, daily counters reset --`);
    }

    // A batch mints the whole book at once, so it only runs when a full batch
    // still fits under the daily count cap.
    if (countToday + AD_COINS.length > MAX_PER_DAY) {
      log(`daily count cap (${MAX_PER_DAY}) reached -- idling until next day`);
      await chunkedSleep(60000);
      continue;
    }

    // SOL cap + min-balance stops apply only to real broadcasts. Dry mode
    // spends nothing, so it must not halt on an empty wallet.
    if (MODE === "real") {
      if (solToday + EST_SOL_PER_LAUNCH * AD_COINS.length > MAX_SOL_DAY) {
        log(`daily SOL cap (${MAX_SOL_DAY}) would be exceeded by a full batch -- stopping`);
        break;
      }
      if (getBalance) {
        let bal: number;
        try {
          bal = await getBalance();
        } catch (e) {
          log(`balance check failed: ${e instanceof Error ? e.message : e} -- skipping this batch`);
          await chunkedSleep(INTERVAL_MS);
          continue;
        }
        if (bal < MIN_BAL) {
          log(`balance ${bal.toFixed(4)} < min ${MIN_BAL} SOL -- stopping (top up the wallet)`);
          break;
        }
      }
    }

    const cycle = batchCount + 1;
    await safeWriteStatus(status({ phase: "launching", cycle, total: totalRun, nextLaunchAt: null }));

    // Fire the entire book simultaneously. allSettled so one failed mint never
    // sinks the rest of the batch.
    const results = await Promise.allSettled(
      AD_COINS.map((c) => withRetry(() => launcher.launch(c), `launch ${c.id}`))
    );

    const batchMints: NonNullable<LaunchStatus["lastBatch"]> = [];
    const at = Date.now();
    let okCount = 0;
    for (let i = 0; i < AD_COINS.length; i++) {
      const coin = AD_COINS[i];
      const r = results[i];
      if (r.status === "fulfilled") {
        const res: LaunchResult = r.value;
        okCount++;
        countToday++;
        totalRun++;
        counts[coin.id] = (counts[coin.id] ?? 0) + 1;
        if (MODE === "real") solToday += EST_SOL_PER_LAUNCH;
        batchMints.push({ id: coin.id, name: coin.name, symbol: coin.symbol, mint: res.mint, at });
        await safeAppend({
          ts: ts(),
          mode: MODE,
          cycle,
          coinId: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          mint: res.mint,
          signature: res.signature,
          uri: res.uri ?? null,
        });
        const tag = MODE === "real" ? `https://solscan.io/tx/${res.signature}` : res.signature;
        log(`  ${coin.id} (${coin.symbol}) -> mint ${res.mint} | ${tag}`);
      } else {
        log(`  x ${coin.id} FAILED after retries: ${r.reason instanceof Error ? r.reason.message : r.reason}`);
      }
    }

    if (batchMints.length) {
      lastBatch = batchMints;
      lastLaunch = batchMints[batchMints.length - 1];
    }
    batchCount++;
    log(`batch #${batchCount} -> ${okCount}/${AD_COINS.length} coins minted (total ${totalRun})`);

    // Hold a visible "launched" beat so the site can show every coin flip to
    // LAUNCHED together before the next countdown starts.
    await safeWriteStatus(status({ phase: "launched", cycle: batchCount, total: totalRun, nextLaunchAt: null }));

    if (LAUNCH_ONCE) {
      log("LAUNCH_ONCE set -- exiting after one batch");
      break;
    }
    if (MAX_LAUNCHES > 0 && totalRun >= MAX_LAUNCHES) {
      log(`MAX_LAUNCHES (${MAX_LAUNCHES}) reached -- exiting`);
      break;
    }

    await chunkedSleep(LAUNCHED_HOLD_MS);
    if (killed()) break;

    // Fresh countdown measured from here so the site always shows a full 15s
    // 15 -> 0 run between batches, no matter how long the mints took.
    const nextAt = Date.now() + INTERVAL_MS;
    await safeWriteStatus(status({ phase: "counting", cycle: batchCount + 1, total: totalRun, nextLaunchAt: nextAt }));
    await chunkedSleep(INTERVAL_MS);
  }

  clearStatusSync();
  log(`stopped. launches this run=${totalRun}, today=${countToday}, est SOL today=${solToday.toFixed(4)}`);
}

process.on("SIGINT", () => {
  console.log("\n[SIGINT] stopping...");
  clearStatusSync();
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("\n[SIGTERM] stopping...");
  clearStatusSync();
  process.exit(0);
});

main().catch((e) => {
  log("fatal:", e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
