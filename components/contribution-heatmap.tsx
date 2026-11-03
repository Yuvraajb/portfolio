"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ContributionCalendar,
  ContributionLevel,
} from "@/app/lib/sources/github-contributions";
import { usePrefersReducedMotion } from "@/app/utils/use-reduced-motion";

/**
 * A year of contributions as a field of stars.
 *
 * Full-bleed and chrome-free on purpose — no header, no stat tiles, no legend.
 * The grid alone reads as texture at this width, and the numbers it used to
 * carry were saying what the shape already says.
 *
 * Two animations, both deliberately cheap:
 *   - **Reveal**: the whole grid lifts and fades in once when it scrolls into
 *     view. Transitioning the wrapper rather than all 366 cells — doing it
 *     per-cell cost ~30ms of Total Blocking Time for an effect nobody can
 *     distinguish from this one.
 *   - **Twinkle**: only the ~53 *active* cells pulse, each with its own
 *     duration and phase, so they shimmer independently like stars rather
 *     than marching in a wave. Empty cells stay inert.
 */

const LEVEL_STYLE: Record<ContributionLevel, string> = {
  NONE: "bg-[var(--color-surface-2)]",
  FIRST_QUARTILE: "bg-[var(--color-accent)]/30",
  SECOND_QUARTILE: "bg-[var(--color-accent)]/55",
  THIRD_QUARTILE: "bg-[var(--color-accent)]/80",
  FOURTH_QUARTILE: "bg-[var(--color-accent-bright)]",
};

/** Brighter cells twinkle harder — the busiest days are the brightest stars. */
const TWINKLE_STRENGTH: Record<ContributionLevel, number> = {
  NONE: 0,
  FIRST_QUARTILE: 0.45,
  SECOND_QUARTILE: 0.55,
  THIRD_QUARTILE: 0.7,
  FOURTH_QUARTILE: 0.85,
};

/** Stable pseudo-random from a date string, so a cell twinkles the same way
 *  on every render instead of jumping on re-mount. */
const seeded = (value: string): number => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
};

const formatDay = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export const ContributionHeatmap = ({
  data,
}: {
  data: ContributionCalendar;
}) => {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Derived, not synced: under reduced motion the grid is simply always shown.
  // Setting that from inside the effect would be a synchronous state update on
  // mount for no reason.
  const revealed = reduced === true || inView;

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced !== false) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        // One-way: once revealed it stays revealed, so scrolling back up
        // doesn't replay the animation every time.
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div
      ref={ref}
      // Container width, not full-bleed: edge-to-edge made it the loudest
      // thing on the page and broke the margin every other section sits on.
      className="mb-16"
      role="img"
      aria-label={`${data.total} GitHub contributions over the last year, across ${data.activeDays} active days.`}
    >
      <div
        className={`grid w-full transition-[opacity,transform] duration-700 ease-[var(--ease-out-expo)] ${
          revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
        style={{
          // One column per week; cells size themselves to the full width, so
          // the grid grows with the viewport instead of sitting at a fixed
          // 10px and leaving the margins empty.
          gridTemplateColumns: `repeat(${data.weeks.length}, minmax(0, 1fr))`,
          gridTemplateRows: "repeat(7, minmax(0, 1fr))",
          gridAutoFlow: "column",
          gap: "clamp(2px, 0.28vw, 5px)",
        }}
      >
        {data.weeks.map((week, weekIndex) =>
          week.map((day) => {
            const active = day.level !== "NONE";
            const r = seeded(day.date);

            return (
              <span
                key={day.date}
                title={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${formatDay(day.date)}`}
                style={{
                  gridRowStart: day.weekday + 1,
                  ...(active && revealed && !reduced
                    ? {
                        // Each star gets its own rhythm and phase.
                        animationName: "star-twinkle",
                        animationDuration: `${2.6 + r * 3.4}s`,
                        animationDelay: `${weekIndex * 14 + r * 2600}ms`,
                        animationIterationCount: "infinite",
                        animationTimingFunction: "ease-in-out",
                        ["--twinkle-dim" as string]: TWINKLE_STRENGTH[day.level],
                      }
                    : {}),
                }}
                className={`aspect-square rounded-[2px] ${LEVEL_STYLE[day.level]}`}
              />
            );
          }),
        )}
      </div>
    </div>
  );
};
