import { createHash, randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getStore } from "@/app/lib/analytics/store";
import type { AnalyticsEvent, EventType } from "@/app/lib/analytics/types";
import { rateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";
/** Never cached — this endpoint only writes. */
export const dynamic = "force-dynamic";

/**
 * Public telemetry ingest.
 *
 * This is the only unauthenticated write path on the site, so it is the one
 * that matters most (PLAN.md §6.4). It validates shape, caps size, filters
 * bots, rate-limits per IP, and always answers 204 — an attacker learns
 * nothing from the response, and a legitimate visitor never sees an error.
 */

const MAX_BODY = 2048;
const VALID_TYPES: EventType[] = ["view", "engage", "outbound"];

const BOT = /bot|crawler|spider|crawling|headless|lighthouse|preview|slurp|curl|wget|python-requests|axios|monitor|pingdom|gtmetrix/i;

/** Rotates daily and is never stored, so a visitor hash can't be reversed
 *  or correlated across days. Cookieless by construction. */
const visitorHash = (ip: string, ua: string): string => {
  const salt = process.env.ANALYTICS_SALT ?? "yuvraaj-portfolio-local-salt";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256")
    .update(`${salt}|${day}|${ip}|${ua}`)
    .digest("hex")
    .slice(0, 16);
};

const deviceFrom = (ua: string): AnalyticsEvent["device"] => {
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  if (/Mobile|Android|iPhone/i.test(ua)) return "mobile";
  return "desktop";
};

/** Keep paths bounded and strip query strings, which can carry PII. */
const cleanPath = (value: unknown): string | null => {
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  return value.split(/[?#]/)[0].slice(0, 200);
};

const clampNumber = (value: unknown, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : undefined;

export async function POST(request: NextRequest) {
  // Always 204: success, rejection, and failure are indistinguishable.
  const ok = new NextResponse(null, { status: 204 });

  try {
    const ua = request.headers.get("user-agent") ?? "";
    if (!ua || BOT.test(ua)) return ok;

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "0.0.0.0";

    if (!rateLimit(`collect:${ip}`, 120, 60_000).allowed) return ok;

    const raw = await request.text();
    if (raw.length > MAX_BODY) return ok;

    const body = JSON.parse(raw) as Record<string, unknown>;

    const type = body.type as EventType;
    if (!VALID_TYPES.includes(type)) return ok;

    const path = cleanPath(body.path);
    if (!path) return ok;

    const event: AnalyticsEvent = {
      id: randomUUID(),
      type,
      path,
      ts: Date.now(),
      visitor: visitorHash(ip, ua),
      referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 200) : null,
      // Vercel injects geo headers at the edge; absent locally.
      country: request.headers.get("x-vercel-ip-country"),
      device: deviceFrom(ua),
      screen: typeof body.screen === "string" ? body.screen.slice(0, 20) : undefined,
      utmSource: typeof body.utmSource === "string" ? body.utmSource.slice(0, 60) : undefined,
      utmMedium: typeof body.utmMedium === "string" ? body.utmMedium.slice(0, 60) : undefined,
      utmCampaign: typeof body.utmCampaign === "string" ? body.utmCampaign.slice(0, 60) : undefined,
      dwellMs: clampNumber(body.dwellMs, 0, 3_600_000),
      scrollDepth: clampNumber(body.scrollDepth, 0, 100),
      href: typeof body.href === "string" ? body.href.slice(0, 300) : undefined,
    };

    await getStore().append(event);
  } catch {
    /* swallow — telemetry must never surface an error */
  }

  return ok;
}
