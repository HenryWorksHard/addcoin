"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AddStats,
  ADD_TICKER,
  ADD_CONTRACT,
  CA_LIVE,
  X_PROFILE,
  linkFor,
  formatMarketCap,
} from "@/lib/coins";

// The "How $AdFund Works" boxes, rendered inline beside the logo in GeoHeader.
const ACTIONS = [
  {
    glyph: "rocket",
    title: "ONE COIN, ONE JOB",
    desc: "$AdFund launches coins non-stop to promote itself. No team allocation, no roadmap -- just the engine.",
  },
  {
    glyph: "wallet",
    title: "DEV REWARDS COLLECTED",
    desc: "Every coin it launches earns dev rewards -- all of it collected back into the war chest.",
  },
  {
    glyph: "boost",
    title: "MINTS, ADS & BOOSTS",
    desc: "The war chest funds new token mints, dex ads and dex boosts -- more eyes on $AdFund, forever.",
  },
];

function ActionGlyph({ kind }: { kind: string }) {
  const base: React.CSSProperties = {
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    color: "#fff",
  };
  if (kind === "rocket") return <span style={base}>&#9650;</span>;
  if (kind === "wallet") return <span style={base}>&#9638;</span>;
  return <span style={base}>&#9733;</span>;
}

export function GeoHeader() {
  const [logoOk, setLogoOk] = useState(true);
  const logoRef = useRef<HTMLImageElement>(null);

  // The browser may finish (and fail) the image load before React attaches
  // onError during hydration, so re-check the natural size after mount.
  useEffect(() => {
    const img = logoRef.current;
    if (img && img.complete && img.naturalWidth === 0) setLogoOk(false);
  }, []);

  return (
    <div className="geo-header">
      <div className="wordmark">
        {logoOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={logoRef}
            className="logo-img"
            src="/logo.png"
            alt="AdFund"
            onError={() => setLogoOk(false)}
          />
        ) : (
          <>
            <span className="coin-doodle" aria-hidden>
              $
            </span>
            <span className="add">Ad</span>
            <span className="coin">Fund</span>
            <span className="dotsol">.sol</span>
          </>
        )}
      </div>
      <div className="header-howit">
        {ACTIONS.map((a) => (
          <div className="hdr-action" key={a.title}>
            <span className="hdr-action-glyph" aria-hidden>
              <ActionGlyph kind={a.glyph} />
            </span>
            <span className="hdr-action-copy">
              <span className="t">{a.title}</span>
              <span className="d">{a.desc}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function WelcomeBar({
  add,
  adBlock,
  onToggle,
  blocked,
}: {
  add: AddStats;
  adBlock: boolean;
  onToggle: () => void;
  blocked: number;
}) {
  return (
    <div className="welcome">
      <div className="left">
        <span className="add-chip">
          <span className="coin-doodle-sm" aria-hidden>
            $
          </span>
          <b>${ADD_TICKER}</b>
          {CA_LIVE ? (
            <>
              <span>{formatMarketCap(add.marketCap)}</span>
              <span className={`chg ${add.change24h >= 0 ? "up" : "down"}`}>
                {add.change24h >= 0 ? "+" : ""}
                {add.change24h}%
              </span>
            </>
          ) : (
            <span className="tba">TBA</span>
          )}
        </span>
        <span
          className={`adblock bevel-out${adBlock ? " on" : ""}`}
          onClick={onToggle}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onToggle();
          }}
          title="Toggle pop-up ads"
        >
          <span className="led" aria-hidden />
          AD BLOCKER: {adBlock ? "ON" : "OFF"}
          {adBlock && blocked > 0 ? <span>&nbsp;({blocked} blocked)</span> : null}
        </span>
      </div>
      <div className="right">
        <a
          className="freecoin"
          href={linkFor("pump.fun")}
          target="_blank"
          rel="noopener noreferrer"
        >
          Buy ${ADD_TICKER} <span className="chev">&#9654;</span>
        </a>
      </div>
    </div>
  );
}

export function ContractPanel() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ADD_CONTRACT).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <div className="bar blue">${ADD_TICKER} Contract</div>
      <div className="searchbox">
        <input
          type="text"
          className="ca-field"
          value={ADD_CONTRACT}
          readOnly
          aria-label="$AdFund contract address"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button type="button" className="btn98 bevel-out" onClick={copy}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </>
  );
}

const PLATFORMS = [
  { nm: "Dexscreener", ds: "(boosted)" },
  { nm: "DexTools", ds: "(hot pair)" },
  { nm: "pump.fun", ds: "(origin)" },
];

export function BoostedAcross() {
  return (
    <>
      <div className="bar blue">Boosted Across</div>
      <div className="cats-intro">
        The war chest keeps ${ADD_TICKER} lit up on every major Solana terminal.
      </div>
      <div className="cats">
        {PLATFORMS.map((p) => (
          <div className="cat" key={p.nm}>
            <a
              href={linkFor(p.nm)}
              className="nm"
              target="_blank"
              rel="noopener noreferrer"
            >
              {p.nm}
            </a>
            <div className="ds">{p.ds}</div>
          </div>
        ))}
      </div>
      <div className="viewall">
        <a href="#">view boost history...</a>
      </div>
    </>
  );
}

export function XAd() {
  // A self-contained card styled to mirror the real @adfunddotfun X profile.
  // Built from static brand data (X_PROFILE) so it always renders -- no
  // dependency on X's embed widget, which routinely fails to load.
  return (
    <div className="xad">
      <div className="xad-label">- Advertisement -</div>
      <div className="xcard">
        <div className="xcard-cover">
          <span className="x-logo" aria-hidden>
            X
          </span>
        </div>
        <div className="xcard-head">
          <span
            className="xcard-avatar"
            style={{ backgroundImage: `url(${X_PROFILE.avatar})` }}
            aria-hidden
          />
          <div className="xcard-id">
            <div className="xcard-name">
              {X_PROFILE.name}
              {X_PROFILE.verified ? (
                <span className="xcard-check" aria-hidden>
                  &#10003;
                </span>
              ) : null}
            </div>
            <div className="xcard-handle">@{X_PROFILE.handle}</div>
          </div>
          <a
            className="xcard-follow"
            href={X_PROFILE.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow
          </a>
        </div>
        <div className="xcard-bio">{X_PROFILE.bio}</div>
        <div className="xcard-meta">
          <a className="xcard-link" href="/">
            {X_PROFILE.website}
          </a>
        </div>
        {X_PROFILE.following || X_PROFILE.followers ? (
          <div className="xcard-stats">
            {X_PROFILE.following ? (
              <span>
                <b>{X_PROFILE.following}</b> Following
              </span>
            ) : null}
            {X_PROFILE.followers ? (
              <span>
                <b>{X_PROFILE.followers}</b> Followers
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const ADDONS = [
  { grp: "Charts", links: ["Dexscreener", "DexTools"] },
  { grp: "Buy", links: ["pump.fun"] },
  { grp: "Track", links: ["War Chest", "Boost Log"] },
  { grp: "Community", links: ["Telegram", "X / Twitter", "Web Ring"] },
];

export function CoinAddOns() {
  return (
    <>
      <div className="bar blue">${ADD_TICKER} Tools &amp; Links</div>
      <div className="addons">
        {ADDONS.map((g) => (
          <div className="grp" key={g.grp}>
            <b>{g.grp}</b>
            <div>
              {g.links.map((l, i) => {
                const href = linkFor(l);
                const ext = href !== "#";
                return (
                  <React.Fragment key={l}>
                    <a
                      href={href}
                      target={ext ? "_blank" : undefined}
                      rel={ext ? "noopener noreferrer" : undefined}
                    >
                      {l}
                    </a>
                    {i < g.links.length - 1 ? <span>, </span> : null}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
