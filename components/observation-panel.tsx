"use client";

import { useEffect, useState } from "react";
import { TRANSMITTED_FIELDS } from "@/app/lib/analytics/transmitted";
import { useObservation } from "@/app/lib/observation/use-observation";
import { pxToMetres } from "@/app/lib/observation/verdict";
import { MAX_SCORE, sanitise, scoreOf } from "@/app/lib/leaderboard/scoring";
import type { LeaderboardEntry } from "@/app/lib/leaderboard/types";
import { usePrefersReducedMotion } from "@/app/utils/use-reduced-motion";
import { useStoredFlag } from "@/app/utils/use-stored-flag";
import { CursorTrailCanvas } from "./cursor-trail-canvas";

/**
 * Explorer's leaderboard.
 *
 * The site watches how much of itself you actually look at and scores it, with
 * your own pointer trail drawn live as the visual. Breadth is what wins —
 * pages, sections and projects are worth far more than time, so idling on one
 * page can't beat genuinely wandering around (see lib/leaderboard/scoring).
 *
 * Contained by design: collapsed by default, dismissible for good, `fixed` so
 * it can never shift layout, and the canvas only runs while open.
 */

const DISMISSED_KEY = "yb_obs_dismissed";
const OPEN_KEY = "yb_obs_open";
const SUBMITTED_KEY = "yb_lb_submitted";
/** Opens itself once there's a run worth showing. */
const AUTO_OPEN_AT = 0.1;
/** Below this you can't submit — keeps drive-by visits off the board, while
 *  staying reachable for anyone who has actually looked at a couple of pages. */
const SUBMIT_AT = 0.15;

type Board = { entries: LeaderboardEntry[]; configured: boolean };

export const ObservationPanel = ({ email }: { email: string }) => {
  const reduced = usePrefersReducedMotion();
  const [dismissed, setDismissed] = useStoredFlag(DISMISSED_KEY);
  const [choice, setChoice] = useStoredFlag(OPEN_KEY);

  const o = useObservation(dismissed !== true);

  const [board, setBoard] = useState<Board | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ rank: number | null; id: string } | null>(
    null,
  );

  // Score the live run exactly the way the server will, so the number on
  // screen is the number that gets recorded.
  const parts = sanitise({
    pages: o.pages,
    sections: o.sections,
    projects: o.projects,
    distance: pxToMetres(o.cursorPx),
    seconds: Math.round(o.observedMs / 1000),
  });
  const score = scoreOf(parts);
  const progress = Math.min(1, score / MAX_SCORE);

  const open = choice ?? (reduced === false && progress >= AUTO_OPEN_AT);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChoice(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setChoice]);

  // Fetch the board once the panel is actually open — no network cost for
  // visitors who never expand it.
  useEffect(() => {
    if (!open || board) return;
    let cancelled = false;
    fetch("/api/leaderboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Board) => !cancelled && setBoard(d))
      .catch(() => !cancelled && setBoard({ entries: [], configured: false }));
    return () => {
      cancelled = true;
    };
  }, [open, board]);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ...parts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't submit.");
      setBoard({ entries: data.entries, configured: true });
      setPlaced({ rank: data.rank, id: data.you.id });
      sessionStorage.setItem(SUBMITTED_KEY, "1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't submit.");
    } finally {
      setSubmitting(false);
    }
  };

  if (dismissed === true) return null;

  const canSubmit = progress >= SUBMIT_AT && name.trim().length >= 2;
  const alreadySubmitted =
    placed !== null ||
    (typeof window !== "undefined" &&
      sessionStorage.getItem(SUBMITTED_KEY) === "1");

  return (
    <aside
      aria-label="Explorer's leaderboard"
      aria-live="off"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:px-0 sm:pb-0"
    >
      {open ? (
        <div className="pointer-events-auto flex max-h-[85vh] w-full max-w-[20rem] flex-col overflow-y-auto rounded-xl border border-[var(--color-line-bright)] bg-[var(--color-bg)]/93 shadow-2xl backdrop-blur-md">
          <header className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <p className="text-[13px] text-[var(--color-ink)]">
              Explorer&rsquo;s leaderboard
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

          {/* Your run, drawn live. */}
          <div className="relative mx-4 aspect-[16/9] overflow-hidden rounded-lg border border-[var(--color-line)] bg-[radial-gradient(120%_90%_at_50%_0%,rgba(59,130,246,0.14),transparent_70%)]">
            <CursorTrailCanvas
              className="absolute inset-0 size-full"
              paused={reduced === true}
              hint={
                o.coarsePointer
                  ? "Swipe around — I'll draw it."
                  : "Move your mouse — I'll draw it."
              }
            />
          </div>

          <div className="px-4 pt-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] text-[var(--color-muted)]">
                Your score
              </span>
              <span className="font-mono text-lg text-[var(--color-ink)] tabular-nums">
                {score.toLocaleString()}
              </span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--color-accent-bright)] transition-[width] duration-500"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>

            {/* Breadth beats time, so show where the points came from. */}
            <p className="mt-2.5 font-mono text-[10px] text-[var(--color-faint)]">
              {parts.pages} page{parts.pages === 1 ? "" : "s"} ·{" "}
              {parts.sections} section{parts.sections === 1 ? "" : "s"} ·{" "}
              {parts.projects} project{parts.projects === 1 ? "" : "s"} ·{" "}
              {parts.distance.toFixed(1)} m
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-faint)]">
              Explore more of the site to score higher. Sitting still barely
              counts.
            </p>
          </div>

          {/* Submit */}
          {board?.configured === false ? null : alreadySubmitted ? (
            <p className="mx-4 mt-3.5 rounded-md border border-[var(--color-line)] px-3 py-2 text-[11px] text-[var(--color-muted)]">
              {placed?.rank
                ? `You're #${placed.rank} on the board. Nice.`
                : "Submitted — keep exploring to beat it."}
            </p>
          ) : (
            <div className="mt-3.5 px-4">
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={12}
                  placeholder="Your name"
                  aria-label="Your name for the leaderboard"
                  className="min-w-0 flex-1 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12px] text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--color-faint)] focus:border-[var(--color-accent)]"
                />
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit || submitting}
                  className="shrink-0 rounded-md border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3 py-1.5 text-[12px] text-[var(--color-accent-bright)] transition-colors hover:bg-[var(--color-accent)]/20 disabled:cursor-not-allowed disabled:border-[var(--color-line)] disabled:text-[var(--color-faint)]"
                >
                  {submitting ? "…" : "Enter"}
                </button>
              </div>
              {progress < SUBMIT_AT ? (
                <p className="mt-1.5 text-[10px] text-[var(--color-faint)]">
                  Explore a bit more before you can enter.
                </p>
              ) : null}
              {error ? (
                <p role="alert" className="mt-1.5 text-[10px] text-amber-300">
                  {error}
                </p>
              ) : null}
            </div>
          )}

          {/* The board */}
          {board && board.entries.length > 0 ? (
            <ol className="mt-4 border-t border-[var(--color-line)]">
              {board.entries.map((entry, i) => (
                <li
                  key={entry.id}
                  className={`flex items-baseline gap-3 px-4 py-1.5 text-[11px] ${
                    placed?.id === entry.id
                      ? "bg-[var(--color-accent)]/10 text-[var(--color-accent-bright)]"
                      : "text-[var(--color-muted)]"
                  }`}
                >
                  <span className="w-4 shrink-0 text-right font-mono text-[var(--color-faint)] tabular-nums">
                    {i + 1}
                  </span>
                  {/* Untrusted text from strangers — sanitised on write, and
                      truncated here so a long name can't break the row. */}
                  <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                  <span className="shrink-0 font-mono tabular-nums">
                    {entry.score.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}

          <details className="group mt-auto border-t border-[var(--color-line)]">
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
                The drawing and your score are worked out in your browser.
                Nothing is sent unless you choose to enter the board, and then
                it&rsquo;s just the name you typed and the numbers above.
              </p>
              <p className="mt-1.5">
                Separately, like any site: {TRANSMITTED_FIELDS.join(", ")}. No
                cookies, no ad networks. Visitors are counted with a salted hash
                that rotates daily and can&rsquo;t be reversed.
              </p>
              <p className="mt-1.5">
                Found a way to cheat it?{" "}
                <a
                  href={`mailto:${email}`}
                  className="text-[var(--color-muted)] underline underline-offset-2 hover:text-[var(--color-accent-bright)]"
                >
                  Tell me
                </a>
                .
              </p>
            </div>
          </details>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setChoice(true)}
          className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-[var(--color-line-bright)] bg-[var(--color-bg)]/92 py-2 pr-4 pl-3 text-[12px] text-[var(--color-muted)] shadow-xl backdrop-blur-md transition-colors hover:text-[var(--color-ink)]"
        >
          <span
            className={`inline-block size-1.5 rounded-full bg-[var(--color-accent-bright)] ${
              reduced ? "" : "animate-pulse"
            }`}
          />
          Explorer score {score.toLocaleString()}
        </button>
      )}
    </aside>
  );
};
