// Auto-refuel check / isolated send test.
//
//   npm run topup:check                                  # DRY (default) -- never broadcasts
//   TOPUP_SEND_REAL=1 npm run topup:check                # REAL -- sends ONLY if launch wallet <= threshold
//   TOPUP_SEND_REAL=1 TOPUP_THRESHOLD_SOL=999 npm run topup:check   # REAL -- force one real refuel now (test)
//
// DRY mode proves the send path is wired without moving SOL:
//   1. PROMO_WALLET_SECRET parses to a keypair whose public address matches
//      DEX_PROMO.wallet (the address the site shows as "funded by").
//   2. The RPC is reachable -- reads the live launch + promo wallet balances.
//   3. Forces the refuel branch (huge threshold) and prints the "would send N SOL"
//      decision the worker would make. Builds nothing on-chain, spends nothing.
//
// REAL mode (TOPUP_SEND_REAL=1) runs ONE refuel evaluation against the real
// threshold and broadcasts a single transfer IFF the launch wallet is at/below it.
// It does NOT launch any coins and does NOT loop -- it's the isolated way to prove
// the actual on-chain broadcast. To force a send for a one-off test even though the
// wallet isn't low, raise TOPUP_THRESHOLD_SOL above the current launch balance.

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AUTO_TOPUP, DEX_PROMO, LAUNCH_WALLET } from "../lib/coins";
import { createTopUp } from "../lib/topup";

function boolEnv(name: string): boolean {
  const v = (process.env[name] ?? "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
function numEnv(name: string, dflt: number): number {
  const v = process.env[name];
  if (v == null || v === "") return dflt;
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}

async function main(): Promise<void> {
  const rpcUrl = process.env.SOLANA_RPC_URL ?? "";
  const fromSecret = process.env.PROMO_WALLET_SECRET ?? "";
  const sendReal = boolEnv("TOPUP_SEND_REAL");

  console.log(`=== auto-refuel ${sendReal ? "REAL SEND TEST" : "preflight (dry / read-only)"} ===`);
  if (!rpcUrl) {
    console.error("FAIL: SOLANA_RPC_URL missing in .env.local");
    process.exit(1);
  }
  if (!fromSecret) {
    console.error("FAIL: PROMO_WALLET_SECRET missing in .env.local");
    process.exit(1);
  }

  // DRY: huge threshold forces the refuel branch so we always see a decision.
  // REAL: use the actual rule (override TOPUP_THRESHOLD_SOL to force a test send).
  const amountSol = numEnv("TOPUP_AMOUNT_SOL", AUTO_TOPUP.amountSol);
  const reserveSol = numEnv("TOPUP_MIN_DEX_RESERVE_SOL", 0);
  const thresholdSol = sendReal
    ? numEnv("TOPUP_THRESHOLD_SOL", AUTO_TOPUP.thresholdSol)
    : 1_000_000;

  const topup = createTopUp({
    mode: sendReal ? "real" : "dry",
    rpcUrl,
    fromSecret,
    toAddress: LAUNCH_WALLET,
    thresholdSol,
    amountSol,
    reserveSol,
    cooldownMs: 0,
  });

  // 1. Key -> address check.
  const ok = topup.signerPubkey === DEX_PROMO.wallet;
  console.log(`promo signer pubkey : ${topup.signerPubkey}`);
  console.log(`DEX_PROMO.wallet    : ${DEX_PROMO.wallet}`);
  console.log(`address match       : ${ok ? "YES" : "NO -- MISMATCH"}`);
  if (!ok) {
    console.error(
      "FAIL: PROMO_WALLET_SECRET does not control DEX_PROMO.wallet. The site would" +
        " show the wrong source address. Fix the secret or DEX_PROMO.wallet."
    );
    process.exit(1);
  }

  // 2. Live balance reads (proves the RPC works).
  const conn = new Connection(rpcUrl, "confirmed");
  const launchBal = (await conn.getBalance(new PublicKey(LAUNCH_WALLET))) / LAMPORTS_PER_SOL;
  const promoBal = (await conn.getBalance(new PublicKey(DEX_PROMO.wallet))) / LAMPORTS_PER_SOL;
  console.log(`launch wallet bal   : ${launchBal.toFixed(4)} SOL  (${LAUNCH_WALLET})`);
  console.log(`promo wallet bal    : ${promoBal.toFixed(4)} SOL  (${DEX_PROMO.wallet})`);
  console.log(
    `rule                : refuel <= ${thresholdSol} SOL  ->  send ${amountSol} SOL promo -> launch`
  );

  if (sendReal) {
    console.log("!! REAL MODE -- will broadcast a real SOL transfer if the launch wallet is at/below threshold !!");
  }

  // 3. Run the decision. In dry mode this only logs; in real mode it broadcasts
  //    iff launch balance <= threshold.
  const r = await topup.maybeTopUp();
  if (r.sent) {
    console.log(`decision            : SENT ${r.amountSol} SOL promo -> launch.`);
    console.log(`signature           : ${r.signature}`);
    console.log(`explorer            : https://explorer.solana.com/tx/${r.signature}`);
    console.log("PASS: real auto-refuel broadcast confirmed on-chain.");
    return;
  }
  if (r.dryRun) {
    console.log(`decision            : WOULD SEND ${r.amountSol} SOL (dry -- not broadcast). Send path is wired.`);
  } else if (r.attempted && !r.sent) {
    console.log(`decision            : attempted, but blocked -> ${r.reason}`);
    console.log(
      "note: the send path is wired; the promo wallet just needs enough SOL to cover" +
        ` amount + fee (>= ${(amountSol + 0.001).toFixed(3)} SOL).`
    );
  } else {
    console.log(
      `decision            : no refuel -- launch balance ${r.launchBalance.toFixed(4)} is above the ${thresholdSol} SOL threshold` +
        (sendReal ? " (raise TOPUP_THRESHOLD_SOL to force a one-off test send)" : "")
    );
  }

  console.log(
    sendReal
      ? "OK: real mode ran; nothing sent because the wallet wasn't at/below threshold."
      : "PASS: key controls the promo wallet and the dry send path executed. No SOL moved."
  );
}

main().catch((e) => {
  console.error("check-topup fatal:", e instanceof Error ? (e.stack ?? e.message) : e);
  process.exit(1);
});
