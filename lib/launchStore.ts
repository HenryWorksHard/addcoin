// Shared launch store (server / worker only).
//
// Two backends, chosen by env at runtime:
//   - Supabase  (when SUPABASE_URL + a key are set) -- used in production so the
//     always-on worker and the Vercel site share one source of truth.
//   - Local fs  (otherwise) -- worker/status.json + worker/launches.jsonl, for
//     local dev with no database.
//
// The worker writes; the Next API route (app/api/launches) reads. The browser
// must NEVER import this module -- it fetches /api/launches. The Supabase key
// stays server-side (worker env + Vercel env); it is never sent to the client.

import { readFile, writeFile, mkdir, rename, appendFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LaunchRecord = {
  ts: string;
  mode: string;
  cycle: number;
  coinId: string;
  name: string;
  symbol: string;
  mint: string;
  signature: string;
  uri: string | null;
};

export type LaunchStatus = {
  mode: string;
  // The engine fires the whole book as one simultaneous batch: "launching" while
  // it is in flight, "launched" for a brief hold after, then "counting" until the
  // next one.
  phase: "counting" | "launching" | "launched";
  onDeckIndex: number;
  cycle: number;
  total: number;
  counts: Record<string, number>;
  // Coins minted per batch (the engine launches all of them at the same time).
  batchSize: number;
  lastLaunch: { id: string; name: string; symbol: string; mint: string; at: number } | null;
  // The most recent batch's successful mints (newest batch only).
  lastBatch: { id: string; name: string; symbol: string; mint: string; at: number }[] | null;
  // Epoch ms the next batch is expected (set while counting). The site derives
  // the live countdown from this; null while a batch is in flight.
  nextLaunchAt: number | null;
  intervalMs: number;
  // Most recent auto-refuel (dex -> launch wallet), so the site's "auto-refuel"
  // ad can show the last top-up. null until the first refuel fires.
  lastTopUp?: { amountSol: number; sig: string | null; at: number } | null;
  updatedAt: number;
};

// Read env lazily (at call time), NOT at module load. The worker loads .env.local
// via dotenv at startup, but ES `import` hoisting evaluates this module before that
// runs -- so module-level env reads would be empty in the worker. Functions are
// only called from inside main() (after dotenv), so lazy reads always see the env.
function sb(): { url: string; key: string; on: boolean } {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
  return { url, key, on: Boolean(url && key) };
}

const DIR = path.join(process.cwd(), "worker");
const STATUS_FILE = path.join(DIR, "status.json");
const LOG_FILE = path.join(DIR, "launches.jsonl");

let _client: SupabaseClient | null = null;
async function client(): Promise<SupabaseClient> {
  if (_client) return _client;
  const { createClient } = await import("@supabase/supabase-js");
  const { url, key } = sb();
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

export async function writeStatus(s: LaunchStatus): Promise<void> {
  if (sb().on) {
    const c = await client();
    const { error } = await c
      .from("engine_status")
      .upsert({ id: 1, data: s, updated_at: new Date(s.updatedAt).toISOString() });
    if (error) throw new Error(`writeStatus: ${error.message}`);
    return;
  }
  await mkdir(DIR, { recursive: true });
  const tmp = `${STATUS_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(s));
  await rename(tmp, STATUS_FILE);
}

export async function readStatus(): Promise<LaunchStatus | null> {
  if (sb().on) {
    const c = await client();
    const { data, error } = await c
      .from("engine_status")
      .select("data")
      .eq("id", 1)
      .maybeSingle();
    if (error) return null;
    return (data?.data as LaunchStatus) ?? null;
  }
  try {
    return JSON.parse(await readFile(STATUS_FILE, "utf8")) as LaunchStatus;
  } catch {
    return null;
  }
}

export async function appendLaunch(rec: LaunchRecord): Promise<void> {
  if (sb().on) {
    const c = await client();
    const { error } = await c.from("launches").insert({
      ts: rec.ts,
      mode: rec.mode,
      cycle: rec.cycle,
      coin_id: rec.coinId,
      name: rec.name,
      symbol: rec.symbol,
      mint: rec.mint,
      signature: rec.signature,
      uri: rec.uri,
    });
    if (error) throw new Error(`appendLaunch: ${error.message}`);
    return;
  }
  await mkdir(DIR, { recursive: true });
  await appendFile(LOG_FILE, JSON.stringify(rec) + "\n");
}

export async function readRecent(limit = 12): Promise<LaunchRecord[]> {
  if (sb().on) {
    const c = await client();
    const { data, error } = await c
      .from("launches")
      .select("*")
      .order("id", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as Array<Record<string, unknown>>).map((r) => ({
      ts: String(r.ts ?? ""),
      mode: String(r.mode ?? ""),
      cycle: Number(r.cycle ?? 0),
      coinId: String(r.coin_id ?? ""),
      name: String(r.name ?? ""),
      symbol: String(r.symbol ?? ""),
      mint: String(r.mint ?? ""),
      signature: String(r.signature ?? ""),
      uri: (r.uri as string | null) ?? null,
    }));
  }
  try {
    const raw = await readFile(LOG_FILE, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .slice(-limit)
      .map((l) => JSON.parse(l) as LaunchRecord)
      .reverse();
  } catch {
    return [];
  }
}

// Local fs only. For the Supabase backend the row keeps the last snapshot and
// the site falls back to idle/sim after LIVE_STALE_MS, so there is nothing to
// clear synchronously here.
export function clearStatusSync(): void {
  try {
    rmSync(STATUS_FILE, { force: true });
  } catch {
    // best effort
  }
}
