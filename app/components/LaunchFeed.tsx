import React from "react";
import { Coin, ageLabel, shortAddress, formatMarketCap } from "@/lib/coins";

export default function LaunchFeed({
  coins,
  now,
  countdown,
}: {
  coins: Coin[];
  now: number;
  countdown: number;
}) {
  const tickerText = coins.slice(0, 12);
  return (
    <>
      <div className="bar red feed-head">
        <span>Latest Launches</span>
        <span className="feed-meta">
          new coin every 10s &middot; next in {countdown}s
        </span>
      </div>

      <div className="ticker-band">
        <marquee scrollamount={5}>
          {tickerText.map((c) => (
            <span key={c.id}>
              &nbsp;&nbsp;LIVE: <b>${c.ticker}</b> {c.name} launched &nbsp;&#9670;
            </span>
          ))}
        </marquee>
      </div>

      <table className="feed-table">
        <thead>
          <tr>
            <th>Coin / Ad</th>
            <th>Contract</th>
            <th>Mkt Cap</th>
            <th>Chg</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((c, i) => (
            <tr key={c.id}>
              <td>
                <span className="coin-cell">
                  <span className="coin-logo" style={{ background: c.color }} aria-hidden>
                    {c.ticker.slice(0, 2)}
                  </span>
                  <span className="coin-name">
                    <b>
                      {c.name}
                      {i === 0 ? <span className="tag-new">NEW</span> : null}
                    </b>
                    <span className="tk">${c.ticker}</span>
                  </span>
                </span>
              </td>
              <td>
                <span className="ca">{shortAddress(c.contract)}</span>
              </td>
              <td>{formatMarketCap(c.marketCap)}</td>
              <td>
                <span className={`chg ${c.change >= 0 ? "up" : "down"}`}>
                  {c.change >= 0 ? "+" : ""}
                  {c.change}%
                </span>
              </td>
              <td style={{ whiteSpace: "nowrap", color: "#555" }}>
                {ageLabel(c.launchedAt, now)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
