export type EventType = "view" | "engage" | "outbound";

/** One recorded signal. Deliberately small — this is written on every visit. */
export type AnalyticsEvent = {
  id: string;
  type: EventType;
  path: string;
  ts: number;
  /** Daily-rotating salted hash. Distinguishes visitors within a day only. */
  visitor: string;
  referrer?: string | null;
  country?: string | null;
  device?: "mobile" | "tablet" | "desktop";
  screen?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  /** `engage` only */
  dwellMs?: number;
  scrollDepth?: number;
  /** `outbound` only */
  href?: string;
};

export type Totals = {
  views: number;
  visitors: number;
  avgDwellSeconds: number;
  avgScrollDepth: number;
  outboundClicks: number;
};

export type Summary = {
  configured: boolean;
  storage: string;
  range: { from: string; to: string };
  totals: Totals;
  /** Views per day, oldest first. */
  timeline: { date: string; views: number; visitors: number }[];
  topPages: { path: string; views: number; avgDwellSeconds: number }[];
  topReferrers: { referrer: string; views: number }[];
  countries: { country: string; views: number }[];
  devices: { device: string; views: number }[];
  outbound: { href: string; clicks: number }[];
};
