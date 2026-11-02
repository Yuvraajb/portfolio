# Design System — Terminal Observatory

> Supersedes the previous system entirely. The old doc described a light/dark
> "brutally minimal" site with **no** decorative canvas; this version commits
> to a dark, WebGL-led instrument aesthetic. Where they disagree, this wins.

## Concept

A dark, precision-instrument aesthetic — the site should read like a well-made
piece of scientific or trading equipment. Chosen deliberately: Yuvraaj works at
the intersection of **AI, iOS, and quantitative finance**, and an
instrument-panel language is the honest expression of that.

**The through-line is the glyph.** Every effect is a variation on one idea:
*characters resolving into meaning.* ASCII fields, decrypting text, scrambling
labels. If an effect can't be justified as "glyphs resolving," it doesn't ship.

## Color

Dark only. No light mode — every reference is dark, the aesthetic *is* dark, and
one mode means one thing to get right.

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#07080a` | page base |
| `--color-surface` | `#0e1014` | cards, panels |
| `--color-ink` | `#e8eaed` | primary text |
| `--color-muted` | `#a1a7b0` | secondary text (8.1:1) |
| `--color-faint` | `#7c828c` | metadata (5.0:1) |
| `--color-accent` | `#3b82f6` | links, active states |
| `--color-accent-bright` | `#7dd3fc` | glyph highlights, hover |
| `--color-line` | `#1c1f26` | hairlines |

Both greys are tuned to clear WCAG AA for small text while staying
distinguishable from each other. The earlier `#565b64` measured 2.88:1 and
failed — don't reintroduce it.

## Typography

- **Geist Mono** — the workhorse. Labels, nav, metadata, data, code, section
  headers. Mono-first is the instrument-panel signal.
- **Geist** — display headings and hero copy.
- **Source Serif 4** — long-form reading only (post bodies, about).
  `preload: false`, because pulling it onto the critical path for one hero line
  cost 3.2s of LCP render delay on throttled mobile.

## Motion

- Signature: glyph-resolve (`DecryptedText`, `RotatingText`).
- Entrances: `AnimatedContent` on scroll, staggered.
- `AnimatedContent` wraps GSAP — **`delay` is in seconds, not milliseconds.**
- Under `prefers-reduced-motion`, WebGL surfaces do not mount at all and
  decorative canvases (e.g. `StarBorder`) swap to static equivalents.

## Performance rules

1. **At most one WebGL surface per viewport.** Enforced structurally by
   `<WebGLSurface>`, which mounts its child only while intersecting and
   unmounts when it leaves.
2. GPU work is deferred to `requestIdleCallback` so shader compilation stays
   off the first-paint critical path (this took TBT from 220ms → 0ms).
3. Targets: Lighthouse ≥ 90 mobile. Currently 99 desktop / 94 mobile.

## React Bits

Components are vendored from the registry and kept byte-for-byte as shipped so
re-adding never conflicts. Two exceptions are documented in-file:

- `GradientASCII.jsx` — the cleanup calls `loseContext()`, which under React
  StrictMode's double-mount leaves the remount holding a dead GL context. Now
  skipped in development only; production behaviour is unchanged.
- Lint overrides in `eslint.config.mjs` for their ref-during-render patterns.

## Decisions log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-11-02 | Dark-only; dropped light mode and theme toggle | Two designs to QA for no gain; the aesthetic is inherently dark |
| 2026-11-02 | Hero tagline moved from serif to sans | It was the LCP element; the serif cost 3.2s render delay and the system reserves it for long-form anyway |
| 2026-11-02 | Greys raised to `#a1a7b0` / `#7c828c` | Previous faint grey failed WCAG AA at 2.88:1 |
| 2026-11-02 | `WebGLSurface` wrapper enforces the GPU budget | "One surface per viewport" was a rule with no mechanism |
| 2026-11-02 | Analytics storage behind an adapter; dashboard states when unconfigured | Serverless has no writable FS; fake zeros would be worse than an honest empty state |
