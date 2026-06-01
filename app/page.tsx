"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BrowserChrome from "./components/BrowserChrome";
import {
  GeoHeader,
  WelcomeBar,
  ActionButtons,
  SearchCoins,
  ExploreCategories,
  NewAndNotable,
  CoinAddOns,
} from "./components/StaticSections";
import LaunchFeed from "./components/LaunchFeed";
import AdPopupLayer, { ActivePopup } from "./components/AdPopups";
import { Coin, generateCoin, seedCoins, shortAddress } from "@/lib/coins";

const LAUNCH_INTERVAL = 10000;
const POPUP_INTERVAL = 9000;
const MAX_FEED = 20;
const MAX_POPUPS = 3;
const POPUP_TTL = 24000;

export default function Home() {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [now, setNow] = useState(0);
  const [lastLaunchAt, setLastLaunchAt] = useState(0);
  const [adBlock, setAdBlock] = useState(false);
  const [blocked, setBlocked] = useState(0);
  const [popups, setPopups] = useState<ActivePopup[]>([]);

  const adBlockRef = useRef(adBlock);
  const coinsRef = useRef<Coin[]>([]);
  const popupCreatedAt = useRef<Record<string, number>>({});

  useEffect(() => {
    adBlockRef.current = adBlock;
  }, [adBlock]);
  useEffect(() => {
    coinsRef.current = coins;
  }, [coins]);

  // Seed after mount to avoid SSR/client random mismatch.
  useEffect(() => {
    const seeded = seedCoins(9);
    setCoins(seeded);
    coinsRef.current = seeded;
    setNow(Date.now());
    setLastLaunchAt(Date.now());
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

  // Launch a new coin every 10s.
  useEffect(() => {
    const t = setInterval(() => {
      const coin = generateCoin(Date.now());
      setCoins((prev) => [coin, ...prev].slice(0, MAX_FEED));
      setLastLaunchAt(Date.now());
    }, LAUNCH_INTERVAL);
    return () => clearInterval(t);
  }, []);

  const spawnPopup = useCallback(() => {
    const list = coinsRef.current;
    if (list.length === 0) return;
    if (adBlockRef.current) {
      setBlocked((b) => b + 1);
      return;
    }
    setPopups((prev) => {
      if (prev.length >= MAX_POPUPS) return prev;
      const coin = list[Math.floor(Math.random() * Math.min(3, list.length))];
      const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
      const vh = typeof window !== "undefined" ? window.innerHeight : 700;
      const left = Math.max(12, Math.floor(Math.random() * Math.max(40, vw - 320)));
      const top = Math.max(54, Math.floor(Math.random() * Math.max(80, vh - 360)));
      const id = `pop-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      popupCreatedAt.current[id] = Date.now();
      return [...prev, { id, coin, top, left }];
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
  const latest = coins[0];

  return (
    <>
      <BrowserChrome
        url="https://www.addcoin.sol/"
        statusLeft="Done"
        statusMid={
          adBlock
            ? `Ad Blocker: ON  -  ${blocked} pop-up(s) blocked`
            : latest
              ? `Opening  https://pump.fun/coin/${shortAddress(latest.contract)} ...`
              : "Connecting..."
        }
      >
        <GeoHeader />
        <WelcomeBar adBlock={adBlock} onToggle={toggleAdBlock} blocked={blocked} />
        <ActionButtons />
        <div className="body-grid">
          <div className="col-left">
            <SearchCoins />
            <LaunchFeed coins={coins} now={now} countdown={countdown} />
            <ExploreCategories />
            <CoinAddOns />
          </div>
          <NewAndNotable />
        </div>
      </BrowserChrome>

      <AdPopupLayer popups={popups} onClose={closePopup} />
    </>
  );
}
