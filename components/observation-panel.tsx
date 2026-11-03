"use client";

import { useEffect } from "react";
import { TRANSMITTED_FIELDS } from "@/app/lib/analytics/transmitted";
import { useObservation } from "@/app/lib/observation/use-observation";
import {
  bar,
  clock,
  metres,
  score,
  storeys,
  verdictFor,
} from "@/app/lib/observation/verdict";
import { usePrefersReducedMotion } from "@/app/utils/use-reduced-motion";
import { useStoredFlag } from "@/app/utils/use-stored-flag";

/**
 * The site measures the visitor back, and says so.
 *
 * Every site on the internet measures you quietly. This one measures you to
 * four significant figures and shows you the readout — including an honest
 * list of what actually gets transmitted, which is the part nobody else
 * prints. The absurdity is the position.
 *
 * Contained by design: collapsed by default, dismissible for good, and
 * `fixed` so it can never shift layout (CLS stays 0).
 */

const DISMISSED_KEY = "yb_obs_dismissed";
const OPEN_KEY = "yb_obs_open";
/** Auto-opens once at this score, so an early bouncer never sees zeroes. */
const AUTO_OPEN_AT = 18;

export const ObservationPanel = ({ email }: { email: string }) => {
  const reduced = usePrefersReducedMotion();
  const [dismissed, setDismissed] = useStoredFlag(DISMISSED_KEY);
  const [choice, setChoice] = useStoredFlag(OPEN_KEY);

  const o = useObservation(dismissed !== true);
  const engagement = score(o);
  const verdict = verdictFor(engagement);

  // Open state is *derived*, not synced. If the visitor hasn't chosen, the
  // panel opens itself once engagement crosses the threshold; the moment they
  // do choose, their choice wins forever. Engagement only ever rises, so this
  // can't flap. Deriving it removes the effect that would otherwise set state
  // on every tick.
  const open =
    choice ?? (reduced === false && engagement >= AUTO_OPEN_AT);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChoice(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setChoice]);

  if (dismissed === true) return null;

  const dismiss = () => setDismissed(true);

  return (
    <aside
      aria-label="Live observation of your visit"
      // Updates 4× a second — announcing that would be hostile.
      aria-live="off"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:px-0 sm:pb-0"
    >
      {open ? (
        <div className="pointer-events-auto w-full max-w-[22rem] border border-[var(--color-line-bright)] bg-[var(--color-bg)]/95 font-mono text-[11px] shadow-2xl backdrop-blur-md">
          <header className="flex items-center justify-between border-b border-[var(--color-line)] px-3 py-2">
            <span className="tracking-[0.14em] text-[var(--color-faint)]">
              SUBJECT {o.subject}
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[var(--color-accent-bright)]">
                <span
                  className={`inline-block size-1.5 rounded-full bg-current ${
                    reduced ? "" : "animate-pulse"
                  }`}
                />
                REC
              </span>
              <button
                type="button"
                onClick={() => setChoice(false)}
                aria-label="Collapse observation panel"
                className="text-[var(--color-faint)] transition-colors hover:text-[var(--color-ink)]"
              >
                —
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss observation panel permanently"
                className="text-[var(--color-faint)] transition-colors hover:text-[var(--color-ink)]"
              >
                ✕
              </button>
            </span>
          </header>

          <dl className="flex flex-col gap-1.5 px-3 py-3">
            <Row label="OBSERVED" value={clock(o.observedMs)} />
            {/* Cursor travel is meaningless without a fine pointer. */}
            <Row
              label={o.coarsePointer ? "TOUCH PATH" : "CURSOR PATH"}
              value={metres(o.cursorPx)}
            />
            <Row label="DESCENT" value={storeys(o.descentPx)} />

            {/* Revealed only once there's something real to show. */}
            {o.longestDwell ? (
              <Row
                label="LONGEST DWELL"
                value={`${o.longestDwell.label} — ${clock(o.longestDwell.ms)}`}
              />
            ) : null}
            {o.revisits ? (
              <Row
                label="REVISITS"
                value={`${o.revisits.label} ×${o.revisits.count}`}
              />
            ) : null}
            {o.idleMs > 3000 ? (
              <Row label="IDLE (THINKING)" value={clock(o.idleMs)} />
            ) : null}
          </dl>

          <div className="border-t border-[var(--color-line)] px-3 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[var(--color-faint)]">ENGAGEMENT</span>
              <span className="flex items-baseline gap-2">
                <span className="text-[var(--color-accent)]">
                  {bar(engagement)}
                </span>
                <span className="tabular-nums text-[var(--color-ink)]">
                  {engagement}%
                </span>
              </span>
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span className="text-[var(--color-faint)]">VERDICT</span>
              {verdict.action ? (
                <a
                  href={`mailto:${email}`}
                  className="text-[var(--color-accent-bright)] underline underline-offset-2"
                >
                  {verdict.label}
                </a>
              ) : (
                <span className="text-[var(--color-ink)]">{verdict.label}</span>
              )}
            </div>
          </div>

          {/* The honest part. Every other site collects this quietly. */}
          <footer className="border-t border-[var(--color-line)] px-3 py-3 text-[10px] leading-relaxed text-[var(--color-faint)]">
            <p>
              <span className="text-[var(--color-muted)]">LOCAL ONLY</span> —
              everything above is measured in your browser and never sent
              anywhere.
            </p>
            <p className="mt-1.5">
              <span className="text-[var(--color-muted)]">
                ALSO TRANSMITTED
              </span>{" "}
              — {TRANSMITTED_FIELDS.join(" · ")}. No cookies. Visitors are
              counted with a salted hash that is rotated daily and cannot be
              reversed.
            </p>
          </footer>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setChoice(true)}
          aria-label="Expand observation panel"
          className="pointer-events-auto flex items-center gap-2.5 border border-[var(--color-line-bright)] bg-[var(--color-bg)]/95 px-3 py-2 font-mono text-[11px] text-[var(--color-muted)] shadow-xl backdrop-blur-md transition-colors hover:text-[var(--color-ink)]"
        >
          <span
            className={`inline-block size-1.5 rounded-full bg-[var(--color-accent-bright)] ${
              reduced ? "" : "animate-pulse"
            }`}
          />
          <span className="text-[var(--color-accent-bright)]">REC</span>
          <span className="tabular-nums">{clock(o.observedMs)}</span>
        </button>
      )}
    </aside>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="shrink-0 text-[var(--color-faint)]">{label}</dt>
    <dd className="truncate text-right tabular-nums text-[var(--color-ink)]">
      {value}
    </dd>
  </div>
);
