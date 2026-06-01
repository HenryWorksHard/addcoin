"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BrowserChrome from "./components/BrowserChrome";
import {
  GeoHeader,
  WelcomeBar,
  ActionButtons,
  ContractPanel,
  BoostedAcross,
  NewAndNotable,
  CoinAddOns,
} from "./components/StaticSections";
import LaunchFeed from "./components/LaunchFeed";
import AdPopupLayer, { ActivePopup } from "./components/AdPopups";
import {
  FeedEvent,
  AddStats,
  seedFeed,
  makeLaunch,
  makeBoost,
  makeAd,
  initialAddStats,
  pick,
  randInt,
  formatSol,
  POPUP_REASONS,
} from "@/lib/coins";

const LAUNCH_INTERVAL = 10000;
const POPUP_INTERVAL = 9000;
const MAX_FEED = 20;
const MAX_POPUPS = 3;
const POPUP_TTL = 24000;

export default function Home() {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [treasury, setTreasury] = useState(0);
  const [add, setAdd] = useState<AddStats>(initialAddStats);
  const [now, setNow] = useState(0);
  const [lastLaunchAt, setLastLaunchAt] = useState(0);
  const [adBlock, setAdBlock] = useState(false);
  const [blocked, setBlocked] = useState(0);
  const [popups, setPopups] = useState<ActivePopup[]>([]);

  const adBlockRef = useRef(adBlock);
  const treasuryRef = useRef(0);
  const addRef = useRef<AddStats>(initialAddStats());
  const launchCountRef = useRef(0);
  const popupCreatedAt = useRef<Record<string, number>>({});

  useEffect(() => {
    adBlockRef.current = adBlock;
  }, [adBlock]);

  // Seed after mount to avoid SSR/client random mismatch.
  useEffect(() => {
    const seeded = seedFeed(12);
    setEvents(seeded.events);
    setTreasury(seeded.treasury);
    treasuryRef.current = seeded.treasury;
    const a = initialAddStats();
    setAdd(a);
    addRef.current = a;
    const t0 = Date.now();
    setNow(t0);
    setLastLaunchAt(t0);
  }, []);

  // 1s heartbeat: refresh ages + countdown, expire stale popups.
  useEffect(() => {
    const t = setInterval(() => {
      const t0 = Date.now();
      setNow(t0);
      setPopups((prev) =>
        prev.filter((p) => t0 - (popupCreatedAt.current[p.id] ?? t0) < POPUP_TTL)
      );
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-launch every 10s; every 4th launch also spends from the war chest.
  useEffect(() => {
    const t = setInterval(() => {
      const at = Date.now();
      launchCountRef.current += 1;
      const n = launchCountRef.current;

      let treasuryNext = treasuryRef.current;
      const fresh: FeedEvent[] = [];

      const launch = makeLaunch(at, treasuryNext);
      treasuryNext = launch.treasury;
      fresh.push(launch);

      if (n % 4 === 0) {
        const spend =
          n % 8 === 0 ? makeAd(at + 1, treasuryNext) : makeBoost(at + 1, treasuryNext);
        treasuryNext = spend.treasury;
        fresh.push(spend);

        // A promo spend lifts $ADD.
        const a = addRef.current;
        const factor = 1 + randInt(2, 9) / 100;
        const nextAdd: AddStats = {
          price: a.price * factor,
          marketCap: Math.round(a.marketCap * factor),
          change24h: a.change24h + randInt(1, 5),
        };
        addRef.current = nextAdd;
        setAdd(nextAdd);
      }

      treasuryRef.current = treasuryNext;
      setTreasury(treasuryNext);
      setEvents((prev) => [...fresh.reverse(), ...prev].slice(0, MAX_FEED));
      setLastLaunchAt(at);
    }, LAUNCH_INTERVAL);
    return () => clearInterval(t);
  }, []);

  const spawnPopup = useCallback(() => {
    if (adBlockRef.current) {
      setBlocked((b) => b + 1);
      return;
    }
    setPopups((prev) => {
      if (prev.length >= MAX_POPUPS) return prev;
      const a = addRef.current;
      const reason = pick(POPUP_REASONS);
      const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
      const vh = typeof window !== "undefined" ? window.innerHeight : 700;
      const left = Math.max(12, Math.floor(Math.random() * Math.max(40, vw - 320)));
      const top = Math.max(54, Math.floor(Math.random() * Math.max(80, vh - 360)));
      const id = `pop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      popupCreatedAt.current[id] = Date.now();
      return [
        ...prev,
        { id, reason, marketCap: a.marketCap, change: a.change24h, top, left },
      ];
    });
  }, []);

  // Periodically open a pop-up ad.
  useEffect(() => {
    const first = setTimeout(spawnPopup, 3500);
    const t = setInterval(spawnPopup, POPUP_INTERVAL);
    return () => {
      clearTimeout(first);
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

  const countdown = lastLaunchAt
    ? Math.max(0, Math.ceil((lastLaunchAt + LAUNCH_INTERVAL - now) / 1000))
    : 10;
  const latest = events[0];

  let statusMid: string;
  if (adBlock) {
    statusMid = `Ad Blocker: ON  -  ${blocked} pop-up(s) blocked`;
  } else if (latest?.kind === "boost") {
    statusMid = `War chest ${formatSol(treasury)}  -  buying ${latest.title} ...`;
  } else if (latest?.kind === "ad") {
    statusMid = `War chest ${formatSol(treasury)}  -  placing ${latest.title} ...`;
  } else if (latest) {
    statusMid = `War chest ${formatSol(treasury)}  -  ${latest.title} ...`;
  } else {
    statusMid = "Connecting...";
  }

  return (
    <>
      <BrowserChrome url="https://www.addcoin.sol/" statusLeft="Done" statusMid={statusMid}>
        <GeoHeader />
        <WelcomeBar add={add} adBlock={adBlock} onToggle={toggleAdBlock} blocked={blocked} />
        <ActionButtons />
        <div className="body-grid">
          <div className="col-left">
            <ContractPanel />
            <LaunchFeed
              events={events}
              now={now}
              countdown={countdown}
              treasury={treasury}
              add={add}
            />
            <BoostedAcross />
            <CoinAddOns />
          </div>
          <NewAndNotable />
        </div>
      </BrowserChrome>

      <AdPopupLayer popups={popups} onClose={closePopup} />
    </>
  );
}
