import type { GitHubStats } from "../content/types";
import { fetchWithTimeout, resilient } from "./resilient";

/**
 * Live repository stats, used to *enrich* the curated project list — never to
 * generate it.
 *
 * That direction matters: `content/projects.json` stays the source of truth for
 * what's shown and how it's described, and GitHub only layers stars/language/
 * last-push on top. A rate limit or outage therefore costs a few numbers, not
 * the entire work page.
 *
 * Set `GITHUB_TOKEN` to lift the unauthenticated 60 req/hour limit to 5,000.
 */

const API = "https://api.github.com";

const headers = (): HeadersInit => {
  const base: HeadersInit = { Accept: "application/vnd.github+json" };
  const token = process.env.GITHUB_TOKEN;
  return token ? { ...base, Authorization: `Bearer ${token}` } : base;
};

export const fetchRepoStats = async (
  repo: string,
): Promise<GitHubStats | null> =>
  resilient(`github:${repo}`, null, async () => {
    const res = await fetchWithTimeout(`${API}/repos/${repo}`, {
      headers: headers(),
      // Cache for an hour — stars don't move fast enough to matter.
      next: { revalidate: 3600 },
    } as RequestInit);

    const data = (await res.json()) as {
      stargazers_count: number;
      forks_count: number;
      language: string | null;
      pushed_at: string;
      open_issues_count: number;
    };

    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language,
      pushedAt: data.pushed_at,
      openIssues: data.open_issues_count,
    };
  });

/** Aggregate profile numbers for the landing-page counters. */
export const fetchProfileStats = async (
  username: string,
): Promise<{ repos: number; followers: number } | null> =>
  resilient(`github:profile`, null, async () => {
    const res = await fetchWithTimeout(`${API}/users/${username}`, {
      headers: headers(),
      next: { revalidate: 3600 },
    } as RequestInit);

    const data = (await res.json()) as {
      public_repos: number;
      followers: number;
    };
    return { repos: data.public_repos, followers: data.followers };
  });
