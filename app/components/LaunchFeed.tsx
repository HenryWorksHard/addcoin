import React from "react";
import { AdCoin, AddStats, formatMarketCap } from "@/lib/coins";

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
  onDeck,
  secondsLeft,
  phase,
  lastLaunch,
  total,
  add,
}: {
  coins: AdCoin[];
  counts: Record<string, number>;
  cycle: number;
  onDeck: number;
  secondsLeft: number;
  phase: "counting" | "launching";
  lastLaunch: LastLaunch | null;
  total: number;
  add: AddStats;
}) {
  const next = coins[onDeck];
  return (
    <>
      <div className="bar red feed-head">
        <span>Live Launch Engine</span>
        <span className="feed-meta">1 coin every 5s &middot; auto-minted on pump.fun</span>
      </div>

      <div className="engine-strip">
        <div className="eng-main">
          <div className="eng-status">
            <span className="eng-led" aria-hidden />
            ENGINE RUNNING
          </div>
          <div className="eng-cycle">
            {phase === "launching" ? (
              <>
                minting <b>{next?.name}</b> (${next?.symbol}) ...
              </>
            ) : (
              <>
                next: <b>{next?.name}</b> (${next?.symbol})
              </>
            )}
          </div>
          <div className="eng-countdown">
            {phase === "launching" ? (
              <b>LAUNCHING...</b>
            ) : (
              <>
                launch in <b>{secondsLeft}s</b>
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
            <span className="k">Cycle</span>
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
          &nbsp;&nbsp;LIVE LAUNCH ENGINE &#9670; 1 AD-COIN MINTED EVERY 5s &#9670; EVERY AD IS
          A PUMP.FUN COIN &#9670; THE BOOK NEVER STOPS &#9670; CYCLE #{cycle}
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
            const isNext = i === onDeck;
            const justLaunched = lastLaunch?.id === c.id;
            return (
              <tr
                key={c.id}
                className={isNext ? "row-live" : justLaunched ? "row-launched" : ""}
              >
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
                  {isNext ? (
                    <span className="st st-live">
                      {phase === "launching" ? "LAUNCHING..." : `LIVE · ${secondsLeft}s`}
                    </span>
                  ) : justLaunched ? (
                    <span className="st st-done">LAUNCHED &#10003;</span>
                  ) : (
                    <span className="st st-q">queued</span>
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

      {lastLaunch ? (
        <div className="last-mint">
          last mint: <b>{lastLaunch.name}</b> &rarr;{" "}
          <span className="mint">{lastLaunch.mint}</span>
        </div>
      ) : null}
    </>
  );
}
