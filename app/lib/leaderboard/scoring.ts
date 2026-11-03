import type { ScoreSubmission } from "./types";

/**
 * Exploration scoring — shared by client and server.
 *
 * The brief is "you win by exploring more", so **breadth dominates**. Pages,
 * sections and projects are worth far more per unit than time or distance,
 * and time is capped hard: leaving a tab open overnight is the obvious
 * exploit, and if idling could win, nobody would bother exploring.
 *
 * The server recomputes the score from the submitted components rather than
 * trusting a score the client sends, so a tampered total is simply ignored.
 * The components themselves are clamped to plausible ranges first.
 */

/**
 * Hard ceilings, calibrated against how big the site actually is.
 *
 * These were originally guesses (12 pages, 120 m, 6 minutes) that no real
 * visitor could approach, which left the progress bar permanently near empty
 * and put the submit threshold out of reach for someone who had genuinely
 * looked around. A thorough visit should get close to 100%.
 */
export const CAPS = {
  /** ~5 top-level routes plus a few project/post pages. */
  pages: 8,
  sections: 8,
  projects: 10,
  /** Metres of pointer travel that still count. */
  distance: 60,
  /** Seconds that still count — 4 minutes. Idling past this earns nothing. */
  seconds: 240,
} as const;

export const POINTS = {
  perPage: 110,
  perSection: 55,
  perProject: 45,
  /** Per metre of pointer travel. */
  perMetre: 3,
  /**
   * Per second present, capped by CAPS.seconds.
   *
   * Deliberately small. At 0.6 a visitor who loaded one page and walked away
   * reached exactly the submit threshold — which made the panel's own claim
   * that "sitting still barely counts" false. At 0.3 the same idle run lands
   * around 11%, below the bar, and time can never carry a run on its own.
   */
  perSecond: 0.3,
} as const;

const clamp = (value: number, max: number): number => {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.floor(value * 100) / 100, max);
};

/** Clamp every component to a sane range. Always run before scoring. */
export const sanitise = (
  s: Partial<ScoreSubmission>,
): Omit<ScoreSubmission, "name"> => ({
  pages: clamp(s.pages ?? 0, CAPS.pages),
  sections: clamp(s.sections ?? 0, CAPS.sections),
  projects: clamp(s.projects ?? 0, CAPS.projects),
  distance: clamp(s.distance ?? 0, CAPS.distance),
  seconds: clamp(s.seconds ?? 0, CAPS.seconds),
});

export const scoreOf = (s: Omit<ScoreSubmission, "name">): number =>
  Math.round(
    s.pages * POINTS.perPage +
      s.sections * POINTS.perSection +
      s.projects * POINTS.perProject +
      s.distance * POINTS.perMetre +
      s.seconds * POINTS.perSecond,
  );

/**
 * Rough plausibility gate.
 *
 * A human cannot move a pointer 120 metres in four seconds, nor visit nine
 * pages instantly. This won't stop someone determined — anything the browser
 * can send, a script can forge — but it costs nothing and filters the lazy
 * attempt of posting maxed-out numbers.
 */
export const isPlausible = (s: Omit<ScoreSubmission, "name">): boolean => {
  if (s.seconds < 3) return false;
  // ~2.5 m/s of sustained pointer travel is already very fast.
  if (s.distance > s.seconds * 2.5) return false;
  // A page visit needs at least a couple of seconds.
  if (s.pages > Math.ceil(s.seconds / 2) + 1) return false;
  return true;
};

/** The highest score currently reachable, for the progress bar. */
export const MAX_SCORE = scoreOf({
  pages: CAPS.pages,
  sections: CAPS.sections,
  projects: CAPS.projects,
  distance: CAPS.distance,
  seconds: CAPS.seconds,
});

/** Names nobody else gets to use — the board shouldn't be impersonable. */
const RESERVED = /^(yuvraaj|admin|moderator|owner|system|null|undefined)$/i;

/**
 * 2–12 visible characters.
 *
 * Strips control codes and zero-width / bidi characters. The latter matter
 * because this list renders untrusted strings from strangers next to each
 * other, and a bidi override can make a name display as something else
 * entirely.
 */
export const cleanName = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;

  const name = raw
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12);

  if (name.length < 2) return null;
  if (RESERVED.test(name)) return null;
  return name;
};
