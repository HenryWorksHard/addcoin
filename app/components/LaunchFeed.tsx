import React from "react";
import {
  FeedEvent,
  AddStats,
  EventKind,
  TREASURY_WALLET,
  ageLabel,
  shortAddress,
  formatMarketCap,
  formatSol,
} from "@/lib/coins";

const BADGE_LABEL: Record<EventKind, string> = {
  launch: "LAUNCH",
  boost: "BOOST",
  ad: "AD",
};

export default function LaunchFeed({
  events,
  now,
  countdown,
  treasury,
  add,
}: {
  events: FeedEvent[];
  now: number;
  countdown: number;
  treasury: number;
  add: AddStats;
}) {
  return (
    <>
      <div className="bar red feed-head">
        <span>War Chest Activity</span>
        <span className="feed-meta">
          auto-launch every 10s &middot; next in {countdown}s
        </span>
      </div>

      <div className="treasury-strip">
        <div className="wc-main">
          <div className="wc-label">$ADD WAR CHEST</div>
          <div className="wc-amount">{formatSol(treasury)}</div>
          <div className="wc-sub">{shortAddress(TREASURY_WALLET)}</div>
        </div>
        <div className="wc-add">
          <div className="wc-add-row">
            <span className="k">$ADD mkt cap</span>
            <span className="v">{formatMarketCap(add.marketCap)}</span>
          </div>
          <div className="wc-add-row">
            <span className="k">24h</span>
            <span className={`v ${add.change24h >= 0 ? "up" : "down"}`}>
              {add.change24h >= 0 ? "+" : ""}
              {add.change24h}%
            </span>
          </div>
          <div className="wc-add-note">fees in &#9654; boosts &amp; ads out</div>
        </div>
      </div>

      <div className="ticker-band">
        <marquee scrollamount={5}>
          &nbsp;&nbsp;WAR CHEST AUTO-LAUNCHES &#9670; FEES BUY DEXSCREENER BOOSTS
          &#9670; DEX ADS GO LIVE &#9670; $ADD TRENDS &#9670; THE FLYWHEEL NEVER
          STOPS &#9670;&nbsp;&nbsp;WAR CHEST AUTO-LAUNCHES &#9670; FEES BUY
          DEXSCREENER BOOSTS &#9670; DEX ADS GO LIVE &#9670; $ADD TRENDS
          &#9670;
        </marquee>
      </div>

      <table className="feed-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Detail</th>
            <th>Amount</th>
            <th>War Chest</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e, i) => (
            <tr key={e.id}>
              <td>
                <span className={`ev-badge ${e.kind}`}>{BADGE_LABEL[e.kind]}</span>
              </td>
              <td>
                <b className="ev-title">
                  {e.title}
                  {i === 0 ? <span className="tag-new">NEW</span> : null}
                </b>
                <span className="ev-sub">{e.sub}</span>
              </td>
              <td>
                <span className={`amt ${e.amount >= 0 ? "in" : "out"}`}>
                  {e.amount >= 0 ? "+" : ""}
                  {formatSol(e.amount)}
                </span>
              </td>
              <td className="wc-cell">{formatSol(e.treasury)}</td>
              <td className="age-cell">{ageLabel(e.at, now)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
