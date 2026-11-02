import { unstable_cache } from "next/cache";
import * as source from "./source";
import type {
  Book,
  Post,
  PostSummary,
  Project,
  ProjectCategory,
  SiteContent,
} from "./types";

/**
 * The cached read layer — the public API for all content access.
 *
 * Every read goes through `cached()`, which bypasses the cache in development
 * (so edits to `content/` appear on refresh) and applies a cache tag in
 * production (so a sync or write can `revalidateTag` for near-immediate
 * refresh instead of waiting out a timer).
 *
 * Pages import from here and never touch `./source` directly. That indirection
 * is what keeps the storage backend swappable.
 */

export const CACHE_TAGS = {
  site: "site",
  posts: "posts",
  projects: "projects",
  books: "books",
} as const;

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyFn = (...args: any[]) => Promise<any>;

const cached = <T extends AnyFn>(fn: T, tags: string[]): T => {
  if (process.env.NODE_ENV === "development") return fn;
  return unstable_cache(fn as AnyFn, undefined, { tags }) as T;
};

/** Drop the markdown body so list views don't ship full post text. */
const toSummary = (post: Post): PostSummary => ({
  slug: post.slug,
  title: post.title,
  description: post.description,
  tags: post.tags,
  date: post.date,
  remoteUrl: post.remoteUrl,
  source: post.source,
  draft: post.draft,
});

export const getSite = cached(source.fetchSite, [CACHE_TAGS.site]);

export const getProjects = cached(source.fetchProjects, [CACHE_TAGS.projects]);

export const getProject = cached(
  async (slug: string): Promise<Project | null> =>
    (await source.fetchProjects()).find((p) => p.slug === slug) ?? null,
  [CACHE_TAGS.projects],
);

export const getFeaturedProjects = cached(
  async (limit = 4): Promise<Project[]> => {
    const projects = await source.fetchProjects();
    const featured = projects.filter((p) => p.featured);
    return (featured.length > 0 ? featured : projects).slice(0, limit);
  },
  [CACHE_TAGS.projects],
);

export const getProjectCategories = cached(
  async (): Promise<ProjectCategory[]> => {
    const projects = await source.fetchProjects();
    return [...new Set(projects.map((p) => p.category))];
  },
  [CACHE_TAGS.projects],
);

export const getPosts = cached(
  async (): Promise<PostSummary[]> =>
    (await source.fetchPosts()).map(toSummary),
  [CACHE_TAGS.posts],
);

export const getPost = cached(
  async (slug: string): Promise<Post | null> => source.fetchPost(slug),
  [CACHE_TAGS.posts],
);

export const getRelatedPosts = cached(
  async (slug: string, limit = 3): Promise<PostSummary[]> => {
    const posts = await source.fetchPosts();
    const currentTags = new Set(
      posts.find((p) => p.slug === slug)?.tags ?? [],
    );

    return posts
      .filter((p) => p.slug !== slug)
      .map((post) => ({
        post,
        overlap: post.tags.filter((t) => currentTags.has(t)).length,
      }))
      .sort(
        (a, b) => b.overlap - a.overlap || b.post.date.localeCompare(a.post.date),
      )
      .slice(0, limit)
      .map(({ post }) => toSummary(post));
  },
  [CACHE_TAGS.posts],
);

export const getBooks = cached(source.fetchBooks, [CACHE_TAGS.books]);

export const getBooksByStatus = cached(
  async (): Promise<Record<Book["status"], Book[]>> => {
    const books = await source.fetchBooks();
    return {
      "currently-reading": books.filter((b) => b.status === "currently-reading"),
      read: books.filter((b) => b.status === "read"),
      "to-read": books.filter((b) => b.status === "to-read"),
    };
  },
  [CACHE_TAGS.books],
);

export type { Book, Post, PostSummary, Project, ProjectCategory, SiteContent };
