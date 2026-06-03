"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ADD_POOL,
  GECKO_NETWORK,
  CHART_TIMEFRAME,
  CHART_AGGREGATE,
} from "@/lib/coins";

type Candle = { o: number; h: number; l: number; c: number };

const CANDLES = 24;
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

// Pull real OHLCV from GeckoTerminal once a pool exists. Returns null (and the
// chart keeps simulating) if the pool is unset, not yet indexed, or the request
// fails. Rows arrive newest-first as [ts, o, h, l, c, v]; we reverse to oldest-left.
async function fetchCandles(): Promise<Candle[] | null> {
  if (!ADD_POOL) return null;
  try {
    const url =
      `https://api.geckoterminal.com/api/v2/networks/${GECKO_NETWORK}` +
      `/pools/${ADD_POOL}/ohlcv/${CHART_TIMEFRAME}` +
      `?aggregate=${CHART_AGGREGATE}&limit=${CANDLES}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = await res.json();
    const list: number[][] = json?.data?.attributes?.ohlcv_list ?? [];
    if (!list.length) return null;
    return list
      .slice()
      .reverse()
      .map((r) => ({ o: r[1], h: r[2], l: r[3], c: r[4] }));
  } catch {
    return null;
  }
}

const W = 252;
const H = 116;
const PAD = 5;

export default function PriceChart() {
  const [, render] = useState(0);
  const dataRef = useRef<{ candles: Candle[]; price: number; sub: number } | null>(
    null
  );

  // Seed after mount (so server/client randomness can't diverge). The chart
  // always bootstraps with a simulated walk; if a pool is configured it polls
  // GeckoTerminal and switches to real candles the moment data is available.
  useEffect(() => {
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

    if (ADD_POOL) {
      const poll = async () => {
        const real = await fetchCandles();
        if (cancelled || !real || !real.length) return;
        if (!live) {
          live = true;
          if (simTimer) {
            clearInterval(simTimer);
            simTimer = null;
          }
        }
        dataRef.current = {
          candles: real,
          price: real[real.length - 1].c,
          sub: 0,
        };
        render((n) => n + 1);
      };
      poll();
      pollTimer = setInterval(poll, POLL_MS);
    }

    return () => {
      cancelled = true;
      if (simTimer) clearInterval(simTimer);
      if (pollTimer) clearInterval(pollTimer);
    };
  }, []);

  const data = dataRef.current;

  return (
    <div className="chart-panel">
      <div className="chart-head">
        <span className="chart-pair">$AdFund / SOL</span>
        <span className="chart-tf">5m</span>
        <span className="chart-live">
          <i aria-hidden />
          LIVE
        </span>
      </div>

      {data ? (
        <ChartBody candles={data.candles} price={data.price} />
      ) : (
        <div className="chart-svg-wrap" style={{ height: H }} />
      )}
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
