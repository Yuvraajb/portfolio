"use client";

import { useEffect } from "react";
import { TRANSMITTED_FIELDS } from "@/app/lib/analytics/transmitted";
import { useObservation } from "@/app/lib/observation/use-observation";
import { pxToMetres, pxToStoreys, score, verdictFor } from "@/app/lib/observation/verdict";
import { usePrefersReducedMotion } from "@/app/utils/use-reduced-motion";
import { useStoredFlag } from "@/app/utils/use-stored-flag";
import { CursorTrailCanvas } from "./cursor-trail-canvas";

/**
 * The site measures the visitor back — and shows them the picture.
 *
 * The first version of this was a column of mono labels and figures. Accurate,
 * on-theme, and cold: nobody screenshots a readout. The thing worth showing a
 * friend is *their own movement*, so the panel now leads with a live drawing
 * of the visitor's pointer trail and says the numbers as sentences underneath.
 *
 * Still contained: collapsed by default, dismissible for good, `fixed` so it
 * can never shift layout (CLS stays 0), and the canvas only runs while open.
 */

const DISMISSED_KEY = "yb_obs_dismissed";
const OPEN_KEY = "yb_obs_open";
/** Opens itself once there's a trail worth looking at. */
const AUTO_OPEN_AT = 18;

export const ObservationPanel = ({ email }: { email: string }) => {
  const reduced = usePrefersReducedMotion();
  const [dismissed, setDismissed] = useStoredFlag(DISMISSED_KEY);
  const [choice, setChoice] = useStoredFlag(OPEN_KEY);

  const o = useObservation(dismissed !== true);
  const engagement = score(o);
  const verdict = verdictFor(engagement);

  // Derived, not synced — see use-stored-flag. Engagement only rises, so this
  // can't flap, and the visitor's explicit choice always wins.
  const open = choice ?? (reduced === false && engagement >= AUTO_OPEN_AT);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChoice(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setChoice]);

  if (dismissed === true) return null;

  const metres = pxToMetres(o.cursorPx);
  const storeys = pxToStoreys(o.descentPx);

  return (
    <aside
      aria-label="A live drawing of how you've moved around this page"
      aria-live="off"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:px-0 sm:pb-0"
    >
      {open ? (
        <div className="pointer-events-auto w-full max-w-[20rem] overflow-hidden rounded-xl border border-[var(--color-line-bright)] bg-[var(--color-bg)]/92 shadow-2xl backdrop-blur-md">
          <header className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <p className="text-[13px] text-[var(--color-ink)]">
              You&rsquo;re drawing on my site
            </p>
            <span className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setChoice(false)}
                aria-label="Collapse"
                className="text-[var(--color-faint)] transition-colors hover:text-[var(--color-ink)]"
              >
                <span aria-hidden className="block text-xs leading-none">—</span>
              </button>
              <button
                type="button"
                onClick={() => setDismissed(true)}
                aria-label="Hide this for good"
                className="text-[var(--color-faint)] transition-colors hover:text-[var(--color-ink)]"
              >
                <span aria-hidden className="block text-xs leading-none">✕</span>
              </button>
            </span>
          </header>

          {/* The picture: their own pointer path, live. */}
          <div className="relative mx-4 aspect-[16/10] overflow-hidden rounded-lg border border-[var(--color-line)] bg-[radial-gradient(120%_90%_at_50%_0%,rgba(59,130,246,0.14),transparent_70%)]">
            <CursorTrailCanvas
              className="absolute inset-0 size-full"
              paused={reduced === true}
            />
            {o.cursorPx < 40 ? (
              <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-[11px] text-[var(--color-faint)]">
                {o.coarsePointer
                  ? "Swipe around — I'll draw it."
                  : "Move your mouse — I'll draw it."}
              </p>
            ) : null}
          </div>

          {/* The numbers, as sentences. */}
          <div className="flex flex-col gap-1 px-4 pt-3.5 text-[12px] leading-relaxed text-[var(--color-muted)]">
            <p>
              That line is{" "}
              <span className="text-[var(--color-accent-bright)] tabular-nums">
                {metres.toFixed(1)} m
              </span>{" "}
              long so far.
            </p>
            {storeys >= 0.4 ? (
              <p>
                You&rsquo;ve scrolled{" "}
                <span className="text-[var(--color-accent-bright)] tabular-nums">
                  {storeys.toFixed(1)}
                </span>{" "}
                {storeys < 1.5 ? "storeys" : "storeys"} of building.
              </p>
            ) : null}
            {o.revisits ? (
              <p>
                You keep going back to{" "}
                <span className="text-[var(--color-ink)]">
                  {o.revisits.label}
                </span>
                .
              </p>
            ) : null}
          </div>

          <div className="mt-3.5 flex items-center justify-between gap-3 border-t border-[var(--color-line)] px-4 py-3">
            <span className="flex items-center gap-2">
              <span
                className={`inline-block size-1.5 rounded-full bg-[var(--color-accent-bright)] ${
                  reduced ? "" : "animate-pulse"
                }`}
              />
              <span className="text-[12px] text-[var(--color-muted)]">
                {verdict.action ? (
                  <a
                    href={`mailto:${email}`}
                    className="text-[var(--color-accent-bright)] hover:underline"
                  >
                    {verdict.label}
                  </a>
                ) : (
                  verdict.label
                )}
              </span>
            </span>
            <span className="font-mono text-[10px] text-[var(--color-faint)] tabular-nums">
              {engagement}%
            </span>
          </div>

          {/* Kept, but demoted to a disclosure so it stops dominating the card.
              Every site collects this quietly; this one says so out loud. */}
          <details className="group border-t border-[var(--color-line)]">
            <summary className="cursor-pointer list-none px-4 py-2.5 text-[11px] text-[var(--color-faint)] transition-colors hover:text-[var(--color-muted)]">
              What do you actually know about me?
              <span
                aria-hidden
                className="float-right transition-transform group-open:rotate-180"
              >
                ⌄
              </span>
            </summary>
            <div className="px-4 pb-3.5 text-[11px] leading-relaxed text-[var(--color-faint)]">
              <p>
                The drawing and everything above it is measured in your browser
                and never sent anywhere.
              </p>
              <p className="mt-1.5">
                What does reach me: {TRANSMITTED_FIELDS.join(", ")}. No cookies,
                no ad networks. Visitors are counted with a salted hash that
                rotates daily and can&rsquo;t be reversed.
              </p>
            </div>
          </details>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setChoice(true)}
          // No aria-label here on purpose: the visible text *is* the
          // accessible name. An aria-label that doesn't contain the visible
          // text breaks voice control, because saying what you can see no
          // longer matches what the control is called.
          className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-[var(--color-line-bright)] bg-[var(--color-bg)]/92 py-2 pr-4 pl-3 text-[12px] text-[var(--color-muted)] shadow-xl backdrop-blur-md transition-colors hover:text-[var(--color-ink)]"
        >
          <span
            className={`inline-block size-1.5 rounded-full bg-[var(--color-accent-bright)] ${
              reduced ? "" : "animate-pulse"
            }`}
          />
          I&rsquo;m drawing your mouse
        </button>
      )}
    </aside>
  );
};
