# yuvraajb.vercel.app

Personal site for Yuvraaj Bhatter — work, writing, bookshelf, and a private
analytics console.

Next.js 16 (App Router) · React 19 · Tailwind v4 · React Bits · WebGL

---

## Run it

```bash
npm install
cp .env.example .env.local   # fill in at least ADMIN_* if you want /admin
npm run dev
```

## Architecture

```
app/
  (site)/              public pages — nav + footer chrome
  (bare)/              full-bleed routes (no chrome) — /lab
  admin/               private console (gated in proxy.ts)
  api/collect/         public telemetry ingest — the only unauth'd write path
  api/admin/           login / logout
  lib/
    config.ts          absolute site URL, identity
    metadata.ts        one factory for every page's SEO/OG
    content/           source.ts (where data lives) → index.ts (cached, tagged)
    sources/           github · substack · goodreads, each failure-tolerant
    analytics/         store adapter + aggregation
    seo/audit.ts       fetches live routes and grades their metadata
    auth.ts            HMAC session, Web Crypto (runs in proxy + handlers)
    rate-limit.ts      sliding window, per-instance
  og/ feed.xml/ sitemap.ts robots.ts
proxy.ts               admin gate, legacy redirects, security headers + CSP
content/               projects.json · site.json · bookshelf.json · posts/
```

**Content flows one way:** `sources/` → `content/source.ts` →
`content/index.ts` → pages. Pages never reach past the cached layer, which is
what keeps the storage backend swappable.

**External data degrades, never breaks.** Every source is wrapped in
`resilient()`: a GitHub rate limit costs a star count, a dead Goodreads feed
falls back to the committed snapshot. Neither can 500 a page.

## The /admin console

First-party, cookieless analytics — pageviews, dwell time, scroll depth,
referrers, outbound clicks — plus a live SEO audit that fetches each route and
grades what a crawler actually receives.

Protected by a signed HttpOnly session cookie, gated at the edge in `proxy.ts`
before any page renders, with per-IP brute-force lockout. Visitors are counted
via a daily-rotating salted hash of IP + User-Agent: enough to distinguish
uniques within a day, impossible to reverse or follow across days.

Needs `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET`. For durable storage in
production, link a Vercel Blob store — without it the dashboard says so plainly
rather than rendering zeros that look like data.

## Scripts

| | |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm run sync-goodreads` | refresh `content/bookshelf.json` |

## Gotchas worth knowing

- `AnimatedContent` wraps GSAP — **`delay` is seconds, not milliseconds.**
- React Bits WebGL components call `loseContext()` on cleanup, which breaks
  under StrictMode's double-mount. See the patch in `components/GradientASCII.jsx`.
- Re-running `shadcn add` on a vendored component overwrites local patches.
