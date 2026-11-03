"use client";

import { useMemo } from "react";
import type {
  ContributionCalendar,
  ContributionLevel,
} from "@/app/lib/sources/github-contributions";
import { usePrefersReducedMotion } from "@/app/utils/use-reduced-motion";

/**
 * GitHub's contribution grid, rebuilt in this site's language.
 *
 * Not GitHub green — the accent blue ramp, square cells, hairline borders, the
 * same instrument register as everything else. The point is that it reads as
 * part of this site rather than an embedded widget from another one.
 *
 * **The shimmer is one element, not 366.** A per-cell animation across a full
 * year is 366 simultaneously animating nodes, which costs real paint work on
 * mobile for a decorative effect. Instead a single wide gradient translates
 * across the grid under `mix-blend-mode`, which the compositor handles on its
 * own thread — a travelling wave of light over water, for the price of one
 * transform.
 */

const LEVEL_STYLE: Record<ContributionLevel, string> = {
  // Empty days are barely-there structure, not absence.
  NONE: "bg-[var(--color-surface-2)]",
  FIRST_QUARTILE: "bg-[var(--color-accent)]/25",
  SECOND_QUARTILE: "bg-[var(--color-accent)]/45",
  THIRD_QUARTILE: "bg-[var(--color-accent)]/70",
  FOURTH_QUARTILE: "bg-[var(--color-accent-bright)]",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const formatDay = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
};

export const ContributionHeatmap = ({
  data,
  profileUrl,
}: {
  data: ContributionCalendar;
  profileUrl: string;
}) => {
  const reduced = usePrefersReducedMotion();

  // Month label sits above the first week whose month differs from the last.
  const monthLabels = useMemo(() => {
    const labels: { index: number; label: string }[] = [];
    let previous = -1;
    data.weeks.forEach((week, index) => {
      const first = week[0];
      if (!first) return;
      const month = new Date(`${first.date}T00:00:00Z`).getUTCMonth();
      if (month !== previous) {
        labels.push({ index, label: MONTHS[month] });
        previous = month;
      }
    });
    return labels;
  }, [data.weeks]);

  const stats = [
    { label: "Contributions", value: data.total },
    { label: "Active days", value: data.activeDays },
    { label: "Longest streak", value: data.longestStreak, suffix: "d" },
    { label: "Repos created", value: data.newRepos },
  ];

  return (
    <div className="mb-14 border border-[var(--color-line)] bg-[var(--color-surface)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] px-5 py-3">
        <h3 className="eyebrow">Last 12 months on GitHub</h3>
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[11px] text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent-bright)]"
        >
          @{profileUrl.split("/").pop()} ↗
        </a>
      </header>

      <div className="grid grid-cols-2 divide-[var(--color-line)] border-b border-[var(--color-line)] sm:grid-cols-4 sm:divide-x">
        {stats.map((stat) => (
          <div key={stat.label} className="px-5 py-4">
            <p className="font-mono text-2xl tracking-tight text-[var(--color-ink)] tabular-nums">
              {stat.value}
              {stat.suffix ?? ""}
            </p>
            <p className="eyebrow mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* The grid scrolls horizontally on narrow screens rather than shrinking
          cells to illegibility or letting the page overflow sideways. */}
      <div className="overflow-x-auto px-5 py-5">
        {/* `w-fit`, not `min-w-full`: the grid is ~700px and the panel is
            wider, so a full-width wrapper let the shimmer travel across empty
            space to the right of the grid, where it read as a stray rectangle
            rather than light moving over the cells. */}
        <div className="relative w-fit">
          <div
            className="mb-1.5 grid gap-[3px]"
            style={{
              gridTemplateColumns: `repeat(${data.weeks.length}, 10px)`,
            }}
            aria-hidden
          >
            {monthLabels.map(({ index, label }) => (
              <span
                key={`${label}-${index}`}
                className="font-mono text-[9px] text-[var(--color-faint)]"
                style={{ gridColumnStart: index + 1 }}
              >
                {label}
              </span>
            ))}
          </div>

          <div
            className="grid grid-flow-col gap-[3px]"
            style={{
              gridTemplateRows: "repeat(7, 10px)",
              gridTemplateColumns: `repeat(${data.weeks.length}, 10px)`,
            }}
            role="img"
            aria-label={`${data.total} GitHub contributions in the last year, across ${data.activeDays} active days.`}
          >
            {data.weeks.map((week) =>
              week.map((day) => (
                <span
                  key={day.date}
                  // Native tooltip: a custom one here would mean 366 extra
                  // nodes and keyboard traps for a hover nicety.
                  title={`${day.count} contribution${day.count === 1 ? "" : "s"} on ${formatDay(day.date)}`}
                  style={{ gridRowStart: day.weekday + 1 }}
                  className={`size-[10px] rounded-[2px] ${LEVEL_STYLE[day.level]}`}
                />
              )),
            )}
          </div>

          {/* The wave. One element, transform-only, pointer-transparent. */}
          {reduced === false ? (
            <span
              aria-hidden
              // Wide, low-alpha and slow: a swell passing under the surface,
              // not a sweeping highlight. Harder edges or more opacity and it
              // reads as a loading shimmer.
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 animate-[contrib-wave_9s_ease-in-out_infinite] bg-[linear-gradient(105deg,transparent_0%,rgba(125,211,252,0.05)_30%,rgba(125,211,252,0.11)_50%,rgba(125,211,252,0.05)_70%,transparent_100%)] mix-blend-screen"
            />
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-end gap-1.5 font-mono text-[10px] text-[var(--color-faint)]">
          <span className="mr-1">Less</span>
          {(
            [
              "NONE",
              "FIRST_QUARTILE",
              "SECOND_QUARTILE",
              "THIRD_QUARTILE",
              "FOURTH_QUARTILE",
            ] as ContributionLevel[]
          ).map((level) => (
            <span
              key={level}
              className={`size-[10px] rounded-[2px] ${LEVEL_STYLE[level]}`}
            />
          ))}
          <span className="ml-1">More</span>
        </div>
      </div>
    </div>
  );
};
