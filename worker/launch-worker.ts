// AdFund always-on launch worker.
//
// Runs OFF Vercel (Railway / Render / Fly / a VPS) as a long-lived process.
// Fires the whole ad-book at once, waits LAUNCH_INTERVAL_MS, then launches the
// next batch -- cycling AD_COINS forever ("batch -> interval -> batch").
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
import { AD_COINS, AUTO_TOPUP, DEX_PROMO, LAUNCH_WALLET, LAUNCH_INTERVAL_SECONDS } from "../lib/coins";
import { simLauncher, type Launcher, type LaunchResult } from "../lib/launcher";
import { createPumpLauncher, type LaunchMode } from "../lib/pumpLauncher";
import { createTopUp, type TopUp } from "../lib/topup";
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

const INTERVAL_MS = numEnv("LAUNCH_INTERVAL_MS", LAUNCH_INTERVAL_SECONDS * 1000);
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

// Auto-refuel: top the launch wallet up from the dex/promo wallet when it runs
// low, so the engine never stalls. Off unless AUTOTOPUP=1 AND PROMO_WALLET_SECRET
// is set. Thresholds default to AUTO_TOPUP in lib/coins.ts (so the site's ad copy
// matches), override per-env. Never runs in sim mode (no chain).
const AUTOTOPUP = boolEnv("AUTOTOPUP");
const TOPUP_THRESHOLD = numEnv("TOPUP_THRESHOLD_SOL", AUTO_TOPUP.thresholdSol);
const TOPUP_AMOUNT = numEnv("TOPUP_AMOUNT_SOL", AUTO_TOPUP.amountSol);
const TOPUP_RESERVE = numEnv("TOPUP_MIN_DEX_RESERVE_SOL", 0);
const TOPUP_COOLDOWN_MS = numEnv("TOPUP_COOLDOWN_MS", 60000);
// How often the auto-refuel checks the launch wallet, INDEPENDENT of the launch
// cadence. Default 30s so a low wallet is topped up fast even while batches are
// idling (e.g. daily cap hit). The source cooldown (above) prevents double-sends.
const TOPUP_CHECK_INTERVAL_MS = numEnv("TOPUP_CHECK_INTERVAL_MS", 30000);
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
    // The site shows LAUNCH_WALLET as the launch wallet AND auto-refuel tops up
    // LAUNCH_WALLET. If the actual signer differs, the engine spends from one
    // wallet while refuels pile into another -- so flag any mismatch loudly.
    if (pubkey !== LAUNCH_WALLET) {
      log(`! WARNING: LAUNCH_WALLET_SECRET pubkey ${pubkey} != LAUNCH_WALLET ${LAUNCH_WALLET} -- the engine would launch from ${pubkey} but auto-refuel would top up ${LAUNCH_WALLET}. Fix LAUNCH_WALLET in lib/coins.ts or the secret.`);
    }
  }

  // Auto-refuel keeps the launch wallet funded from the dex/promo wallet. Built
  // only in dry/real (sim has no chain) when enabled and a source key is set.
  let topup: TopUp | null = null;
  if (AUTOTOPUP && MODE !== "sim") {
    const rpcUrl = process.env.SOLANA_RPC_URL ?? "";
    const fromSecret = process.env.PROMO_WALLET_SECRET ?? "";
    if (!rpcUrl) {
      log("AUTOTOPUP on but SOLANA_RPC_URL missing -- auto-refuel disabled");
    } else if (!fromSecret) {
      log("AUTOTOPUP on but PROMO_WALLET_SECRET missing -- auto-refuel disabled");
    } else {
      try {
        topup = createTopUp({
          mode: MODE === "real" ? "real" : "dry",
          rpcUrl,
          fromSecret,
          toAddress: LAUNCH_WALLET,
          thresholdSol: TOPUP_THRESHOLD,
          amountSol: TOPUP_AMOUNT,
          reserveSol: TOPUP_RESERVE,
          cooldownMs: TOPUP_COOLDOWN_MS,
        });
        if (topup.signerPubkey !== DEX_PROMO.wallet) {
          log(`! auto-refuel WARNING: PROMO_WALLET_SECRET pubkey ${topup.signerPubkey} != DEX_PROMO.wallet ${DEX_PROMO.wallet} (the site shows DEX_PROMO.wallet as the source)`);
        }
        log(`auto-refuel ${MODE === "real" ? "ON" : "ON (dry -- logs only)"}: checks every ${TOPUP_CHECK_INTERVAL_MS}ms, <=${TOPUP_THRESHOLD} SOL -> send ${TOPUP_AMOUNT} SOL from ${topup.signerPubkey} -> ${LAUNCH_WALLET}`);
      } catch (e) {
        log(`! auto-refuel setup failed: ${e instanceof Error ? e.message : e} -- disabled`);
        topup = null;
      }
    }
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
  let lastTopUp: LaunchStatus["lastTopUp"] = null;
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
    lastTopUp,
    nextLaunchAt: null,
    intervalMs: INTERVAL_MS,
    updatedAt: Date.now(),
    ...over,
  });
  await safeWriteStatus(status({ cycle: 1, total: 0, nextLaunchAt: Date.now() + INTERVAL_MS }));

  // One refuel check, guarded so timer ticks and the pre-batch call never overlap
  // (overlap could double-read and double-send). The source cooldown is the second
  // guard. Sets lastTopUp on a real broadcast; the next status write flushes it.
  let topupBusy = false;
  async function runTopupCheck(): Promise<void> {
    if (!topup || topupBusy) return;
    topupBusy = true;
    try {
      const r = await topup.maybeTopUp();
      if (r.attempted && r.sent) {
        log(`auto-refuel: sent ${r.amountSol} SOL dex->launch (launch was ${r.launchBalance.toFixed(4)}) | ${r.signature}`);
        lastTopUp = { amountSol: r.amountSol, sig: r.signature ?? null, at: Date.now() };
      } else if (r.attempted && r.dryRun) {
        log(`auto-refuel (dry): would send ${r.amountSol} SOL dex->launch (launch ${r.launchBalance.toFixed(4)})`);
      } else if (r.attempted) {
        log(`auto-refuel skipped: ${r.reason} (launch ${r.launchBalance.toFixed(4)})`);
      }
    } catch (e) {
      log(`! auto-refuel failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      topupBusy = false;
    }
  }

  // Auto-refuel runs on its OWN timer, decoupled from the launch cadence, so a low
  // wallet is topped up within TOPUP_CHECK_INTERVAL_MS even while batches are idle.
  // First check fires immediately at startup.
  let topupTimer: ReturnType<typeof setInterval> | null = null;
  if (topup) {
    await runTopupCheck();
    topupTimer = setInterval(() => {
      void runTopupCheck();
    }, TOPUP_CHECK_INTERVAL_MS);
  }

  // Count down once up front so the site opens on a clean full-interval -> 0
  // before the first batch fires (every later batch gets its own countdown below).
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

    // Pre-batch refuel guarantee BEFORE the launch gates, so the min-balance stop
    // below can't halt a batch on a wallet the timer hasn't caught yet. Deduped:
    // if the independent timer is mid-check, this returns immediately.
    await runTopupCheck();

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
        const tag = MODE === "real" ? `https://explorer.solana.com/tx/${res.signature}` : res.signature;
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

    // Fresh countdown measured from here so the site always shows a full
    // interval -> 0 run between batches, no matter how long the mints took.
    const nextAt = Date.now() + INTERVAL_MS;
    await safeWriteStatus(status({ phase: "counting", cycle: batchCount + 1, total: totalRun, nextLaunchAt: nextAt }));
    await chunkedSleep(INTERVAL_MS);
  }

  if (topupTimer) clearInterval(topupTimer);
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
