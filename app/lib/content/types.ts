/** Domain types for everything the site renders. */

export type ProjectCategory = "ai" | "ios" | "quant" | "hardware" | "tools";

export type Project = {
  name: string;
  slug: string;
  /** `owner/repo`, when the project has a public GitHub home. */
  repo?: string;
  url?: string;
  demo?: string;
  year: string;
  category: ProjectCategory;
  tag?: string;
  award?: string;
  summary: string;
  description: string;
  stack: string[];
  highlights?: string[];
  featured?: boolean;
  private?: boolean;
  /** Merged in at read time from the GitHub API; absent if unavailable. */
  stats?: GitHubStats;
};

export type GitHubStats = {
  stars: number;
  forks: number;
  language: string | null;
  pushedAt: string;
  openIssues: number;
};

export type Post = {
  slug: string;
  title: string;
  description?: string;
  /** Raw markdown body. Empty for remote posts that live on Substack. */
  body: string;
  tags: string[];
  date: string;
  /** Set when the canonical copy lives off-site. */
  remoteUrl?: string;
  source: "local" | "substack";
  draft?: boolean;
};

export type PostSummary = Omit<Post, "body">;

export type BookStatus = "currently-reading" | "read" | "to-read";

export type Book = {
  title: string;
  author: string;
  status: BookStatus;
  cover?: string;
  link?: string;
  isbn?: string;
  rating?: number;
  dateRead?: string;
};

export type SocialLink = { label: string; url: string; icon: string };
export type NavLink = { label: string; url: string };

export type Pillar = {
  label: string;
  glyph: string;
  description: string;
};

export type SiteContent = {
  name: string;
  shortName: string;
  domain: string;
  role: string;
  tagline: string;
  bio: string;
  bioShort: string;
  roles: string[];
  location: string;
  avatar: string;
  email: string;
  pillars: Pillar[];
  stack: string[];
  externalBlog: { provider: string; feedUrl: string; profileUrl: string };
  goodreads: { userId: string; feedUrl: string; profileUrl: string };
  github: { username: string; url: string };
  social: SocialLink[];
  nav: NavLink[];
};
