# Portfolio v2 — Build Plan

## 1. Design direction

**Concept: "Terminal Observatory."**

A dark, precision-instrument aesthetic — the site should feel like a beautifully machined
piece of scientific/trading equipment. This is chosen deliberately, not arbitrarily: Yuvraaj
works at the intersection of **AI, iOS, and quantitative finance**, and an instrument-panel
visual language is the honest expression of that. It also absorbs both reference directions
(ASCII art + pixel/modern) into one coherent system rather than two competing ones.

**The through-line is the glyph.** Every effect on the site is a variation on one idea:
*characters resolving into meaning.* ASCII fields, decrypting text, dithered pixel
transitions, scrambling labels. Nothing is decoration-for-decoration's-sake; if an effect
can't be justified as "glyphs resolving," it doesn't ship.

### Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#07080A` | page base, near-black with a blue cast |
| `--surface` | `#0E1014` | cards, raised panels |
| `--ink` | `#E8EAED` | primary text |
| `--muted` | `#8A8F98` | secondary text, metadata |
| `--accent` | `#3B82F6` | single accent — links, active states |
| `--accent-bright` | `#7DD3FC` | glyph highlights, hover |
| `--line` | `#1C1F26` | hairlines, borders |

One accent. Everything else is neutral. Light mode is a tonal inversion of the same system,
not a second design.

### Type

- **Geist Mono** — the workhorse. Labels, nav, metadata, data, code, section headers.
  Mono-first is the instrument-panel signal.
- **Geist** — display headings only (hero, page titles).
- **Source Serif 4** — long-form reading (post bodies, about). One point of warmth.

### Motion

- Signature: glyph-resolve (`DecryptedText`, `ScrambledText`, `Shuffle`).
- Entrances: `AnimatedContent` / `FadeContent` on scroll, staggered.
- Every motion respects `prefers-reduced-motion`.
- Budget: **at most one WebGL surface visible per viewport.** This is the single biggest
  performance risk and the rule that protects it.

---

## 2. Information architecture

```
/                 Landing — hero, stack marquee, what I do, selected work,
                  writing teaser, bookshelf teaser, contact
/work             Projects index (filterable)
/work/[slug]      Project detail — live GitHub stats
/writing          Posts (live Substack + local markdown)
/writing/[slug]   Post reader
/bookshelf        Goodreads shelves, live
/about            Bio, timeline, stack, socials
/admin            PRIVATE — analytics, SEO, engagement dashboard
/lab              Full-bleed experiments (bare layout)
```

---

## 3. Section-by-section component plan

| Section | React Bits | Why |
|---|---|---|
| Hero | `GradientASCII` + `DecryptedText` + `BlurText` + `RotatingText` | Built, working |
| Stack marquee | `LogoLoop` | Tech logos, seamless |
| What I do | `AnimatedContent`, `SpotlightCard` | Three pillars: AI / iOS / Quant |
| Selected work | `MagicBento` or `ChromaGrid` | Live artwork + cursor edge light |
| Project cards | `TiltedCard`, `PixelTransition` | Pixel dissolve = glyph through-line |
| Stats counters | `CountUp` | Repos, commits, wins |
| Writing list | `AnimatedList`, `ScrollReveal` | |
| Bookshelf | `Masonry` or `CircularGallery` | Cover grid |
| Section headings | `ScrollFloat`, `ShinyText` | |
| Nav | `PillNav` or `GooeyNav` | |
| Cursor | `TargetCursor` | Reticle = instrument language |
| Footer / contact | `StarBorder`, `Magnet` | |
| 404 | `FaultyTerminal` | On-theme |

---

## 4. Backend

Existing two-layer content architecture is kept and extended:
`lib/content/source.ts` (where data lives) → `lib/content/index.ts` (cached, tagged).

**New sources:**
- `lib/sources/github.ts` — live repo stats (stars, language, pushed-at) via the GitHub API,
  cached 1h. Curated project list stays in `content/projects.json`; GitHub only *enriches* it,
  so a rate-limit or outage degrades to static content rather than an empty page.
- `lib/sources/substack.ts` — RSS → posts. Merged with local markdown.
- `lib/sources/goodreads.ts` — RSS → shelves.

**Resilience rule:** every external source is wrapped so a failure returns last-known/static
data and never throws into a page render. A dead Goodreads feed must not take down the site.

---

## 5. Analytics, SEO, engagement (private)

**Collect** (first-party, no third-party scripts, cookieless):
- Pageviews: path, referrer, UTM, device class, country (from Vercel geo headers)
- Engagement: scroll depth buckets, time-on-page, outbound link clicks, section visibility
- Web Vitals: LCP / CLS / INP via `useReportWebVitals`

**Privacy by design:** no cookies, no cross-site identifiers. Visitors are counted via a
daily-rotating salted hash of `IP + User-Agent` — enough to distinguish unique visitors
within a day, impossible to reverse or track across days. Bots filtered server-side.

**SEO tooling:** per-route metadata audit (title/description length, OG presence, canonical,
heading order), sitemap/robots validation, JSON-LD, internal link graph.

**Dashboard** at `/admin`: traffic over time, top pages, referrers, engagement quality,
Web Vitals, SEO issues list.

**Storage:** an adapter interface (`lib/analytics/store.ts`) with a filesystem adapter for
local dev and a durable adapter for production. This is deliberate — serverless has no
writable filesystem, so the adapter boundary is what makes the dashboard real in production
instead of a demo.

---

## 6. Security model

The dashboard contains private business data, so it gets real protection, not obscurity:

1. **Auth:** password → HttpOnly, Secure, SameSite=Strict signed session cookie (HMAC, short
   TTL). Password compared with `timingSafeEqual`. Secret in env, never in the bundle.
2. **Edge gate:** `proxy.ts` blocks `/admin*` without a valid session before any page renders.
3. **Rate limiting:** login attempts throttled per-IP with backoff, to kill brute force.
4. **Ingest hardening:** the public `/api/collect` endpoint validates payload shape, caps
   body size, drops bots, and is rate-limited — it's the one public write path, so it's the
   one that matters most.
5. **Headers/CSP:** strict CSP, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options`,
   Referrer-Policy, Permissions-Policy.
6. **No secret ever reaches the client.** Verified by grepping the built bundle.

---

## 7. Performance

- One WebGL surface per viewport, unmounted when scrolled away (`IntersectionObserver`).
- Heavy components `next/dynamic` + `ssr: false`, with skeletons.
- `prefers-reduced-motion` disables WebGL surfaces entirely and falls back to a static
  gradient — accessibility and a battery win on mobile.
- Targets: LCP < 2.5s, CLS < 0.1, Lighthouse ≥ 90 on mobile.
- Self-hosted fonts, `font-display: swap`, images via `next/image`.

---

## 8. Build order

Each step must work before the next begins.

1. Design system + tokens + shell (nav, footer, cursor, transitions)
2. Landing sections, one at a time
3. Work index + detail, with live GitHub data
4. Writing (Substack + markdown)
5. Bookshelf (Goodreads)
6. About
7. Analytics collection + storage
8. Admin dashboard + auth
9. Security hardening + audit
10. Performance + responsive + a11y pass
11. Commit, push, deploy, verify live

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| WebGL perf on mobile | One surface per viewport; disable under reduced-motion; test on throttled CPU |
| React Bits + StrictMode context loss | Known; patched in `GradientASCII`; apply same fix to any other WebGL component |
| Goodreads/Substack feed outage | Cached last-known-good; static fallback; never throws |
| Analytics needs durable storage | Adapter boundary; provision a real store at deploy |
| GitHub API rate limits | Authenticated requests, 1h cache, static fallback |
| Scope | Build in the order above; every step independently shippable |

---

## 10. Review pass 1 — decisions forced by reality

Writing the plan exposed five things that were hand-waved. Resolved:

1. **Dark-only, no light mode.** The original plan said "light mode is a tonal inversion."
   That's two designs to build and QA for no gain — every reference image is dark, and the
   instrument aesthetic *is* dark. Committing to one mode makes it better and halves the
   surface area. The theme toggle is dropped.
2. **Analytics storage = Vercel Blob.** "A durable adapter" was hand-waving. The Vercel CLI
   is authenticated as `yuvraajb`, so a Blob store can actually be provisioned. Adapter
   interface stays (filesystem for local dev), but production has a concrete answer.
3. **Deployment is two-stage.** `main` is production for `yuvraajb.vercel.app`. Pushing
   straight there would swap the live site with no verification. So: push `portfolio-v2`,
   deploy a *preview*, verify it live, then promote. Reversible at every step.
4. **Custom cursor is conditional.** A reticle cursor on touch or for reduced-motion users is
   hostile. Gated behind `pointer: fine` and motion preference.
5. **Admin auth gets unified.** There's already a bearer-token `isAdmin()` from the earlier
   build. Two auth schemes on one surface is how holes appear — the session cookie becomes
   the single source of truth and the bearer path is retired.

## 11. Review pass 2 — what's still weak

Re-reading the above, three genuine gaps remain:

1. **"Verify it works" has no definition.** Every step claims verification but nothing says
   how. Fix: a Playwright harness that, for each route, asserts HTTP 200, zero console
   errors, no horizontal overflow at 390/768/1440px, and that the WebGL context is alive.
   Run it after every section — the same harness that caught the dead GL context earlier.
2. **WebGL budget is stated but unenforced.** "One surface per viewport" is a rule with no
   mechanism. Fix: a shared `<WebGLSurface>` wrapper that mounts its child only when
   intersecting and unmounts when it leaves, so the budget is structural, not a promise.
3. **The analytics dashboard is the biggest risk and is scheduled last.** If it runs long,
   the site still ships — correct ordering. But it must degrade honestly: if no store is
   provisioned, the dashboard says so plainly rather than rendering fake zeros.

**Ship criteria:** every route 200s, console-clean, no overflow at three breakpoints,
Lighthouse mobile ≥ 90, admin unreachable without auth, no secret in the client bundle.
