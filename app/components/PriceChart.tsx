"use client";

import React, { useEffect, useRef, useState } from "react";
import { ADD_MINT, CHART_TYPE } from "@/lib/coins";

type Candle = { o: number; h: number; l: number; c: number };
type Stats = {
  marketCap: number | null;
  volume24h: number | null;
  liquidity: number | null;
  price: number | null;
};

const CANDLES = 60;
const TICK_MS = 650;
const POLL_MS = 20000;
const TICKS_PER_CANDLE = 4;
const START = 0.00042;

// Upward-biased random walk -- $AdFund only goes one way.
function step(price: number): number {
  const drift = 0.0016;
  const vol = 0.018;
  const next = price * (1 + drift + (Math.random() - 0.5) * vol);
  return Math.max(next, price * 0.6);
}

function fmtPrice(p: number): string {
  return `$${p.toFixed(6)}`;
}

// Compact USD for the stat strip: $1.24B / $410M / $315K / $42.
function fmtUsd(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return "--";
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

// Pull real OHLCV + stats from our server-side Solana Tracker proxy (/api/chart),
// keyed by the token MINT so it covers pre-bond (pump.fun curve) and post-bond
// (DEX) in one feed. Returns null (chart keeps simulating) if the mint is unset,
// not yet indexed, or the request fails.
async function fetchChart(): Promise<{ candles: Candle[]; stats: Stats | null } | null> {
  if (!ADD_MINT) return null;
  try {
    const url =
      `/api/chart?token=${encodeURIComponent(ADD_MINT)}` +
      `&type=${encodeURIComponent(CHART_TYPE)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.ok || !Array.isArray(json.candles) || !json.candles.length) return null;
    const candles = (json.candles as Candle[])
      .slice(-CANDLES)
      .map((r) => ({ o: r.o, h: r.h, l: r.l, c: r.c }));
    return { candles, stats: (json.stats as Stats) ?? null };
  } catch {
    return null;
  }
}

const W = 600;
const H = 280;
const PAD = 6;

export default function PriceChart() {
  const [, render] = useState(0);
  const dataRef = useRef<{ candles: Candle[]; price: number; sub: number } | null>(null);
  const statsRef = useRef<Stats | null>(null);

  // Seed after mount (so server/client randomness can't diverge). The chart
  // always bootstraps with a simulated walk; once a mint is configured it polls
  // /api/chart and switches to real candles + stats the moment data is available.
  useEffect(() => {
    // No mint yet -> the chart is "TBA", so don't simulate or poll anything.
    // The moment ADD_MINT is set at launch this effect bootstraps + goes live.
    if (!ADD_MINT) return;

    let cancelled = false;
    let simTimer: ReturnType<typeof setInterval> | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let live = false;

    let p = START;
    const candles: Candle[] = [];
    for (let i = 0; i < CANDLES - 1; i++) {
      const o = p;
      let h = p;
      let l = p;
      let c = p;
      for (let k = 0; k < TICKS_PER_CANDLE; k++) {
        c = step(c);
        h = Math.max(h, c);
        l = Math.min(l, c);
      }
      candles.push({ o, h, l, c });
      p = c;
    }
    candles.push({ o: p, h: p, l: p, c: p });
    dataRef.current = { candles, price: p, sub: 0 };
    render((n) => n + 1);

    simTimer = setInterval(() => {
      if (live) return;
      const d = dataRef.current;
      if (!d) return;
      const next = step(d.price);
      d.price = next;
      const last = d.candles[d.candles.length - 1];
      last.c = next;
      last.h = Math.max(last.h, next);
      last.l = Math.min(last.l, next);
      d.sub += 1;
      if (d.sub >= TICKS_PER_CANDLE) {
        d.sub = 0;
        d.candles.push({ o: next, h: next, l: next, c: next });
        if (d.candles.length > CANDLES) d.candles.shift();
      }
      render((n) => n + 1);
    }, TICK_MS);

    const poll = async () => {
      const real = await fetchChart();
      if (cancelled || !real || !real.candles.length) return;
      if (!live) {
        live = true;
        if (simTimer) {
          clearInterval(simTimer);
          simTimer = null;
        }
      }
      dataRef.current = {
        candles: real.candles,
        price: real.candles[real.candles.length - 1].c,
        sub: 0,
      };
      statsRef.current = real.stats;
      render((n) => n + 1);
    };
    poll();
    pollTimer = setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      if (simTimer) clearInterval(simTimer);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  const data = dataRef.current;
  const stats = statsRef.current;

  return (
    <div className="chart-panel">
      <div className="chart-head">
        <span className="chart-pair">$AdFund / SOL</span>
        <span className="chart-tf">{CHART_TYPE}</span>
        {ADD_MINT ? (
          <span className="chart-live">
            <i aria-hidden />
            LIVE
          </span>
        ) : (
          <span className="chart-soon">TBA</span>
        )}
      </div>

      {!ADD_MINT ? (
        <div className="chart-tba">
          <div className="chart-tba-big">TBA</div>
          <div className="chart-tba-sub">live chart unlocks at launch</div>
        </div>
      ) : data ? (
        <ChartBody candles={data.candles} price={data.price} />
      ) : (
        <div className="chart-svg-wrap" />
      )}

      {/* Market cap / 24h volume / liquidity -- live from Solana Tracker once a
          mint is set; "--" until then. Always rendered so the panel keeps a
          stable height. */}
      <div className="chart-stats">
        <div className="chart-stat">
          <span className="cs-k">MCAP</span>
          <span className="cs-v">{fmtUsd(stats?.marketCap)}</span>
        </div>
        <div className="chart-stat">
          <span className="cs-k">VOL 24H</span>
          <span className="cs-v">{fmtUsd(stats?.volume24h)}</span>
        </div>
        <div className="chart-stat">
          <span className="cs-k">LIQ</span>
          <span className="cs-v">{fmtUsd(stats?.liquidity)}</span>
        </div>
      </div>
    </div>
  );
}

function ChartBody({ candles, price }: { candles: Candle[]; price: number }) {
  let min = Infinity;
  let max = -Infinity;
  for (const c of candles) {
    if (c.l < min) min = c.l;
    if (c.h > max) max = c.h;
  }
  if (!isFinite(min) || !isFinite(max) || min === max) {
    min = price * 0.99;
    max = price * 1.01;
  }
  const range = max - min || 1;
  const y = (v: number) => PAD + (H - 2 * PAD) * (1 - (v - min) / range);

  const n = candles.length;
  const slot = W / n;
  const cw = Math.max(2, slot * 0.6);

  const first = candles[0].o;
  const chg = ((price - first) / first) * 100;
  const up = chg >= 0;
  const priceY = y(price);

  return (
    <>
      <div className="chart-price-row">
        <span className="chart-price">{fmtPrice(price)}</span>
        <span className={`chart-chg ${up ? "up" : "down"}`}>
          {up ? "+" : ""}
          {chg.toFixed(2)}%
        </span>
      </div>

      <div className="chart-svg-wrap">
        <svg
          className="chart-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Live $AdFund price chart"
        >
          {[0.25, 0.5, 0.75].map((g) => (
            <line
              key={g}
              x1={0}
              x2={W}
              y1={PAD + (H - 2 * PAD) * g}
              y2={PAD + (H - 2 * PAD) * g}
              className="chart-grid"
            />
          ))}

          {candles.map((c, i) => {
            const cx = slot * i + slot / 2;
            const isUp = c.c >= c.o;
            const top = y(Math.max(c.o, c.c));
            const bot = y(Math.min(c.o, c.c));
            const bodyH = Math.max(1, bot - top);
            const cls = isUp ? "up" : "down";
            return (
              <g key={i} className={`candle ${cls}`}>
                <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} className="wick" />
                <rect x={cx - cw / 2} y={top} width={cw} height={bodyH} className="body" />
              </g>
            );
          })}

          <line
            x1={0}
            x2={W}
            y1={priceY}
            y2={priceY}
            className={`chart-last ${up ? "up" : "down"}`}
          />
        </svg>
      </div>
    </>
  );
}
