"use client";

import React, { useEffect, useRef, useState } from "react";
import { AddStats, ADD_TICKER, ADD_CONTRACT, formatMarketCap } from "@/lib/coins";

export function GeoHeader() {
  return (
    <div className="geo-header">
      <div className="wordmark">
        <span className="coin-doodle" aria-hidden>
          $
        </span>
        <span className="add">ADD</span>
        <span className="coin">COIN</span>
        <span className="dotsol">.sol</span>
      </div>
      <div className="header-links">
        <a href="#">pump.fun</a> - <a href="#">Dexscreener</a> - <a href="#">Help</a>
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
          <span>{formatMarketCap(add.marketCap)}</span>
          <span className={`chg ${add.change24h >= 0 ? "up" : "down"}`}>
            {add.change24h >= 0 ? "+" : ""}
            {add.change24h}%
          </span>
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
        <a className="freecoin" href="#">
          Buy ${ADD_TICKER} <span className="chev">&#9654;</span>
        </a>
      </div>
    </div>
  );
}

const ACTIONS = [
  {
    glyph: "rocket",
    title: "AUTO-LAUNCHES",
    desc: "A fresh coin deploys every 10 seconds, fully automated.",
  },
  {
    glyph: "wallet",
    title: "WAR CHEST",
    desc: "Every creator fee flows straight into the $ADD treasury.",
  },
  {
    glyph: "boost",
    title: "BOOSTS + ADS",
    desc: "The chest spends it all promoting $ADD across every DEX.",
  },
];

function ActionGlyph({ kind }: { kind: string }) {
  const base: React.CSSProperties = {
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    color: "#fff",
  };
  if (kind === "rocket") return <span style={base}>&#9650;</span>;
  if (kind === "wallet") return <span style={base}>&#9638;</span>;
  return <span style={base}>&#9733;</span>;
}

export function ActionButtons() {
  return (
    <div className="actions">
      {ACTIONS.map((a) => (
        <div className="action" key={a.title}>
          <span className="glyph" aria-hidden>
            <ActionGlyph kind={a.glyph} />
          </span>
          <span className="copy">
            <span className="t">{a.title}</span>
            <span className="d">{a.desc}</span>
          </span>
          <span className="arrow" aria-hidden>
            &#9656;
          </span>
        </div>
      ))}
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
          aria-label="$ADD contract address"
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
  { nm: "Birdeye", ds: "(featured)" },
  { nm: "Photon", ds: "(spotlight)" },
  { nm: "Jupiter", ds: "(routed)" },
  { nm: "Raydium", ds: "(pooled)" },
  { nm: "pump.fun", ds: "(origin)" },
  { nm: "Solscan", ds: "(verified)" },
  { nm: "GMGN", ds: "(trending)" },
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
            <a href="#" className="nm">
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

const SITE_URL = "https://addcoin.vercel.app";

const X_ADS = [
  "buy $ADDCOIN today and get ONE $ADDCOIN absolutely FREE -- limited time only, act NOW!!!",
  "*** CONGRATULATIONS *** you are the 1,000,000th degen online! claim your prize: buy $ADDCOIN!!!",
  "WARNING: your wallet is dangerously LOW on gains. fix it instantly -- buy $ADDCOIN today!",
  "you have been SPECIALLY SELECTED to buy $ADDCOIN. click before this exclusive offer expires!",
  "make $$$ FAST from home! step 1: buy $ADDCOIN. step 2: ??? step 3: PROFIT!!!",
  "ONE WEIRD TRICK the whales don't want you to know -- buy $ADDCOIN and never look back!!!",
  "FREE bonus coin with every order!!! buy $ADDCOIN now and ride the war chest to the moon!",
  "your PC feels SLOW because it holds 0 $ADDCOIN. download more gains -- buy $ADDCOIN today!",
  "you are today's LUCKY winner of the $ADDCOIN airdrop!!! to claim your reward, buy $ADDCOIN!",
  "HOT new launch detected in your area!!! buy $ADDCOIN before it 100x's overnight -- act now!",
];

function tweetHref(text: string): string {
  const params = new URLSearchParams({ text, url: SITE_URL });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function XAd() {
  const [idx, setIdx] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    setIdx(Math.floor(Math.random() * X_ADS.length));
    const t = setInterval(() => {
      if (!pausedRef.current) setIdx((p) => (p + 1) % X_ADS.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const saying = X_ADS[idx];

  return (
    <div
      className="col-right"
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
      }}
    >
      <div className="xad-label">- Advertisement -</div>
      <div className="xcard">
        <div className="xcard-cover">
          <span className="x-logo" aria-hidden>
            X
          </span>
        </div>
        <div className="xcard-head">
          <span className="xcard-avatar" aria-hidden>
            $
          </span>
          <div className="xcard-id">
            <div className="xcard-name">
              ADDCOIN
              <span className="xcard-check" aria-hidden>
                &#10003;
              </span>
            </div>
            <div className="xcard-handle">@addcoin</div>
          </div>
        </div>
        <div className="xcard-bio">
          Auto-launching a fresh coin every 10s. The war chest never sleeps. buy
          $ADDCOIN.
        </div>
        <div className="xcard-stats">
          <span>
            <b>1,000,000</b> Followers
          </span>
          <span>
            <b>0</b> Following
          </span>
        </div>
      </div>
      <a className="xcard-btn" href={tweetHref(saying)} target="_blank" rel="noopener noreferrer">
        X
      </a>
    </div>
  );
}

const ADDONS = [
  { grp: "Charts", links: ["Dexscreener", "Birdeye", "DexTools"] },
  { grp: "Buy", links: ["pump.fun", "Jupiter", "Raydium"] },
  { grp: "Track", links: ["Holders", "War Chest", "Boost Log"] },
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
              {g.links.map((l, i) => (
                <React.Fragment key={l}>
                  <a href="#">{l}</a>
                  {i < g.links.length - 1 ? <span>, </span> : null}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
