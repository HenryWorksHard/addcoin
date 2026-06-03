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
const LAUNCH_SECONDS = 8;
// How often the site polls the real engine, and how long a status snapshot is
// considered "live" before the page falls back to the in-browser sim.
const LIVE_POLL_MS = 2000;
const LIVE_STALE_MS = 60000;
// On the deployed domain (real mode) the in-browser sim is disabled so the page
// shows ONLY real on-chain data -- never fake mints presented as real. Set via
// NEXT_PUBLIC_DISABLE_SIM=1 in the Vercel env.
const DISABLE_SIM = (process.env.NEXT_PUBLIC_DISABLE_SIM ?? "").trim() === "1";

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
  secondsLeft: number;
  phase: "counting" | "launching";
  lastLaunch: LastLaunch | null;
  lastBatch: LastLaunch[] | null;
  total: number;
};

function initialEngine(): Engine {
  return {
    counts: AD_COINS.reduce<Record<string, number>>((m, c) => {
      m[c.id] = 0;
      return m;
    }, {}),
    cycle: 1,
    secondsLeft: LAUNCH_SECONDS,
    phase: "counting",
    lastLaunch: null,
    lastBatch: null,
    total: 0,
  };
}

// Live snapshot served by /api/launches (written by the always-on worker).
// Mirrors lib/launchStore.ts LaunchStatus; redeclared here so the client bundle
// never imports the node:fs store module.
type LiveStatus = {
  mode: string;
  phase: "counting" | "launching";
  onDeckIndex: number;
  cycle: number;
  total: number;
  counts: Record<string, number>;
  batchSize: number;
  lastLaunch: LastLaunch | null;
  lastBatch: LastLaunch[] | null;
  nextLaunchAt: number | null;
  intervalMs: number;
  updatedAt: number;
};

function liveIsFresh(s: LiveStatus | null): s is LiveStatus {
  return !!s && Date.now() - s.updatedAt < LIVE_STALE_MS;
}

export default function Home() {
  const [add, setAdd] = useState<AddStats>(initialAddStats);
  const [adBlock, setAdBlock] = useState(false);
  const [blocked, setBlocked] = useState(0);
  const [popups, setPopups] = useState<ActivePopup[]>([]);
  const [, render] = useState(0);

  const adBlockRef = useRef(adBlock);
  const engineRef = useRef<Engine>(initialEngine());
  const liveRef = useRef<LiveStatus | null>(null);
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
      // When the real worker is feeding /api/launches, mirror it and pause sim.
      // DISABLE_SIM also pauses it unconditionally (deployed real-mode domain).
      if (DISABLE_SIM || liveIsFresh(liveRef.current)) return;
      const e = engineRef.current;
      if (e.phase === "launching") return;
      if (e.secondsLeft > 1) {
        e.secondsLeft -= 1;
        render((n) => n + 1);
        return;
      }
      e.phase = "launching";
      render((n) => n + 1);
      // Fire the whole book simultaneously (mirrors the worker's batch model).
      Promise.all(AD_COINS.map((coin: AdCoin) => launcher.launch(coin))).then((results) => {
        const e2 = engineRef.current;
        const at = Date.now();
        const batch: LastLaunch[] = AD_COINS.map((coin, i) => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          mint: results[i].mint,
          at,
        }));
        AD_COINS.forEach((coin) => {
          e2.counts[coin.id] = (e2.counts[coin.id] ?? 0) + 1;
        });
        e2.total += AD_COINS.length;
        e2.lastBatch = batch;
        e2.lastLaunch = batch[batch.length - 1];
        e2.cycle += 1;
        e2.secondsLeft = LAUNCH_SECONDS;
        e2.phase = "counting";
        setAdd((a) => ({ ...a, marketCap: Math.round(a.marketCap * 1.0015) }));
        render((n) => n + 1);
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Poll the real launch engine. When it responds the page mirrors it; when it
  // is absent (e.g. public site with no hosted worker) liveRef stays null and
  // the in-browser sim above keeps the feed animated.
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch("/api/launches", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        liveRef.current = j && j.ok && j.status ? (j.status as LiveStatus) : null;
        render((n) => n + 1);
      } catch {
        // Route/network error: keep the last snapshot; staleness falls back to sim.
      }
    };
    poll();
    const t = setInterval(poll, LIVE_POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // 1s tick so the live countdown advances between polls.
  useEffect(() => {
    const t = setInterval(() => {
      if (DISABLE_SIM || liveIsFresh(liveRef.current)) render((n) => n + 1);
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
  const liveFresh = liveIsFresh(liveRef.current);
  const snap = liveRef.current;
  // The deployed domain (DISABLE_SIM) reflects ONLY the real engine: show the live
  // snapshot when fresh, keep its last totals when the worker pauses (engine then
  // shown OFFLINE), and never animate the in-browser sim. Locally sim runs as before.
  const online = liveFresh || !DISABLE_SIM;
  const useSnap = liveFresh || (DISABLE_SIM && !!snap);
  const view =
    useSnap && snap
      ? {
          counts: snap.counts,
          cycle: snap.cycle,
          phase: snap.phase,
          lastBatch: snap.lastBatch,
          batchSize: snap.batchSize ?? AD_COINS.length,
          total: snap.total,
          secondsLeft:
            snap.phase === "launching" || snap.nextLaunchAt == null
              ? 0
              : Math.max(0, Math.ceil((snap.nextLaunchAt - Date.now()) / 1000)),
        }
      : {
          counts: e.counts,
          cycle: e.cycle,
          phase: e.phase,
          lastBatch: e.lastBatch,
          batchSize: AD_COINS.length,
          total: e.total,
          secondsLeft: e.secondsLeft,
        };

  let statusMid: string;
  if (adBlock) {
    statusMid = `Ad Blocker: ON  -  ${blocked} pop-up(s) blocked`;
  } else if (!online) {
    statusMid = "Launch engine idle  -  awaiting next run";
  } else if (view.phase === "launching") {
    statusMid = `Engine running  -  minting all ${view.batchSize} ad-coins ...`;
  } else {
    statusMid = `Engine running  -  next batch in ${view.secondsLeft}s`;
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
              counts={view.counts}
              cycle={view.cycle}
              secondsLeft={view.secondsLeft}
              phase={view.phase}
              lastBatch={view.lastBatch}
              batchSize={view.batchSize}
              total={view.total}
              add={add}
              online={online}
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
