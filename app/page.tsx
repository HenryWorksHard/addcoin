"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BrowserChrome from "./components/BrowserChrome";
import {
  GeoHeader,
  WelcomeBar,
  ActionButtons,
  ContractPanel,
  BoostedAcross,
  XAd,
  CoinAddOns,
} from "./components/StaticSections";
import LaunchFeed from "./components/LaunchFeed";
import PriceChart from "./components/PriceChart";
import AdPopupLayer, { ActivePopup } from "./components/AdPopups";
import {
  AddStats,
  AdCoin,
  AD_COINS,
  initialAddStats,
  POPUP_W,
  POPUP_H,
  POPUP_ADS,
  makePopupContent,
} from "@/lib/coins";
import { launcher } from "@/lib/launcher";

const POPUP_INTERVAL = 9000;
const MAX_POPUPS = 5;
const POPUP_TTL = 24000;
const LAUNCH_SECONDS = 5;

type LastLaunch = {
  id: string;
  name: string;
  symbol: string;
  mint: string;
  at: number;
};

type Engine = {
  counts: Record<string, number>;
  cycle: number;
  index: number;
  secondsLeft: number;
  phase: "counting" | "launching";
  lastLaunch: LastLaunch | null;
  total: number;
};

function initialEngine(): Engine {
  return {
    counts: AD_COINS.reduce<Record<string, number>>((m, c) => {
      m[c.id] = 0;
      return m;
    }, {}),
    cycle: 1,
    index: 0,
    secondsLeft: LAUNCH_SECONDS,
    phase: "counting",
    lastLaunch: null,
    total: 0,
  };
}

export default function Home() {
  const [add, setAdd] = useState<AddStats>(initialAddStats);
  const [adBlock, setAdBlock] = useState(false);
  const [blocked, setBlocked] = useState(0);
  const [popups, setPopups] = useState<ActivePopup[]>([]);
  const [, render] = useState(0);

  const adBlockRef = useRef(adBlock);
  const engineRef = useRef<Engine>(initialEngine());
  const popupCreatedAt = useRef<Record<string, number>>({});

  useEffect(() => {
    adBlockRef.current = adBlock;
  }, [adBlock]);

  // Preload every pop-up backdrop on mount so an ad never renders before its
  // image is ready, and so each image is cached for instant reuse.
  useEffect(() => {
    POPUP_ADS.forEach((ad) => {
      const img = new window.Image();
      img.src = ad.image;
    });
  }, []);

  // 1s heartbeat drives the launch engine: tick the countdown, fire a launch
  // when it hits bottom, then resume counting once the (sim) mint resolves.
  useEffect(() => {
    const t = setInterval(() => {
      const e = engineRef.current;
      if (e.phase === "launching") return;
      if (e.secondsLeft > 1) {
        e.secondsLeft -= 1;
        render((n) => n + 1);
        return;
      }
      const coin: AdCoin = AD_COINS[e.index];
      e.phase = "launching";
      render((n) => n + 1);
      launcher.launch(coin).then((res) => {
        const e2 = engineRef.current;
        e2.counts[coin.id] = (e2.counts[coin.id] ?? 0) + 1;
        e2.total += 1;
        e2.lastLaunch = {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          mint: res.mint,
          at: Date.now(),
        };
        e2.index = (e2.index + 1) % AD_COINS.length;
        if (e2.index === 0) e2.cycle += 1;
        e2.secondsLeft = LAUNCH_SECONDS;
        e2.phase = "counting";
        setAdd((a) => ({ ...a, marketCap: Math.round(a.marketCap * 1.0015) }));
        render((n) => n + 1);
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // 1s heartbeat: expire stale pop-ups.
  useEffect(() => {
    const t = setInterval(() => {
      const t0 = Date.now();
      setPopups((prev) =>
        prev.filter((p) => t0 - (popupCreatedAt.current[p.id] ?? t0) < POPUP_TTL)
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const spawnPopup = useCallback(() => {
    if (adBlockRef.current) {
      setBlocked((b) => b + 1);
      return;
    }
    setPopups((prev) => {
      if (prev.length >= MAX_POPUPS) return prev;
      const ad = makePopupContent(prev.map((p) => p.backdrop));
      const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
      const vh = typeof window !== "undefined" ? window.innerHeight : 700;
      const maxLeft = Math.max(40, vw - POPUP_W - 24);
      const maxTop = Math.max(60, vh - POPUP_H - 90);
      // Try a handful of random spots and keep whichever lands farthest from the
      // pop-ups already open, so they scatter instead of stacking.
      let left = Math.max(8, Math.floor(Math.random() * maxLeft));
      let top = Math.max(48, Math.floor(Math.random() * maxTop));
      let bestGap = -1;
      for (let i = 0; i < 14; i++) {
        const cl = Math.max(8, Math.floor(Math.random() * maxLeft));
        const ct = Math.max(48, Math.floor(Math.random() * maxTop));
        let gap = Infinity;
        for (const p of prev) {
          const d = Math.hypot(cl - p.left, ct - p.top);
          if (d < gap) gap = d;
        }
        if (gap > bestGap) {
          bestGap = gap;
          left = cl;
          top = ct;
        }
      }
      const id = `pop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      popupCreatedAt.current[id] = Date.now();
      return [
        ...prev,
        {
          id,
          headline: ad.headline,
          top,
          left,
          backdrop: ad.image,
          w: POPUP_W,
          h: POPUP_H,
        },
      ];
    });
  }, []);

  // Periodically open a pop-up ad (with a startup burst).
  useEffect(() => {
    const burst = [600, 1500, 2500, 3600].map((ms) => setTimeout(spawnPopup, ms));
    const t = setInterval(spawnPopup, POPUP_INTERVAL);
    return () => {
      burst.forEach(clearTimeout);
      clearInterval(t);
    };
  }, [spawnPopup]);

  const closePopup = useCallback((id: string) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
    delete popupCreatedAt.current[id];
  }, []);

  const toggleAdBlock = useCallback(() => {
    setAdBlock((v) => {
      const next = !v;
      if (next) setPopups([]);
      return next;
    });
  }, []);

  const e = engineRef.current;
  const onDeck = AD_COINS[e.index];

  let statusMid: string;
  if (adBlock) {
    statusMid = `Ad Blocker: ON  -  ${blocked} pop-up(s) blocked`;
  } else if (e.phase === "launching") {
    statusMid = `Engine running  -  minting ${onDeck.name} ...`;
  } else {
    statusMid = `Engine running  -  next: ${onDeck.name} in ${e.secondsLeft}s`;
  }

  return (
    <>
      <BrowserChrome url="https://www.adfund.fun/" statusLeft="Done" statusMid={statusMid}>
        <GeoHeader />
        <WelcomeBar add={add} adBlock={adBlock} onToggle={toggleAdBlock} blocked={blocked} />
        <div className="body-grid">
          <div className="col-left">
            <ContractPanel />
            <LaunchFeed
              coins={AD_COINS}
              counts={e.counts}
              cycle={e.cycle}
              onDeck={e.index}
              secondsLeft={e.secondsLeft}
              phase={e.phase}
              lastLaunch={e.lastLaunch}
              total={e.total}
              add={add}
            />
            <BoostedAcross />
            <CoinAddOns />
          </div>
          <div className="col-right">
            <XAd />
            <PriceChart />
            <ActionButtons />
          </div>
        </div>
      </BrowserChrome>

      <AdPopupLayer popups={popups} onClose={closePopup} />
    </>
  );
}
