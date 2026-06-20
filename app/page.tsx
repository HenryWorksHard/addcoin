"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BrowserChrome from "./components/BrowserChrome";
import {
  GeoHeader,
  WelcomeBar,
  ContractPanel,
  BoostedAcross,
  TrustBadges,
  CoinAddOns,
} from "./components/StaticSections";
import XProfileCard from "./components/XProfileCard";
import LaunchFeed from "./components/LaunchFeed";
import DexSpendPanel, { PromoLive } from "./components/DexSpendPanel";
import AutoRefuelAd from "./components/AutoRefuelAd";
import PriceChart from "./components/PriceChart";
import TvAd from "./components/TvAd";
import ChartAd from "./components/ChartAd";
import SideBadges from "./components/SideBadges";
import AdPopupLayer, { ActivePopup } from "./components/AdPopups";
import {
  AddStats,
  AdCoin,
  AD_COINS,
  AUTO_TOPUP,
  DEX_PROMO,
  LAUNCH_INTERVAL_SECONDS,
  LAUNCH_BATCH_SIZE,
  formatCountdown,
  initialAddStats,
  POPUP_W,
  POPUP_H,
  makePopupContent,
  ADD_TICKER,
  X_URL,
} from "@/lib/coins";
import { launcher } from "@/lib/launcher";

const POPUP_INTERVAL = 9000;
const MAX_POPUPS = 5;
const POPUP_TTL = 24000;
// Sim countdown length; mirrors the worker's LAUNCH_INTERVAL_MS (shared source
// of truth in lib/coins.ts). The live countdown is derived from the worker's
// nextLaunchAt, so this only paces the in-browser sim shown when no real worker
// is feeding /api/launches.
const LAUNCH_SECONDS = LAUNCH_INTERVAL_SECONDS;
// How long every coin holds on LAUNCHED after a batch before the next countdown
// starts (mirrors the worker's LAUNCHED_HOLD_MS).
const LAUNCHED_HOLD_MS = 2000;
// How often the site polls the real engine, and how long a status snapshot is
// considered "live" before the page falls back to the in-browser sim.
const LIVE_POLL_MS = 1000;
const LIVE_STALE_MS = 60000;
// Dexscreener promo spend changes rarely (only when a boost/ad is bought) and the
// API caches the on-chain read, so poll it slowly.
const PROMO_POLL_MS = 120000;
// Launch-wallet SOL balance: changes as the engine mints, but a 30s cadence is
// plenty for a readout and keeps RPC load light (the API also caches the read).
const BALANCE_POLL_MS = 30000;
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

// This cycle's coins: a window of LAUNCH_BATCH_SIZE starting at `start`, wrapping
// the book so any length rotates cleanly. Mirrors the worker's batchAt().
function batchAt(start: number): AdCoin[] {
  const out: AdCoin[] = [];
  for (let k = 0; k < LAUNCH_BATCH_SIZE; k++) {
    out.push(AD_COINS[(start + k) % AD_COINS.length]);
  }
  return out;
}

type Engine = {
  counts: Record<string, number>;
  cycle: number;
  secondsLeft: number;
  phase: "counting" | "launching" | "launched";
  lastLaunch: LastLaunch | null;
  lastBatch: LastLaunch[] | null;
  total: number;
  // Start index of the window on deck / in flight; advances by the batch size.
  windowStart: number;
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
    windowStart: 0,
  };
}

// Live snapshot served by /api/launches (written by the always-on worker).
// Mirrors lib/launchStore.ts LaunchStatus; redeclared here so the client bundle
// never imports the node:fs store module.
type LiveStatus = {
  mode: string;
  phase: "counting" | "launching" | "launched";
  onDeckIndex: number;
  cycle: number;
  total: number;
  counts: Record<string, number>;
  batchSize: number;
  lastLaunch: LastLaunch | null;
  lastBatch: LastLaunch[] | null;
  nextLaunchAt: number | null;
  intervalMs: number;
  lastTopUp?: { amountSol: number; sig: string | null; at: number } | null;
  updatedAt: number;
};

function liveIsFresh(s: LiveStatus | null): s is LiveStatus {
  return !!s && Date.now() - s.updatedAt < LIVE_STALE_MS;
}

function Home() {
  const [add, setAdd] = useState<AddStats>(initialAddStats);
  const [adBlock, setAdBlock] = useState(false);
  const [blocked, setBlocked] = useState(0);
  const [popups, setPopups] = useState<ActivePopup[]>([]);
  const [promo, setPromo] = useState<PromoLive | null>(null);
  const [balances, setBalances] = useState<{ launch: number; dex: number } | null>(null);
  const [, render] = useState(0);

  const adBlockRef = useRef(adBlock);
  const engineRef = useRef<Engine>(initialEngine());
  const liveRef = useRef<LiveStatus | null>(null);
  const popupCreatedAt = useRef<Record<string, number>>({});

  useEffect(() => {
    adBlockRef.current = adBlock;
  }, [adBlock]);

  // 1s heartbeat drives the launch engine: tick the countdown, fire a launch
  // when it hits bottom, then resume counting once the (sim) mint resolves.
  useEffect(() => {
    const t = setInterval(() => {
      // When the real worker is feeding /api/launches, mirror it and pause sim.
      // DISABLE_SIM also pauses it unconditionally (deployed real-mode domain).
      if (DISABLE_SIM || liveIsFresh(liveRef.current)) return;
      const e = engineRef.current;
      // Only the countdown is driven on the heartbeat; launching ends when the
      // mint promise resolves, launched ends on its own hold timer.
      if (e.phase !== "counting") return;
      if (e.secondsLeft > 0) {
        e.secondsLeft -= 1;
        render((n) => n + 1);
        return;
      }
      // Countdown hit 0: fire this cycle's window (mirrors the worker's batch).
      e.phase = "launching";
      const windowCoins = batchAt(e.windowStart);
      render((n) => n + 1);
      Promise.all(windowCoins.map((coin: AdCoin) => launcher.launch(coin))).then((results) => {
        const e2 = engineRef.current;
        const at = Date.now();
        const batch: LastLaunch[] = windowCoins.map((coin, i) => ({
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          mint: results[i].mint,
          at,
        }));
        windowCoins.forEach((coin) => {
          e2.counts[coin.id] = (e2.counts[coin.id] ?? 0) + 1;
        });
        e2.total += windowCoins.length;
        e2.lastBatch = batch;
        e2.lastLaunch = batch[batch.length - 1];
        e2.cycle += 1;
        // Flip the window's coins to LAUNCHED, hold the beat, then advance the
        // window and count again.
        e2.phase = "launched";
        setAdd((a) => ({ ...a, marketCap: Math.round(a.marketCap * 1.0015) }));
        render((n) => n + 1);
        setTimeout(() => {
          const e3 = engineRef.current;
          e3.windowStart = (e3.windowStart + LAUNCH_BATCH_SIZE) % AD_COINS.length;
          e3.phase = "counting";
          e3.secondsLeft = LAUNCH_SECONDS;
          render((n) => n + 1);
        }, LAUNCHED_HOLD_MS);
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

  // Poll the Dexscreener promo-wallet spend (on-chain, served by /api/promo-spend).
  // When no promo wallet is configured the route returns ok:false and the panel
  // falls back to the manual DEX_PROMO figures.
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch("/api/promo-spend", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        setPromo(j && j.ok && j.spend ? (j.spend as PromoLive) : null);
      } catch {
        // Network/route error: keep the last value.
      }
    };
    poll();
    const t = setInterval(poll, PROMO_POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  // Poll the launch-wallet on-chain SOL balance (served by /api/wallet-balance).
  // When no RPC is reachable the route returns ok:false and the readout hides it.
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch("/api/wallet-balance", { cache: "no-store" });
        const j = await r.json();
        if (!alive) return;
        setBalances(j && j.ok && j.balances ? { launch: j.balances.launch, dex: j.balances.dex } : null);
      } catch {
        // Network/route error: keep the last value.
      }
    };
    poll();
    const t = setInterval(poll, BALANCE_POLL_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
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
          batchSize: snap.batchSize,
          onDeckIndex: snap.onDeckIndex,
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
          batchSize: LAUNCH_BATCH_SIZE,
          onDeckIndex: e.windowStart,
          total: e.total,
          secondsLeft: e.secondsLeft,
        };

  let statusMid: string;
  if (adBlock) {
    statusMid = `Ad Blocker: ON  -  ${blocked} pop-up(s) blocked`;
  } else if (!online) {
    statusMid = "Launch engine idle  -  awaiting next run";
  } else if (view.phase === "launching") {
    statusMid = `Engine running  -  minting ${view.batchSize} ad-coins ...`;
  } else if (view.phase === "launched") {
    statusMid = `Engine running  -  launched ${view.batchSize} ad-coins`;
  } else {
    statusMid = `Engine running  -  next batch in ${formatCountdown(view.secondsLeft)}`;
  }

  return (
    <>
      <BrowserChrome url="https://www.adfund.fun/" statusLeft="Done" statusMid={statusMid}>
        <GeoHeader
          coinsLaunched={view.total}
          warChestSol={balances ? balances.launch + balances.dex : null}
          promoSol={promo ? promo.totalSol : DEX_PROMO.boostsSol + DEX_PROMO.adsSol}
        />
        <WelcomeBar add={add} adBlock={adBlock} onToggle={toggleAdBlock} blocked={blocked} />
        <div className="body-grid">
          <div className="col-left">
            <ContractPanel />
            <div className="engine-row">
              <div className="engine-col">
                <LaunchFeed
                  coins={AD_COINS}
                  counts={view.counts}
                  cycle={view.cycle}
                  secondsLeft={view.secondsLeft}
                  phase={view.phase}
                  lastBatch={view.lastBatch}
                  batchSize={view.batchSize}
                  onDeckIndex={view.onDeckIndex}
                  total={view.total}
                  online={online}
                  launchBalance={balances ? balances.launch : null}
                />
                <TrustBadges />
              </div>
              <div className="engine-side">
                <DexSpendPanel promo={promo} balanceSol={balances ? balances.dex : null} />
                <AutoRefuelAd
                  launchBalance={balances ? balances.launch : null}
                  threshold={AUTO_TOPUP.thresholdSol}
                  amount={AUTO_TOPUP.amountSol}
                  lastTopUp={snap ? snap.lastTopUp ?? null : null}
                />
                <ChartAd />
                <SideBadges />
              </div>
            </div>
            <BoostedAcross />
            <CoinAddOns />
          </div>
          <div className="col-right">
            <TvAd />
            <XProfileCard />
            <PriceChart />
          </div>
        </div>
      </BrowserChrome>

      <AdPopupLayer popups={popups} onClose={closePopup} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Site pause switch. While SITE_PAUSED is true every visitor sees the Coming
// Soon holding page below instead of the full site. To bring the full site
// back: set SITE_PAUSED = false and redeploy (vercel --prod). Nothing else
// needs to change -- the whole site is gated on this one flag.
const SITE_PAUSED = true;

function ComingSoon() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 18,
        padding: "40px 20px",
        background: "#0b0f14",
        color: "#e8eef5",
        fontFamily: "'Courier New', ui-monospace, monospace",
      }}
    >
      <div style={{ fontSize: 13, letterSpacing: 4, color: "#7a8aa0", textTransform: "uppercase" }}>
        ${ADD_TICKER}
      </div>
      <h1 style={{ margin: 0, fontSize: "clamp(40px, 9vw, 92px)", fontWeight: 800, letterSpacing: 2 }}>
        Coming Soon
      </h1>
      <p style={{ margin: 0, maxWidth: 460, fontSize: 15, lineHeight: 1.5, color: "#aab6c6" }}>
        The coin that lives to promote itself is getting ready. Check back shortly.
      </p>
      <a
        href={X_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          marginTop: 8,
          display: "inline-block",
          background: "#e8eef5",
          color: "#0b0f14",
          fontWeight: 700,
          fontSize: 14,
          padding: "10px 22px",
          borderRadius: 999,
          textDecoration: "none",
        }}
      >
        Follow on X
      </a>
    </main>
  );
}

export default function Page() {
  return SITE_PAUSED ? <ComingSoon /> : <Home />;
}
