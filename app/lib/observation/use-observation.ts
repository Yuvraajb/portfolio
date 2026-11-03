"use client";

import { useEffect, useRef, useState } from "react";
import type { Observation } from "./types";

/**
 * Measures the visitor.
 *
 * The whole feature's performance risk lives here. `pointermove` fires at
 * display rate, so calling setState per event would re-render the panel ~60×
 * a second and wreck INP. Every handler therefore writes into a ref, and a
 * single timer publishes a snapshot to React at FLUSH_HZ.
 *
 * Nothing measured here is transmitted. The panel is explicit about which
 * fields are local-only and which ones `components/telemetry.tsx` separately
 * sends to /api/collect — see the panel's footer.
 */

/** Publishes to React 4× a second. Fast enough to feel live, cheap to render. */
const FLUSH_HZ = 4;
/** No input for this long counts as "thinking". */
const IDLE_AFTER_MS = 2_000;
const SESSION_KEY = "yb_observed_since";

type Mutable = {
  cursorPx: number;
  descentPx: number;
  idleMs: number;
  lastX: number | null;
  lastY: number | null;
  lastScrollY: number;
  lastInputAt: number;
  dwell: Map<string, number>;
  revisits: Map<string, number>;
  visibleSections: Set<string>;
  /** Label currently under the pointer, so re-entries can be de-duplicated. */
  hovering: string | null;
  lastTickAt: number;
};

/** Stable per session, meaningless by design — not derived from the visitor. */
const subjectId = (): string => {
  const existing = sessionStorage.getItem("yb_subject");
  if (existing) return existing;
  const id =
    "0x" +
    Math.floor(Math.random() * 0xffff)
      .toString(16)
      .toUpperCase()
      .padStart(4, "0");
  sessionStorage.setItem("yb_subject", id);
  return id;
};

/** Session start, so the clock survives client-side route changes. */
const sessionStart = (): number => {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) {
    const parsed = Number(existing);
    if (Number.isFinite(parsed)) return parsed;
  }
  const now = Date.now();
  sessionStorage.setItem(SESSION_KEY, String(now));
  return now;
};

const EMPTY: Observation = {
  subject: "0x0000",
  observedMs: 0,
  cursorPx: 0,
  descentPx: 0,
  idleMs: 0,
  longestDwell: null,
  revisits: null,
  coarsePointer: false,
};

export const useObservation = (enabled: boolean): Observation => {
  const [snapshot, setSnapshot] = useState<Observation>(EMPTY);
  const m = useRef<Mutable | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const start = sessionStart();
    const subject = subjectId();
    const coarsePointer = !window.matchMedia("(pointer: fine)").matches;

    m.current = {
      cursorPx: 0,
      descentPx: 0,
      idleMs: 0,
      lastX: null,
      lastY: null,
      lastScrollY: window.scrollY,
      lastInputAt: Date.now(),
      dwell: new Map(),
      revisits: new Map(),
      visibleSections: new Set(),
      hovering: null,
      lastTickAt: Date.now(),
    };
    const s = m.current;

    const markInput = () => {
      s.lastInputAt = Date.now();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (s.lastX !== null && s.lastY !== null) {
        const dx = e.clientX - s.lastX;
        const dy = e.clientY - s.lastY;
        s.cursorPx += Math.hypot(dx, dy);
      }
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      markInput();
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (s.lastX !== null && s.lastY !== null) {
        s.cursorPx += Math.hypot(t.clientX - s.lastX, t.clientY - s.lastY);
      }
      s.lastX = t.clientX;
      s.lastY = t.clientY;
      markInput();
    };

    const onScroll = () => {
      // Absolute delta: scrolling back up is still travel.
      s.descentPx += Math.abs(window.scrollY - s.lastScrollY);
      s.lastScrollY = window.scrollY;
      markInput();
    };

    const onKey = () => markInput();

    /**
     * Hover counts on tagged elements, for the "revisits" line.
     *
     * Counts *transitions into* a target, not raw events. `pointerover`
     * fires again for every descendant the pointer crosses, so a single hover
     * over one card reported as three or four visits — the panel would have
     * been inflating a number it presents as exact.
     */
    const onPointerOver = (e: Event) => {
      const el = (e.target as HTMLElement)?.closest?.("[data-observe]");
      const label = el?.getAttribute("data-observe") ?? null;
      if (label === s.hovering) return;
      s.hovering = label;
      if (label) s.revisits.set(label, (s.revisits.get(label) ?? 0) + 1);
    };

    // Which labelled section is on screen, for the "longest dwell" line.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const label = entry.target.getAttribute("data-section");
          if (!label) continue;
          if (entry.isIntersecting) s.visibleSections.add(label);
          else s.visibleSections.delete(label);
        }
      },
      { threshold: 0.5 },
    );

    const observeSections = () => {
      document
        .querySelectorAll("[data-section]")
        .forEach((el) => io.observe(el));
    };
    observeSections();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey, { passive: true });
    document.addEventListener("pointerover", onPointerOver, true);

    // An interval, not requestAnimationFrame. rAF wakes 60×/second and would
    // do the elapsed-time bookkeeping on every frame merely to decide whether
    // to publish 4×/second — that alone took Total Blocking Time from 10ms to
    // 80ms. Nothing here is frame-synced (accumulation happens in the event
    // handlers, and the readout displays whole seconds), so a plain timer at
    // the publish rate does the same job for ~1/15th of the wake-ups.
    const tick = () => {
      const real = Date.now();
      const elapsed = real - s.lastTickAt;
      s.lastTickAt = real;

      // Accrue dwell and idle only while the tab is actually in front of
      // someone — a backgrounded tab isn't reading anything.
      if (document.visibilityState === "visible") {
        if (real - s.lastInputAt > IDLE_AFTER_MS) s.idleMs += elapsed;
        for (const label of s.visibleSections) {
          s.dwell.set(label, (s.dwell.get(label) ?? 0) + elapsed);
        }
      }

      const topDwell = [...s.dwell.entries()].sort((a, b) => b[1] - a[1])[0];
      const topRevisit = [...s.revisits.entries()].sort(
        (a, b) => b[1] - a[1],
      )[0];

      setSnapshot({
        subject,
        observedMs: Date.now() - start,
        cursorPx: s.cursorPx,
        descentPx: s.descentPx,
        idleMs: s.idleMs,
        longestDwell: topDwell ? { label: topDwell[0], ms: topDwell[1] } : null,
        revisits:
          topRevisit && topRevisit[1] > 1
            ? { label: topRevisit[0], count: topRevisit[1] }
            : null,
        coarsePointer,
      });
    };
    const timer = window.setInterval(tick, 1000 / FLUSH_HZ);

    return () => {
      window.clearInterval(timer);
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerover", onPointerOver, true);
    };
  }, [enabled]);

  return snapshot;
};
