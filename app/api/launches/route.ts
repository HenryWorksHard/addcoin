import { NextResponse } from "next/server";
import { readStatus, readRecent } from "@/lib/launchStore";

// Always read fresh off disk; never cache. Node runtime (needs node:fs).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [status, recent] = await Promise.all([readStatus(), readRecent(12)]);
  return NextResponse.json(
    { ok: !!status, status, recent },
    { headers: { "cache-control": "no-store" } }
  );
}
