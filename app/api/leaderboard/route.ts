import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/app/lib/rate-limit";
import {
  cleanName,
  isPlausible,
  sanitise,
  scoreOf,
} from "@/app/lib/leaderboard/scoring";
import { getLeaderboardStore, topEntries } from "@/app/lib/leaderboard/store";
import type { LeaderboardEntry } from "@/app/lib/leaderboard/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOT =
  /bot|crawler|spider|headless|lighthouse|curl|wget|python-requests|axios|monitor/i;

const ipOf = (request: NextRequest): string =>
  request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  request.headers.get("x-real-ip") ||
  "0.0.0.0";

/** GET — the public board. */
export async function GET() {
  const store = getLeaderboardStore();
  if (!store.configured) {
    return NextResponse.json({ configured: false, entries: [] });
  }

  try {
    return NextResponse.json({
      configured: true,
      entries: topEntries(await store.all(), 10),
    });
  } catch {
    return NextResponse.json({ configured: true, entries: [] });
  }
}

/**
 * POST — submit a run.
 *
 * The score is **recomputed server-side** from the submitted components; a
 * `score` field from the client is ignored entirely. Components are clamped
 * to plausible ceilings and then sanity-checked against elapsed time.
 *
 * Worth being honest about the limit: anything a browser can send, a script
 * can forge, so a determined person can still post a good-looking run. These
 * checks stop casual tampering and keep the board from being trivially
 * maxed out — they are not a trust boundary, and the stakes here are a list
 * of nicknames.
 */
export async function POST(request: NextRequest) {
  // Headless and scripted clients are refused: a leaderboard that accepts
  // automated runs stops meaning anything within a day.
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) {
    return NextResponse.json(
      { error: "Automated browsers can't enter the board." },
      { status: 403 },
    );
  }

  const ip = ipOf(request);
  // Three submissions per hour per IP: enough to improve a run, not enough to
  // flood the board.
  if (!rateLimit(`lb:${ip}`, 3, 60 * 60_000).allowed) {
    return NextResponse.json(
      { error: "You've submitted a few times already. Try again later." },
      { status: 429 },
    );
  }

  const store = getLeaderboardStore();
  if (!store.configured) {
    return NextResponse.json(
      { error: "The leaderboard isn't set up on this deployment." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  const name = cleanName(body.name);
  if (!name) {
    // `cleanName` rejects for several reasons (too short after stripping,
    // reserved) and doesn't report which. The message stays accurate for all
    // of them rather than asserting a length problem that may not be the one.
    return NextResponse.json(
      { error: "That name won't work — try another, 2 to 12 characters." },
      { status: 400 },
    );
  }

  const parts = sanitise(body as never);
  if (!isPlausible(parts)) {
    return NextResponse.json(
      { error: "That run doesn't look real." },
      { status: 400 },
    );
  }

  const entry: LeaderboardEntry = {
    id: randomUUID(),
    name,
    score: scoreOf(parts),
    pages: parts.pages,
    sections: parts.sections,
    projects: parts.projects,
    distance: parts.distance,
    at: Date.now(),
  };

  try {
    await store.add(entry);
  } catch {
    return NextResponse.json(
      { error: "Couldn't save that. Try again." },
      { status: 500 },
    );
  }

  const entries = topEntries(await store.all(), 10);
  const rank = entries.findIndex((e) => e.id === entry.id);

  return NextResponse.json({
    entries,
    rank: rank >= 0 ? rank + 1 : null,
    you: entry,
  });
}
