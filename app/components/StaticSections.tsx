"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  AddStats,
  ADD_TICKER,
  ADD_CONTRACT,
  CA_LIVE,
  X_PROFILE,
  linkFor,
  formatMarketCap,
  formatSol,
} from "@/lib/coins";

// The header "How $AdFund works" readout, drawn as the self-funding flywheel
// instead of three disconnected boxes: LAUNCH -> ADFUND CHEST -> PROMOTE -> MORE
// EYES, with a return rail that closes the loop. Two nodes carry live on-chain
// numbers (coins launched, AdFund Chest balance, SOL deployed) so it reads as a
// working engine, not static marketing copy.
export function GeoHeader({
  coinsLaunched,
  warChestSol,
  promoSol,
}: {
  coinsLaunched: number;
  warChestSol: number | null;
  promoSol: number | null;
}) {
  const [logoOk, setLogoOk] = useState(true);

  return (
    <div className="geo-header">
      <div className="wordmark">
        {logoOk ? (
          <Image
            className="logo-img"
            src="/logo.png"
            alt="AdFund"
            width={65}
            height={65}
            priority
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
      <div className="flywheel">
        <div className="fw-rail">
          <div className="fw-node">
            <span className="fw-step">1</span>
            <span className="fw-copy">
              <span className="fw-t">LAUNCH</span>
              <span className="fw-d">mints ad-coins non-stop</span>
              <span className="fw-stat">
                <b>{coinsLaunched.toLocaleString()}</b> coins
              </span>
            </span>
          </div>
          <span className="fw-arrow" aria-hidden>
            &#9654;
          </span>
          <div className="fw-node">
            <span className="fw-step">2</span>
            <span className="fw-copy">
              <span className="fw-t">ADFUND CHEST</span>
              <span className="fw-d">50% of creator fees route here</span>
              <span className="fw-stat">
                <b>{warChestSol == null ? "--" : formatSol(warChestSol)}</b>
              </span>
            </span>
          </div>
          <span className="fw-arrow" aria-hidden>
            &#9654;
          </span>
          <div className="fw-node">
            <span className="fw-step">3</span>
            <span className="fw-copy">
              <span className="fw-t">PROMOTE</span>
              <span className="fw-d">buys mints, ads &amp; boosts</span>
              <span className="fw-stat">
                <b>{promoSol == null ? "--" : formatSol(promoSol)}</b> deployed
              </span>
            </span>
          </div>
          <span className="fw-arrow" aria-hidden>
            &#9654;
          </span>
          <div className="fw-node fw-node-loop">
            <span className="fw-step">&#8734;</span>
            <span className="fw-copy">
              <span className="fw-t">MORE EYES</span>
              <span className="fw-d">new holders find $AdFund</span>
              <span className="fw-stat">&#8635; loops back</span>
            </span>
          </div>
        </div>
        <div className="fw-return" aria-hidden>
          <span className="fw-return-arrow">&#9664;</span>
          <span className="fw-return-line" />
          <span className="fw-return-label">
            the engine never stops -- profits loop back to LAUNCH
          </span>
          <span className="fw-return-line" />
        </div>
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
          <span className="coin-doodle-sm" aria-hidden />
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
        The AdFund Chest keeps ${ADD_TICKER} lit up on every major Solana terminal.
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

// A wall of mismatched 88x31 "trust" seals -- the kind of 100%-SAFE /
// VIRUS-FREE / AS-SEEN-ON badges that plastered every late-90s download page,
// here repurposed as crypto trust-bait. Pure decoration that leans into the
// site's whole bit (everything is an ad), and fills the strip under the launch
// book. The asterisks are the joke -- there is no fine print.
const SEALS = [
  { ico: "★", top: "100%", sub: "SAFE", tone: "a" },
  { ico: "✓", top: "VIRUS", sub: "FREE", tone: "b" },
  { ico: "★", top: "#1 RATED", sub: "AD-COIN", tone: "d" },
  { ico: "✓", top: "SSL", sub: "SECURED", tone: "e" },
  { ico: "▲", top: "GUARANTEED", sub: "100x*", tone: "f" },
  { ico: "★", top: "AS SEEN", sub: "ON X", tone: "b" },
  { ico: "✓", top: "100%", sub: "LEGIT", tone: "a" },
  { ico: "◆", top: "TRUSTED BY", sub: "MILLIONS", tone: "d" },
  { ico: "★", top: "AWARD", sub: "WINNING", tone: "c" },
];

export function TrustBadges() {
  return (
    <>
      <div className="bar blue">Seals &amp; Certifications</div>
      <div className="cats-intro">
        Audited, certified and 100% guaranteed by absolutely nobody.
      </div>
      <div className="badge-wall">
        {SEALS.map((b, i) => (
          <span className={`tbadge tbadge-${b.tone}`} key={`${b.top}-${i}`} title="Verified*">
            <span className="tbadge-ico" aria-hidden>
              {b.ico}
            </span>
            <span className="tbadge-txt">
              <b>{b.top}</b>
              <span>{b.sub}</span>
            </span>
          </span>
        ))}
      </div>
    </>
  );
}

// X (Twitter) action-bar glyphs as inline SVG paths (filled with currentColor),
// so the promoted post reads like a real timeline card without an icon font or
// X's flaky embed widget.
const X_ICONS = {
  reply:
    "M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z",
  repost:
    "M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z",
  like:
    "M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z",
  views: "M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z",
};

export function XAd() {
  // A self-contained "Promoted" post styled to mirror an @adfunddotfun tweet in
  // the X timeline -- avatar, blue check, handle, copy, the four action glyphs
  // with counts, and a greyed "Promoted" footer. Built from static brand data
  // (X_PROFILE) so it always renders, independent of X's embed widget. Reads
  // far better than a profile card in the narrow right-hand column.
  return (
    <div className="xad">
      <div className="xad-label">- Advertisement -</div>
      <div className="xpost">
        <div className="xpost-head">
          <span
            className="xpost-avatar"
            style={{ backgroundImage: `url(${X_PROFILE.avatar})` }}
            aria-hidden
          />
          <div className="xpost-id">
            <div className="xpost-name">
              {X_PROFILE.name}
              {X_PROFILE.verified ? (
                <span className="xpost-check" aria-hidden>
                  &#10003;
                </span>
              ) : null}
            </div>
            <div className="xpost-handle">@{X_PROFILE.handle} &middot; 2h</div>
          </div>
          <a
            className="xpost-follow"
            href={X_PROFILE.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow
          </a>
        </div>

        <div className="xpost-text">
          One coin, one job: <b>buy ads for itself</b>. Every pop-up on this page
          is a real pump.fun launch, auto-minted by the engine -- and it never
          sleeps. <span className="xpost-tag">${ADD_TICKER}</span>
        </div>

        <div className="xpost-actions" aria-hidden>
          <span className="xpost-act">
            <svg viewBox="0 0 24 24">
              <path d={X_ICONS.reply} />
            </svg>
            <i>211</i>
          </span>
          <span className="xpost-act">
            <svg viewBox="0 0 24 24">
              <path d={X_ICONS.repost} />
            </svg>
            <i>904</i>
          </span>
          <span className="xpost-act is-like">
            <svg viewBox="0 0 24 24">
              <path d={X_ICONS.like} />
            </svg>
            <i>3.4K</i>
          </span>
          <span className="xpost-act">
            <svg viewBox="0 0 24 24">
              <path d={X_ICONS.views} />
            </svg>
            <i>128K</i>
          </span>
        </div>

        <div className="xpost-foot">Promoted</div>
      </div>
    </div>
  );
}

const ADDONS = [
  { grp: "Charts", links: ["Dexscreener", "DexTools"] },
  { grp: "Buy", links: ["pump.fun"] },
  { grp: "Track", links: ["AdFund Chest", "Boost Log"] },
  { grp: "Community", links: ["Telegram", "X / Twitter"] },
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
