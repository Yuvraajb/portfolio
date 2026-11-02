import { readFile, readdir } from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { fetchBooks as fetchGoodreads } from "../sources/goodreads";
import { fetchSubstackPosts } from "../sources/substack";
import { fetchRepoStats } from "../sources/github";
import type { Book, Post, Project, SiteContent } from "./types";

/**
 * The content *source* — the only module that knows where content physically
 * lives: `content/` on disk for curated material, plus the external feeds in
 * `lib/sources/` for anything that should stay current on its own.
 *
 * Nothing here is cached; caching is the caller's concern (see `./index.ts`).
 */

const CONTENT_DIR = path.join(process.cwd(), "content");

const readJson = async <T>(file: string): Promise<T> =>
  JSON.parse(await readFile(path.join(CONTENT_DIR, file), "utf-8")) as T;

export const fetchSite = async (): Promise<SiteContent> =>
  readJson<SiteContent>("site.json");

/**
 * Curated projects, enriched with live GitHub stats where a repo is known.
 * Enrichment is best-effort — `fetchRepoStats` resolves to null on failure.
 */
export const fetchProjects = async (): Promise<Project[]> => {
  const projects = await readJson<Project[]>("projects.json");

  return Promise.all(
    projects.map(async (project) => {
      if (!project.repo || project.private) return project;
      const stats = await fetchRepoStats(project.repo);
      return stats ? { ...project, stats } : project;
    }),
  );
};

export const fetchBooks = async (): Promise<Book[]> => {
  const site = await fetchSite();
  return fetchGoodreads(site.goodreads.userId);
};

/**
 * First ~155 characters of real prose, for use as a meta description.
 * Strips markdown syntax so the result reads as a sentence, and cuts on a word
 * boundary inside the window search engines actually display.
 */
const excerpt = (markdown: string, limit = 155): string => {
  const text = markdown
    .replace(/^#{1,6}\s+.*$/gm, "") // headings
    .replace(/```[\s\S]*?```/g, "") // code fences
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → their text
    .replace(/[*_`>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= limit) return text;
  const cut = text.lastIndexOf(" ", limit);
  return text.slice(0, cut > 80 ? cut : limit).trim() + "…";
};

/** `YYYY-MM-DD-slug.md` — date prefix is the publish date, rest is the slug. */
const parsePostFilename = (filename: string): { date: string; slug: string } => {
  const base = filename.replace(/\.md$/, "");
  const match = base.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  return match ? { date: match[1], slug: match[2] } : { date: "", slug: base };
};

const fetchLocalPosts = async (): Promise<Post[]> => {
  const dir = path.join(CONTENT_DIR, "posts");
  const files = (await readdir(dir).catch(() => [])).filter((f) =>
    f.endsWith(".md"),
  );

  return Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(dir, file), "utf-8");
      const { data, content } = matter(raw);
      const { date, slug } = parsePostFilename(file);

      return {
        slug: data.slug ?? slug,
        title: data.title ?? slug,
        // Without a description every post would inherit the site-wide one,
        // which makes them indistinguishable in search results. Derive one
        // from the opening prose instead.
        description: data.description ?? excerpt(content),
        body: content,
        tags: data.tags ?? [],
        date: data.date ?? date,
        source: "local" as const,
        draft: data.draft ?? false,
      } satisfies Post;
    }),
  );
};

/**
 * Local markdown and Substack posts, merged into one timeline.
 * Substack wins on slug collisions — if a post was cross-published, the
 * canonical copy is the one that's live.
 */
export const fetchPosts = async (): Promise<Post[]> => {
  const site = await fetchSite();
  const [local, remote] = await Promise.all([
    fetchLocalPosts(),
    fetchSubstackPosts(site.externalBlog.feedUrl),
  ]);

  const bySlug = new Map<string, Post>();
  for (const post of local) bySlug.set(post.slug, post);
  for (const post of remote) bySlug.set(post.slug, post);

  return [...bySlug.values()]
    .filter((post) => !post.draft && post.title)
    .sort((a, b) => b.date.localeCompare(a.date));
};

export const fetchPost = async (slug: string): Promise<Post | null> =>
  (await fetchPosts()).find((post) => post.slug === slug) ?? null;
