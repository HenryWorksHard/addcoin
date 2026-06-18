import React from "react";
import Image from "next/image";
import { AdCoin, formatSol, shortAddress, SOL_PER_LAUNCH, LAUNCH_WALLET, LAUNCH_INTERVAL_LABEL, formatCountdown } from "@/lib/coins";
import WalletChip from "./WalletChip";

type LastLaunch = {
  id: string;
  name: string;
  symbol: string;
  mint: string;
  at: number;
};

export default function LaunchFeed({
  coins,
  counts,
  cycle,
  secondsLeft,
  phase,
  lastBatch,
  batchSize,
  onDeckIndex,
  total,
  online,
  launchBalance,
}: {
  coins: AdCoin[];
  counts: Record<string, number>;
  cycle: number;
  secondsLeft: number;
  phase: "counting" | "launching" | "launched";
  lastBatch: LastLaunch[] | null;
  batchSize: number;
  onDeckIndex: number;
  total: number;
  online: boolean;
  launchBalance?: number | null;
}) {
  // Which rows are in the window currently on deck / in flight (wrap-aware), so
  // only those few light up while the rest of the book waits its turn.
  const len = coins.length;
  const inWindow = (i: number) => (((i - onDeckIndex) % len) + len) % len < batchSize;
  return (
    <>
      <div className="bar red feed-head">
        <span>Live Launch Engine</span>
        <span className="feed-meta">
          {batchSize} of {coins.length} coins every {LAUNCH_INTERVAL_LABEL} &middot; auto-minted on pump.fun
        </span>
      </div>

      <div className="engine-strip">
        <div className="eng-main">
          <div className="eng-status">
            <span
              className="eng-led"
              aria-hidden
              style={online ? undefined : { background: "#9aa0a6", boxShadow: "none", animation: "none" }}
            />
            {online ? "ENGINE RUNNING" : "ENGINE OFFLINE"}
          </div>
          <div className="eng-cycle">
            {!online ? (
              <>engine idle &middot; awaiting next launch run</>
            ) : phase === "launching" ? (
              <>
                minting <b>{batchSize}</b> of {coins.length} ad-coins ...
              </>
            ) : phase === "launched" ? (
              <>
                launched <b>{batchSize}</b> of {coins.length} ad-coins
              </>
            ) : (
              <>
                next batch: <b>{batchSize}</b> of {coins.length} ad-coins
              </>
            )}
          </div>
          <div className="eng-countdown">
            {!online ? (
              <b>IDLE</b>
            ) : phase === "launching" ? (
              <b>LAUNCHING...</b>
            ) : phase === "launched" ? (
              <b>LAUNCHED &#10003;</b>
            ) : (
              <>
                next batch in <b>{formatCountdown(secondsLeft)}</b>
              </>
            )}
          </div>
        </div>
        <div className="eng-stats">
          <div className="eng-stat">
            <span className="k">Coins launched</span>
            <span className="v">{total.toLocaleString()}</span>
          </div>
          <div className="eng-stat">
            <span className="k">SOL on launches</span>
            <span className="v">{formatSol(total * SOL_PER_LAUNCH)}</span>
          </div>
          <div className="eng-stat">
            <span className="k">Wallet balance</span>
            <span className="v">
              {launchBalance == null ? "--" : formatSol(launchBalance)}
            </span>
          </div>
          <div className="eng-stat">
            <span className="k">Batch</span>
            <span className="v">#{cycle}</span>
          </div>
        </div>
      </div>

      <div className="engine-wallet">
        <span className="ew-k">AdFund Launch Balance</span>
        <WalletChip address={LAUNCH_WALLET} />
        <span className="ew-note">&middot; every AdFund coin mints on-chain from here</span>
      </div>

      <div className="ticker-band">
        <marquee scrollamount={5}>
          &nbsp;&nbsp;LIVE LAUNCH ENGINE &#9670; {batchSize} OF {coins.length} AD-COINS MINTED EVERY {LAUNCH_INTERVAL_LABEL.toUpperCase()} &#9670;
          EVERY AD IS A PUMP.FUN COIN &#9670; THE BOOK NEVER STOPS &#9670; BATCH #{cycle}
          &#9670;&nbsp;&nbsp;LIVE LAUNCH ENGINE &#9670; EVERY AD IS A COIN &#9670;
        </marquee>
      </div>

      <table className="feed-table launch-book">
        <thead>
          <tr>
            <th>#</th>
            <th>Pump.fun New Pair Ads</th>
            <th>Status</th>
            <th>Launches</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((c, i) => {
            // Only the on-deck window is live; the rest of the book waits its turn.
            const active = online && inWindow(i);
            const rowClass = !active ? "" : phase === "launched" ? "row-launched" : "row-live";
            return (
              <tr key={c.id} className={rowClass}>
                <td className="num">{i + 1}</td>
                <td>
                  <span className="coin-cell">
                    <span className="coin-thumb" aria-hidden>
                      {c.image ? (
                        <Image
                          src={c.image}
                          alt=""
                          fill
                          sizes="34px"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        "?"
                      )}
                    </span>
                    <span className="coin-id">
                      <b className="coin-name">{c.name}</b>
                      <span className="coin-sym">${c.symbol}</span>
                    </span>
                  </span>
                </td>
                <td>
                  {!online ? (
                    <span className="st st-q">idle</span>
                  ) : !active ? (
                    <span className="st st-q">queued</span>
                  ) : phase === "launching" ? (
                    <span className="st st-live">LAUNCHING...</span>
                  ) : phase === "launched" ? (
                    <span className="st st-done">LAUNCHED &#10003;</span>
                  ) : (
                    <span className="st st-live">{formatCountdown(secondsLeft)}</span>
                  )}
                </td>
                <td className="num">
                  <b className="launch-count">&times;{(counts[c.id] ?? 0).toLocaleString()}</b>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {lastBatch && lastBatch.length ? (
        <div className="last-mint">
          last batch: <b>{lastBatch.length} coins</b> minted &rarr;{" "}
          <span className="mint">
            {lastBatch.slice(0, 4).map((b) => shortAddress(b.mint)).join(", ")}
            {lastBatch.length > 4 ? ` +${lastBatch.length - 4} more` : ""}
          </span>
        </div>
      ) : null}
    </>
  );
}
