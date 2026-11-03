/** A live reading of the visitor, as measured by the site. */
export type Observation = {
  /** Meaningless per-session hex, purely for the clinical register. */
  subject: string;
  /** Milliseconds since this session began. Survives route changes. */
  observedMs: number;
  /** Accumulated pointer travel, in CSS pixels. */
  cursorPx: number;
  /** Accumulated scroll travel (both directions), in CSS pixels. */
  descentPx: number;
  /** Milliseconds with no input while the tab was visible. */
  idleMs: number;
  /** Section label the visitor has spent longest inside, with its dwell. */
  longestDwell: { label: string; ms: number } | null;
  /** Most-revisited tagged element, by hover count. */
  revisits: { label: string; count: number } | null;
  /** True when the device has no fine pointer — cursor path is meaningless. */
  coarsePointer: boolean;

  /* Breadth — what the leaderboard actually scores. Distinct counts, kept in
     sessionStorage so they survive client-side navigation between routes. */
  /** Distinct routes visited this session. */
  pages: number;
  /** Distinct labelled sections actually seen. */
  sections: number;
  /** Distinct projects hovered or opened. */
  projects: number;
};

export type VerdictTier = {
  /** Lower bound of the engagement score, inclusive. */
  min: number;
  label: string;
  /** The top tier turns the bit into a call to action. */
  action?: boolean;
};
