import React from "react";
import { AdCoin, AddStats, formatMarketCap, shortAddress } from "@/lib/coins";

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
  total,
  add,
  online,
}: {
  coins: AdCoin[];
  counts: Record<string, number>;
  cycle: number;
  secondsLeft: number;
  phase: "counting" | "launching" | "launched";
  lastBatch: LastLaunch[] | null;
  batchSize: number;
  total: number;
  add: AddStats;
  online: boolean;
}) {
  return (
    <>
      <div className="bar red feed-head">
        <span>Live Launch Engine</span>
        <span className="feed-meta">
          all {batchSize} coins every 15s &middot; auto-minted on pump.fun
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
                minting all <b>{batchSize}</b> ad-coins at once ...
              </>
            ) : phase === "launched" ? (
              <>
                launched all <b>{batchSize}</b> ad-coins
              </>
            ) : (
              <>
                next batch: all <b>{batchSize}</b> ad-coins
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
                next batch in <b>{secondsLeft}s</b>
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
            <span className="k">Batch</span>
            <span className="v">#{cycle}</span>
          </div>
          <div className="eng-stat">
            <span className="k">$AdFund mkt cap</span>
            <span className="v">{formatMarketCap(add.marketCap)}</span>
          </div>
          <div className="eng-stat">
            <span className="k">24h</span>
            <span className={`v ${add.change24h >= 0 ? "up" : "down"}`}>
              {add.change24h >= 0 ? "+" : ""}
              {add.change24h}%
            </span>
          </div>
        </div>
      </div>

      <div className="ticker-band">
        <marquee scrollamount={5}>
          &nbsp;&nbsp;LIVE LAUNCH ENGINE &#9670; ALL {batchSize} AD-COINS MINTED EVERY 15s &#9670;
          EVERY AD IS A PUMP.FUN COIN &#9670; THE BOOK NEVER STOPS &#9670; BATCH #{cycle}
          &#9670;&nbsp;&nbsp;LIVE LAUNCH ENGINE &#9670; EVERY AD IS A COIN &#9670;
        </marquee>
      </div>

      <table className="feed-table launch-book">
        <thead>
          <tr>
            <th>#</th>
            <th>Ad Coin</th>
            <th>Status</th>
            <th>Launches</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((c, i) => {
            // Every coin launches together, so the whole book shares one state:
            // yellow while counting/launching, blue once launched.
            const rowClass = !online ? "" : phase === "launched" ? "row-launched" : "row-live";
            return (
              <tr key={c.id} className={rowClass}>
                <td className="num">{i + 1}</td>
                <td>
                  <span className="coin-cell">
                    <span
                      className="coin-thumb"
                      aria-hidden
                      style={c.image ? { backgroundImage: `url(${c.image})` } : undefined}
                    >
                      {c.image ? null : "?"}
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
                  ) : phase === "launching" ? (
                    <span className="st st-live">LAUNCHING...</span>
                  ) : phase === "launched" ? (
                    <span className="st st-done">LAUNCHED &#10003;</span>
                  ) : (
                    <span className="st st-live">{secondsLeft}s</span>
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
