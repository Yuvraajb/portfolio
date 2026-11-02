/**
 * SEO grading rules, written to run anywhere.
 *
 * Deliberately isolated from any fetching so the same logic can grade HTML in
 * the browser. The audit used to fetch routes server-side, but a serverless
 * function requesting its own public hostname has to loop back out through the
 * CDN — in production every one of those requests timed out and the audit
 * scored a healthy site 0/100. Grading in the admin's browser avoids the
 * loopback entirely and measures what a real client actually receives.
 */

export type SeoIssue = {
  severity: "error" | "warning" | "ok";
  route: string;
  check: string;
  detail: string;
};

export type SeoReport = {
  checkedAt: string;
  routes: number;
  issues: SeoIssue[];
  score: number;
};

const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;

/** React escapes apostrophes and dashes; counting raw bytes overstates length. */
const decode = (value: string): string =>
  value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const pick = (html: string, pattern: RegExp): string | null => {
  const match = html.match(pattern)?.[1];
  return match ? decode(match).trim() : null;
};

/** Grade one route's HTML. Pure — no I/O. */
export const gradeHtml = (route: string, html: string): SeoIssue[] => {
  const issues: SeoIssue[] = [];

  const title = pick(html, /<title[^>]*>([^<]*)<\/title>/i);
  const description = pick(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
  );
  const ogImage = pick(
    html,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i,
  );
  const canonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;

  if (!title) {
    issues.push({ severity: "error", route, check: "Title", detail: "Missing" });
  } else if (title.length > TITLE_MAX) {
    issues.push({
      severity: "warning",
      route,
      check: "Title",
      detail: `${title.length} chars — may truncate (max ~${TITLE_MAX})`,
    });
  }

  if (!description) {
    issues.push({ severity: "error", route, check: "Description", detail: "Missing" });
  } else if (description.length < DESC_MIN || description.length > DESC_MAX) {
    issues.push({
      severity: "warning",
      route,
      check: "Description",
      detail: `${description.length} chars — aim for ${DESC_MIN}–${DESC_MAX}`,
    });
  }

  if (!ogImage) {
    issues.push({
      severity: "warning",
      route,
      check: "OG image",
      detail: "Missing — link previews will be bare",
    });
  }

  if (h1Count === 0) {
    issues.push({ severity: "error", route, check: "H1", detail: "No <h1>" });
  } else if (h1Count > 1) {
    issues.push({
      severity: "warning",
      route,
      check: "H1",
      detail: `${h1Count} <h1> elements — should be exactly one`,
    });
  }

  if (!canonical) {
    issues.push({
      severity: "warning",
      route,
      check: "Canonical",
      detail: "No canonical link",
    });
  }

  if (issues.length === 0) {
    issues.push({ severity: "ok", route, check: "All checks", detail: "Passed" });
  }

  return issues;
};

export const scoreIssues = (issues: SeoIssue[]): number => {
  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  return Math.max(0, Math.round(100 - (errors * 12 + warnings * 4)));
};

const ORDER = { error: 0, warning: 1, ok: 2 } as const;

export const buildReport = (issues: SeoIssue[], routes: number): SeoReport => ({
  checkedAt: new Date().toISOString(),
  routes,
  issues: [...issues].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]),
  score: scoreIssues(issues),
});
