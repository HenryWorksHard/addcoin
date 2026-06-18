import { NextResponse } from "next/server";

// Server-side proxy for Solana Tracker. The browser never sees the API key --
// the chart hits THIS route (/api/chart?token=<mint>&type=5m) and we fetch
// Solana Tracker with the key held in SOLANA_TRACKER_API_KEY. Keyed by the token
// MINT, so a single id covers the coin's whole life: pump.fun bonding curve
// (pre-bond) AND the DEX pool after migration (post-bond), one feed.
//
// Returns BOTH the OHLCV candles (for the chart) and a small stats block
// (market cap, 24h volume, liquidity, price) for the readout under it:
//   GET /chart/{token}?type=<interval>  -> { "oclhv": [ {open,close,low,high,volume,time} ] }
//   GET /tokens/{token}                 -> { pools: [ { marketCap:{usd}, liquidity:{usd}, price:{usd}, txns:{volume24h} } ] }
// Candles are ascending by time; `time` is unix seconds. We slice the most recent
// CANDLES rows and normalize. Stats come from the primary (highest-liquidity) pool.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE = "https://data.solanatracker.io";
const CANDLES = 80;
const CACHE_MS = 15000;
const noStore = { "cache-control": "no-store" } as const;

type Candle = { o: number; h: number; l: number; c: number; t: number };
type Stats = {
  marketCap: number | null;
  volume24h: number | null;
  liquidity: number | null;
  price: number | null;
};
type Payload = { candles: Candle[]; stats: Stats | null };
type Row = { open?: number; close?: number; low?: number; high?: number; time?: number };

const cache = new Map<string, { at: number; data: Payload }>();

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// OHLCV candles. Throws on a bad upstream response so the caller can fall back.
async function fetchCandles(token: string, type: string, key: string): Promise<Candle[]> {
  const url = `${BASE}/chart/${encodeURIComponent(token)}?type=${encodeURIComponent(type)}`;
  const res = await fetch(url, { headers: { "x-api-key": key, Accept: "application/json" } });
  if (!res.ok) throw new Error(`upstream-${res.status}`);
  const json = (await res.json()) as { oclhv?: Row[]; ohlcv?: Row[] };
  const rows: Row[] = json?.oclhv ?? json?.ohlcv ?? [];
  return rows
    .map((r) => ({
      o: Number(r.open),
      h: Number(r.high),
      l: Number(r.low),
      c: Number(r.close),
      t: Number(r.time),
    }))
    .filter((c) => Number.isFinite(c.o) && Number.isFinite(c.h) && Number.isFinite(c.l) && Number.isFinite(c.c))
    .slice(-CANDLES);
}

// Market cap / 24h volume / liquidity / price from the primary pool. Best-effort:
// returns null on any failure so a stats hiccup never blanks the chart.
async function fetchStats(token: string, key: string): Promise<Stats | null> {
  try {
    const res = await fetch(`${BASE}/tokens/${encodeURIComponent(token)}`, {
      headers: { "x-api-key": key, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      pools?: Array<{
        marketCap?: { usd?: number };
        liquidity?: { usd?: number };
        price?: { usd?: number };
        txns?: { volume24h?: number };
      }>;
    };
    const p = (j?.pools ?? [])[0];
    if (!p) return null;
    return {
      marketCap: num(p.marketCap?.usd),
      volume24h: num(p.txns?.volume24h),
      liquidity: num(p.liquidity?.usd),
      price: num(p.price?.usd),
    };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const key = (process.env.SOLANA_TRACKER_API_KEY ?? "").trim();
  if (!key) {
    return NextResponse.json({ ok: false, reason: "no-key" }, { headers: noStore });
  }

  const { searchParams } = new URL(req.url);
  const token = (searchParams.get("token") ?? "").trim();
  const type = (searchParams.get("type") ?? "5m").trim();
  if (!token) {
    return NextResponse.json({ ok: false, reason: "no-token" }, { headers: noStore });
  }

  const cacheKey = `${token}:${type}`;
  const now = Date.now();
  const hit = cache.get(cacheKey);
  if (hit && now - hit.at < CACHE_MS) {
    return NextResponse.json(
      { ok: true, candles: hit.data.candles, stats: hit.data.stats, cached: true },
      { headers: noStore }
    );
  }

  try {
    // Candles are required (chart); stats are best-effort (readout). fetchStats
    // never throws, so a stats failure still yields a live chart.
    const [candles, stats] = await Promise.all([
      fetchCandles(token, type, key),
      fetchStats(token, key),
    ]);
    cache.set(cacheKey, { at: now, data: { candles, stats } });
    return NextResponse.json({ ok: true, candles, stats }, { headers: noStore });
  } catch (e) {
    // Transient upstream error: keep serving the last good read if we have one.
    if (hit) {
      return NextResponse.json(
        { ok: true, candles: hit.data.candles, stats: hit.data.stats, stale: true },
        { headers: noStore }
      );
    }
    const reason = e instanceof Error ? e.message : "fetch-error";
    return NextResponse.json({ ok: false, reason }, { headers: noStore });
  }
}
