"use client";

import { useEffect, useState } from "react";

/**
 * Tracks `prefers-reduced-motion`, for components that must swap to a static
 * alternative rather than merely animate less.
 *
 * Returns `null` until mounted, so callers can avoid rendering an animated
 * variant during SSR and then tearing it down on hydration.
 */
export const usePrefersReducedMotion = (): boolean | null => {
  const [reduced, setReduced] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return reduced;
};
