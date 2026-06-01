"use client";

import React, { useMemo } from "react";
import { Coin, formatMarketCap } from "@/lib/coins";

export type ActivePopup = {
  id: string;
  coin: Coin;
  top: number;
  left: number;
};

function MiniChart({ seed }: { seed: number }) {
  const bars = useMemo(() => {
    const out: number[] = [];
    let v = 10;
    let r = seed;
    for (let i = 0; i < 14; i++) {
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      v = Math.max(6, Math.min(34, v + ((r % 16) - 6)));
      out.push(v);
    }
    return out;
  }, [seed]);
  return (
    <div className="minichart" aria-hidden>
      {bars.map((h, i) => (
        <i key={i} style={{ height: h, background: i > 9 ? "#16c60c" : "#0a7a06" }} />
      ))}
    </div>
  );
}

function Popup({ popup, onClose }: { popup: ActivePopup; onClose: (id: string) => void }) {
  const { coin } = popup;
  const visitor = useMemo(
    () => String(13000 + Math.floor(Math.random() * 90000)).padStart(8, "0"),
    []
  );
  const seed = useMemo(() => Math.floor(Math.random() * 100000), []);

  return (
    <div className="popup" style={{ top: popup.top, left: popup.left }}>
      <div className="titlebar">
        <span className="ie-icon" aria-hidden />
        <span className="title-text">ADDCOIN :: new launch!</span>
        <div className="title-btns">
          <span
            className="title-btn bevel-out"
            role="button"
            tabIndex={0}
            onClick={() => onClose(popup.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onClose(popup.id);
            }}
            aria-label="Close ad"
          >
            &#10005;
          </span>
        </div>
      </div>

      <div className="popup-body">
        <div className="promo-marquee">
          <marquee scrollamount={6}>
            &#9658; just launched on pump.fun &middot; don&apos;t miss the next 100x
            &middot; ape responsibly &#9668;
          </marquee>
        </div>

        <div className="promo-coin">
          <span className="coin-logo" style={{ background: coin.color }} aria-hidden>
            {coin.ticker.slice(0, 2)}
          </span>
          <span>
            <div className="promo-name">{coin.name}</div>
            <div className="promo-tk">${coin.ticker}</div>
          </span>
        </div>

        <div className="blink" style={{ color: "#cc0000", fontWeight: "bold", fontSize: 12 }}>
          * LIVE NOW * LIVE NOW *
        </div>

        <div className="promo-stats">
          <div>
            mkt cap
            <div className="v">{formatMarketCap(coin.marketCap)}</div>
          </div>
          <div>
            24h
            <div className="v" style={{ color: coin.change >= 0 ? "#0a7a06" : "#cc0000" }}>
              {coin.change >= 0 ? "+" : ""}
              {coin.change}%
            </div>
          </div>
        </div>

        <MiniChart seed={seed} />

        <button type="button" className="buy-btn" onClick={() => onClose(popup.id)}>
          Buy ${coin.ticker} now
        </button>

        <div className="visitor">You are visitor #{visitor}</div>
      </div>
    </div>
  );
}

export default function AdPopupLayer({
  popups,
  onClose,
}: {
  popups: ActivePopup[];
  onClose: (id: string) => void;
}) {
  return (
    <div className="popup-layer">
      {popups.map((p) => (
        <Popup key={p.id} popup={p} onClose={onClose} />
      ))}
    </div>
  );
}
