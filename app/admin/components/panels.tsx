"use client";

import type { Summary } from "@/app/lib/analytics/types";
import type { SeoReport } from "@/app/lib/seo/audit";

export const Panel = ({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section className="border border-[var(--color-line)] bg-[var(--color-surface)]">
    <header className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-3">
      <h2 className="eyebrow">{title}</h2>
      {action}
    </header>
    <div className="p-5">{children}</div>
  </section>
);

export const StatTile = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
    <p className="eyebrow mb-2">{label}</p>
    <p className="font-mono text-2xl tracking-tight text-[var(--color-ink)] tabular-nums">
      {value}
    </p>
    {hint ? (
      <p className="mt-1 font-mono text-[10px] text-[var(--color-faint)]">{hint}</p>
    ) : null}
  </div>
);

/**
 * Traffic sparkline, drawn as plain SVG bars.
 *
 * A charting library would be ~40KB for one chart on a page only one person
 * ever sees. Bars also degrade honestly: an all-zero series renders as a flat
 * baseline rather than an auto-scaled graph implying activity.
 */
export const TrafficChart = ({ timeline }: { timeline: Summary["timeline"] }) => {
  const max = Math.max(1, ...timeline.map((d) => d.views));

  return (
    <div>
      <div className="flex h-32 items-end gap-[2px]">
        {timeline.map((day) => {
          const height = (day.views / max) * 100;
          return (
            <div
              key={day.date}
              className="group relative flex-1 bg-[var(--color-accent)]/25 transition-colors hover:bg-[var(--color-accent)]"
              style={{ height: `${Math.max(height, 1.5)}%` }}
            >
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 border border-[var(--color-line-bright)] bg-[var(--color-bg)] px-2 py-1 font-mono text-[10px] whitespace-nowrap text-[var(--color-ink)] group-hover:block">
                {day.date} · {day.views} views · {day.visitors} visitors
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between font-mono text-[10px] text-[var(--color-faint)]">
        <span>{timeline[0]?.date}</span>
        <span>{timeline[timeline.length - 1]?.date}</span>
      </div>
    </div>
  );
};

/** Ranked rows with a proportional fill behind each label. */
export const RankedList = ({
  rows,
  emptyLabel = "No data yet.",
}: {
  rows: { label: string; value: number; sub?: string }[];
  emptyLabel?: string;
}) => {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center font-mono text-xs text-[var(--color-faint)]">
        {emptyLabel}
      </p>
    );
  }

  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <ul className="flex flex-col gap-1">
      {rows.map((row) => (
        <li key={row.label} className="relative">
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 bg-[var(--color-accent)]/10"
            style={{ width: `${(row.value / max) * 100}%` }}
          />
          <div className="relative flex items-center justify-between gap-4 px-2 py-2">
            <span className="truncate font-mono text-xs text-[var(--color-ink)]">
              {row.label}
            </span>
            <span className="shrink-0 font-mono text-xs text-[var(--color-muted)] tabular-nums">
              {row.sub ? (
                <span className="mr-3 text-[var(--color-faint)]">{row.sub}</span>
              ) : null}
              {row.value}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
};

export const SeoIssues = ({ report }: { report: SeoReport }) => (
  <div>
    <div className="mb-5 flex items-baseline gap-3">
      <span className="font-mono text-3xl tracking-tight text-[var(--color-ink)] tabular-nums">
        {report.score}
      </span>
      <span className="font-mono text-xs text-[var(--color-faint)]">
        / 100 · {report.routes} routes checked
      </span>
    </div>

    <ul className="flex flex-col divide-y divide-[var(--color-line)]">
      {report.issues.slice(0, 20).map((issue, i) => (
        <li
          key={`${issue.route}-${issue.check}-${i}`}
          className="flex items-start gap-3 py-2.5"
        >
          <span
            className={`mt-0.5 font-mono text-[10px] ${
              issue.severity === "error"
                ? "text-red-400"
                : issue.severity === "warning"
                  ? "text-amber-400"
                  : "text-emerald-400"
            }`}
          >
            {issue.severity === "error" ? "ERR" : issue.severity === "warning" ? "WRN" : "OK "}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-mono text-xs text-[var(--color-ink)]">
              {issue.route}
              <span className="ml-2 text-[var(--color-faint)]">{issue.check}</span>
            </span>
            <span className="font-mono text-[10px] text-[var(--color-muted)]">
              {issue.detail}
            </span>
          </span>
        </li>
      ))}
    </ul>
  </div>
);
