"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts an expensive (usually WebGL) child only while it is on screen, and
 * unmounts it once it leaves.
 *
 * This is the mechanism behind the "at most one GPU surface per viewport"
 * budget in PLAN.md. Without it that rule is just a promise — several React
 * Bits backgrounds each hold their own GL context and run their own rAF loop,
 * and a page with four of them will keep all four running forever, burn
 * battery, and eventually hit the browser's context limit (which silently
 * kills the oldest one).
 *
 * It also refuses to mount under `prefers-reduced-motion`, falling back to
 * `fallback` — accessibility and a large mobile battery win in one rule.
 */
export const WebGLSurface = ({
  children,
  fallback = null,
  /** Start rendering this far before the element scrolls into view. */
  rootMargin = "200px",
  className = "",
}: {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setAllowed(!mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || allowed !== true) return;

    let io: IntersectionObserver | null = null;

    // Wait for the main thread to go idle before observing. Compiling shaders
    // and building the glyph atlas is tens of milliseconds of blocking work;
    // doing it during first paint inflates Total Blocking Time and delays the
    // hero text, which is the LCP element. One idle tick costs nothing
    // visually and takes that work off the critical path.
    const start = () => {
      io = new IntersectionObserver(
        ([entry]) => setVisible(entry.isIntersecting),
        { rootMargin },
      );
      io.observe(el);
    };

    // `requestIdleCallback` is unavailable in Safari < 17, so fall back to a
    // short timeout there. Captured as locals to keep TypeScript from
    // narrowing `window` away inside the cleanup.
    const supportsIdle = typeof window.requestIdleCallback === "function";
    const handle: number = supportsIdle
      ? window.requestIdleCallback(start, { timeout: 900 })
      : window.setTimeout(start, 240);

    return () => {
      if (supportsIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      io?.disconnect();
    };
  }, [allowed, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {allowed === true && visible ? children : fallback}
    </div>
  );
};
