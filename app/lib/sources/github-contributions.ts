import { resilient } from "./resilient";

/**
 * The contribution calendar — the data behind GitHub's green squares.
 *
 * This is **GraphQL-only**; the REST API has no equivalent, which is why this
 * lives apart from `github.ts`. It also *requires* a token even for public
 * data, so without `GITHUB_TOKEN` the section degrades to nothing rather than
 * rendering an empty grid that looks like inactivity.
 *
 * GitHub's own quartile buckets are used rather than ours — they're computed
 * against the user's own distribution, so a busy week looks busy relative to
 * how this person actually works.
 */

export type ContributionLevel =
  | "NONE"
  | "FIRST_QUARTILE"
  | "SECOND_QUARTILE"
  | "THIRD_QUARTILE"
  | "FOURTH_QUARTILE";

export type ContributionDay = {
  date: string;
  count: number;
  level: ContributionLevel;
  /** 0 = Sunday, matching GitHub's grid rows. */
  weekday: number;
};

export type ContributionCalendar = {
  total: number;
  /** Outer = weeks (columns), inner = days (rows). */
  weeks: ContributionDay[][];
  commits: number;
  pullRequests: number;
  issues: number;
  newRepos: number;
  /** Longest run of consecutive active days in the window. */
  longestStreak: number;
  activeDays: number;
  busiestDay: { date: string; count: number } | null;
};

const QUERY = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalRepositoryContributions
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays { date contributionCount contributionLevel weekday }
          }
        }
      }
    }
  }
`;

type RawDay = {
  date: string;
  contributionCount: number;
  contributionLevel: ContributionLevel;
  weekday: number;
};

export const fetchContributions = async (
  login: string,
): Promise<ContributionCalendar | null> => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.warn(
      "[source:github-contributions] GITHUB_TOKEN unset — the contribution " +
        "calendar is GraphQL-only and needs one even for public data.",
    );
    return null;
  }

  return resilient("github-contributions", null, async () => {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: QUERY, variables: { login } }),
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 },
    } as RequestInit);

    const json = (await res.json()) as {
      errors?: { message: string }[];
      data?: {
        user: {
          contributionsCollection: {
            totalCommitContributions: number;
            totalPullRequestContributions: number;
            totalIssueContributions: number;
            totalRepositoryContributions: number;
            contributionCalendar: {
              totalContributions: number;
              weeks: { contributionDays: RawDay[] }[];
            };
          };
        } | null;
      };
    };

    if (json.errors?.length) throw new Error(json.errors[0].message);
    const cc = json.data?.user?.contributionsCollection;
    if (!cc) throw new Error(`No contributions data for "${login}"`);

    const weeks = cc.contributionCalendar.weeks.map((w) =>
      w.contributionDays.map(
        (d): ContributionDay => ({
          date: d.date,
          count: d.contributionCount,
          level: d.contributionLevel,
          weekday: d.weekday,
        }),
      ),
    );

    const days = weeks.flat();

    // Streak and peak in one pass over a chronologically ordered list.
    let longestStreak = 0;
    let run = 0;
    let busiestDay: ContributionCalendar["busiestDay"] = null;

    for (const day of days) {
      if (day.count > 0) {
        run += 1;
        longestStreak = Math.max(longestStreak, run);
      } else {
        run = 0;
      }
      if (!busiestDay || day.count > busiestDay.count) {
        busiestDay = { date: day.date, count: day.count };
      }
    }

    return {
      total: cc.contributionCalendar.totalContributions,
      weeks,
      commits: cc.totalCommitContributions,
      pullRequests: cc.totalPullRequestContributions,
      issues: cc.totalIssueContributions,
      newRepos: cc.totalRepositoryContributions,
      longestStreak,
      activeDays: days.filter((d) => d.count > 0).length,
      busiestDay: busiestDay && busiestDay.count > 0 ? busiestDay : null,
    };
  });
};
