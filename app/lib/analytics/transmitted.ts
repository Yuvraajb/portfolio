/**
 * The fields `/api/collect` actually records about a visitor.
 *
 * This exists so the observation panel can tell visitors the truth without
 * that truth going stale. The panel renders this list verbatim; a verification
 * check compares it against the keys the route really writes. Add a field to
 * the API without adding it here and that check fails — which is the point.
 *
 * Keep the wording plain. This is read by people, not machines.
 */
export const TRANSMITTED_FIELDS = [
  "page path",
  "referrer",
  "time on page",
  "scroll depth",
  "device type",
  "screen size",
  "country",
  "outbound clicks",
  "utm tags",
] as const;

/**
 * The corresponding keys on the stored event, for the drift check.
 * `id`, `type`, `ts` and `visitor` are deliberately excluded below — they are
 * described separately in the panel because they need explaining, not listing.
 */
export const TRANSMITTED_KEYS = [
  "path",
  "referrer",
  "dwellMs",
  "scrollDepth",
  "device",
  "screen",
  "country",
  "href",
  "utmSource",
] as const;
