"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ADD_TICKER, linkFor, pick } from "@/lib/coins";

export type ActivePopup = {
  id: string;
  headline: string;
  top: number;
  left: number;
  backdrop: string;
  w: number;
  h: number;
};

const BADGES = ["FREE!", "100x", "WIN!", "HOT!", "NEW!", "$0!"];
const DISMISS = [
  "no thanks, I hate gains",
  "close -- I enjoy being poor",
  "skip (I don't want money)",
  "no, I'd rather stay broke",
];

function fmtClock(s: number): string {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function Popup({ popup, onClose }: { popup: ActivePopup; onClose: (id: string) => void }) {
  // Random once per pop-up (client-only -- pop-ups never SSR).
  const badge = useMemo(() => pick(BADGES), []);
  const dismiss = useMemo(() => pick(DISMISS), []);
  const [secs, setSecs] = useState(() => 31 + Math.floor(Math.random() * 60));

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const punch = popup.headline.replace(/[!.\s]+$/, "") + "!!!";

  return (
    <div
      className="popup has-bg"
      style={{ top: popup.top, left: popup.left, width: popup.w }}
    >
      <div className="titlebar">
        <span className="ie-icon" aria-hidden />
        <span className="title-text">Advertisement</span>
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

      <div className="popup-body" style={{ minHeight: popup.h }}>
        <Image
          className="pop-bg"
          src={popup.backdrop}
          alt=""
          fill
          sizes="180px"
          style={{ objectFit: "cover", zIndex: 0 }}
        />
        <div className="pop-scrim" aria-hidden />
        <div className="pop-frame" aria-hidden />

        <span className="pop-badge" aria-hidden>
          {badge}
        </span>

        <div className="pop-headline">
          <span>{punch}</span>
        </div>

        <div className="pop-promo">
          <div className="pop-expiry">
            offer expires in <b>{fmtClock(secs)}</b>
          </div>
          <a
            className="pop-buy"
            href={linkFor("pump.fun")}
            target="_blank"
            rel="noopener noreferrer"
          >
            BUY ${ADD_TICKER} NOW &#9654;
          </a>
          <span
            className="pop-dismiss"
            role="button"
            tabIndex={0}
            onClick={() => onClose(popup.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onClose(popup.id);
            }}
          >
            {dismiss}
          </span>
        </div>
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
