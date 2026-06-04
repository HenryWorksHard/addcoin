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
  formatSol,
} from "@/lib/coins";

// The header "How $AdFund works" readout, drawn as the self-funding flywheel
// instead of three disconnected boxes: LAUNCH -> WAR CHEST -> PROMOTE -> MORE
// EYES, with a return rail that closes the loop. Two nodes carry live on-chain
// numbers (coins launched, war chest balance, SOL deployed) so it reads as a
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
              <span className="fw-t">WAR CHEST</span>
              <span className="fw-d">dev rewards collect here</span>
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

export function XAd() {
  // A self-contained card styled to mirror the real @adfunddotfun X profile.
  // Built from static brand data (X_PROFILE) so it always renders -- no
  // dependency on X's embed widget, which routinely fails to load. Laid out
  // like a genuine X profile card: banner, then the avatar and Follow button
  // share one row, with name/handle/bio/meta stacked beneath -- so nothing
  // collides in the narrow right-hand column.
  return (
    <div className="xad">
      <div className="xad-label">- Advertisement -</div>
      <div className="xcard">
        <div className="xcard-cover" aria-hidden>
          <span className="x-logo">X</span>
        </div>
        <div className="xcard-top">
          <span
            className="xcard-avatar"
            style={{ backgroundImage: `url(${X_PROFILE.avatar})` }}
            aria-hidden
          />
          <a
            className="xcard-follow"
            href={X_PROFILE.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow
          </a>
        </div>
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
        <div className="xcard-bio">{X_PROFILE.bio}</div>
        <div className="xcard-meta">
          <a className="xcard-link" href="/">
            {X_PROFILE.website}
          </a>
          <span className="xcard-dot" aria-hidden>
            &middot;
          </span>
          <span className="xcard-joined">Joined 2026</span>
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
