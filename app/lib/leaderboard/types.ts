/** One entry on the exploration leaderboard. */
export type LeaderboardEntry = {
  id: string;
  /** Player-chosen, 2–12 chars, sanitised server-side. */
  name: string;
  score: number;
  /** Breakdown, shown on the board so a score is explicable. */
  pages: number;
  sections: number;
  projects: number;
  /** Metres of pointer travel. */
  distance: number;
  at: number;
};

export type Leaderboard = {
  configured: boolean;
  entries: LeaderboardEntry[];
};

/** What the client submits. Everything is re-validated and re-capped server-side. */
export type ScoreSubmission = {
  name: string;
  pages: number;
  sections: number;
  projects: number;
  distance: number;
  seconds: number;
};
