import { getStore, lastDays } from "./store";
import type { AnalyticsEvent, Summary } from "./types";

/** Count occurrences and return the top N as sorted rows. */
const topBy = <K extends string>(
  events: AnalyticsEvent[],
  pick: (e: AnalyticsEvent) => string | null | undefined,
  key: K,
  limit = 8,
): ({ [P in K]: string } & { views: number })[] => {
  const counts = new Map<string, number>();

  for (const event of events) {
    const value = pick(event);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, views]) => ({ [key]: value, views }) as { [P in K]: string } & {
      views: number;
    });
};

const mean = (values: number[]): number =>
  values.length === 0
    ? 0
    : Math.round(values.reduce((a, b) => a + b, 0) / values.length);

/** Referrers from this site aren't referrals — collapse them to "direct". */
const normalizeReferrer = (referrer: string | null | undefined): string => {
  if (!referrer) return "direct";
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host.includes("localhost") ? "direct" : host;
  } catch {
    return "direct";
  }
};

export const buildSummary = async (days = 30): Promise<Summary> => {
  const store = getStore();
  const keys = lastDays(days);

  if (!store.configured) {
    return emptySummary(store.name, keys);
  }

  const events = await store.range(keys);
  const views = events.filter((e) => e.type === "view");
  const engagements = events.filter((e) => e.type === "engage");
  const outbound = events.filter((e) => e.type === "outbound");

  // Per-day timeline, zero-filled so the chart has no gaps.
  const byDay = new Map<string, { views: number; visitors: Set<string> }>();
  for (const key of keys) byDay.set(key, { views: 0, visitors: new Set() });

  for (const event of views) {
    const key = new Date(event.ts).toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    bucket.views += 1;
    bucket.visitors.add(event.visitor);
  }

  // Dwell is measured per pageview, so average it per path too.
  const dwellByPath = new Map<string, number[]>();
  for (const event of engagements) {
    if (typeof event.dwellMs !== "number") continue;
    const list = dwellByPath.get(event.path) ?? [];
    list.push(event.dwellMs);
    dwellByPath.set(event.path, list);
  }

  const topPages = topBy(views, (e) => e.path, "path", 10).map((row) => ({
    path: row.path,
    views: row.views,
    avgDwellSeconds: Math.round(mean(dwellByPath.get(row.path) ?? []) / 1000),
  }));

  return {
    configured: true,
    storage: store.name,
    range: { from: keys[0], to: keys[keys.length - 1] },
    totals: {
      views: views.length,
      visitors: new Set(views.map((e) => e.visitor)).size,
      avgDwellSeconds: Math.round(
        mean(engagements.map((e) => e.dwellMs ?? 0)) / 1000,
      ),
      avgScrollDepth: mean(engagements.map((e) => e.scrollDepth ?? 0)),
      outboundClicks: outbound.length,
    },
    timeline: keys.map((date) => ({
      date,
      views: byDay.get(date)?.views ?? 0,
      visitors: byDay.get(date)?.visitors.size ?? 0,
    })),
    topPages,
    topReferrers: topBy(views, (e) => normalizeReferrer(e.referrer), "referrer").map(
      (row) => ({ referrer: row.referrer, views: row.views }),
    ),
    countries: topBy(views, (e) => e.country ?? "unknown", "country").map((row) => ({
      country: row.country,
      views: row.views,
    })),
    devices: topBy(views, (e) => e.device, "device", 3).map((row) => ({
      device: row.device,
      views: row.views,
    })),
    outbound: topBy(outbound, (e) => e.href, "href").map((row) => ({
      href: row.href,
      clicks: row.views,
    })),
  };
};

/** Honest empty state — see PLAN.md §11.3. Zeros here are *known* zeros. */
const emptySummary = (storage: string, keys: string[]): Summary => ({
  configured: false,
  storage,
  range: { from: keys[0], to: keys[keys.length - 1] },
  totals: {
    views: 0,
    visitors: 0,
    avgDwellSeconds: 0,
    avgScrollDepth: 0,
    outboundClicks: 0,
  },
  timeline: keys.map((date) => ({ date, views: 0, visitors: 0 })),
  topPages: [],
  topReferrers: [],
  countries: [],
  devices: [],
  outbound: [],
});
