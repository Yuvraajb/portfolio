import CONFIG from "../config";
import { getPosts, getProjects } from "../content";

/**
 * In-house SEO audit.
 *
 * Rather than trusting that metadata is correct, this fetches each route from
 * the running server and inspects what was actually sent to the client — the
 * same thing a crawler sees. Checking the source would miss anything the
 * framework drops or overrides at render time.
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

/**
 * Decode entities before measuring length. React escapes apostrophes and
 * dashes into `&#x27;` / `&amp;`, so counting raw attribute bytes overstates
 * the length a search engine actually sees by several characters per entity.
 */
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

const auditRoute = async (route: string): Promise<SeoIssue[]> => {
  const issues: SeoIssue[] = [];
  const url = `${CONFIG.SITE_URL}${route}`;

  let html: string;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "yb-seo-audit" },
    });
    if (!res.ok) {
      return [
        {
          severity: "error",
          route,
          check: "Reachable",
          detail: `Returned HTTP ${res.status}`,
        },
      ];
    }
    html = await res.text();
  } catch (error) {
    return [
      {
        severity: "error",
        route,
        check: "Reachable",
        detail: error instanceof Error ? error.message : "Fetch failed",
      },
    ];
  }

  const title = pick(html, /<title[^>]*>([^<]*)<\/title>/i);
  const description = pick(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
  );
  const ogImage = pick(
    html,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i,
  );
  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;

  if (!title) {
    issues.push({ severity: "error", route, check: "Title", detail: "Missing" });
  } else if (title.length > TITLE_MAX) {
    issues.push({
      severity: "warning",
      route,
      check: "Title",
      detail: `${title.length} chars — may truncate in results (max ~${TITLE_MAX})`,
    });
  }

  if (!description) {
    issues.push({
      severity: "error",
      route,
      check: "Description",
      detail: "Missing",
    });
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

  if (issues.length === 0) {
    issues.push({ severity: "ok", route, check: "All checks", detail: "Passed" });
  }

  return issues;
};

export const runSeoAudit = async (): Promise<SeoReport> => {
  const [projects, posts] = await Promise.all([getProjects(), getPosts()]);

  const routes = [
    "/",
    "/work",
    "/writing",
    "/bookshelf",
    "/about",
    ...projects.slice(0, 4).map((p) => `/work/${p.slug}`),
    ...posts
      .filter((p) => p.source === "local")
      .slice(0, 3)
      .map((p) => `/writing/${p.slug}`),
  ];

  const results = await Promise.all(routes.map(auditRoute));
  const issues = results.flat();

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const score = Math.max(
    0,
    Math.round(100 - (errors * 12 + warnings * 4) ),
  );

  return {
    checkedAt: new Date().toISOString(),
    routes: routes.length,
    issues: issues.sort((a, b) => {
      const order = { error: 0, warning: 1, ok: 2 };
      return order[a.severity] - order[b.severity];
    }),
    score,
  };
};
