import type { Observation, VerdictTier } from "./types";

/**
 * Scoring and verdict logic.
 *
 * Deliberately pure and DOM-free so the ladder can be unit-tested at its tier
 * boundaries without a browser — the boundaries are the only part of this
 * feature where an off-by-one is both easy and embarrassing (a visitor sitting
 * at 95% who never sees the payoff).
 */

/** Physical conversions, at the CSS reference of 96px per inch. */
const METRES_PER_PX = 0.0254 / 96;
/** One storey ≈ 3 metres. */
const METRES_PER_STOREY = 3;

export const pxToMetres = (px: number): number => px * METRES_PER_PX;
export const pxToStoreys = (px: number): number =>
  pxToMetres(px) / METRES_PER_STOREY;

/**
 * Engagement, 0–100.
 *
 * Each signal saturates independently so no single one can carry the score —
 * someone who parks the tab and walks away accumulates time but not travel,
 * attention or curiosity, and tops out around 25.
 */
export const score = (o: Observation): number => {
  const saturate = (value: number, full: number) =>
    Math.min(1, Math.max(0, value / full));

  // Attention is dwell *minus* idle: time present but not thinking at it
  // shouldn't count the same as time spent reading.
  const activeMs = Math.max(0, o.observedMs - o.idleMs);

  const parts: [number, number][] = [
    // [normalised value, weight]
    [saturate(activeMs, 180_000), 30], // ~3 min of active time
    [saturate(pxToMetres(o.cursorPx), 25), 20], // ~25 m of cursor travel
    [saturate(pxToStoreys(o.descentPx), 8), 20], // ~8 storeys of scrolling
    [saturate(o.longestDwell?.ms ?? 0, 45_000), 15], // 45 s in one section
    [saturate(o.revisits?.count ?? 0, 3), 15], // returning to a project 3×
  ];

  const total = parts.reduce((sum, [value, weight]) => sum + value * weight, 0);
  return Math.round(Math.min(100, total));
};

/**
 * Ordered low → high. `verdictFor` scans from the top.
 *
 * Written as things a person would actually say. The earlier set
 * ("OBSERVING", "HIGHLY ENGAGED", "RECOMMENDATION: SAY HELLO") read like a
 * clinical trial report — technically on-theme, but cold, and the whole point
 * of this is to be likeable.
 */
export const TIERS: VerdictTier[] = [
  { min: 0, label: "just landed" },
  { min: 20, label: "having a look around" },
  { min: 40, label: "actually reading this" },
  { min: 60, label: "still here — nice" },
  { min: 80, label: "ok you really read it all" },
  { min: 95, label: "we should probably talk →", action: true },
];

export const verdictFor = (engagement: number): VerdictTier => {
  // Highest tier whose threshold has been met.
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (engagement >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
};

/* ------------------------------------------------------------ formatting */

/** `137` → `02:17` */
export const clock = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

export const metres = (px: number): string => `${pxToMetres(px).toFixed(2)} m`;

export const storeys = (px: number): string => {
  const value = pxToStoreys(px);
  return `${value.toFixed(1)} ${value === 1 ? "storey" : "storeys"}`;
};

/** Ten-cell bar, e.g. `████████░░`. */
export const bar = (engagement: number, cells = 10): string => {
  const filled = Math.round((engagement / 100) * cells);
  return "█".repeat(filled) + "░".repeat(cells - filled);
};
