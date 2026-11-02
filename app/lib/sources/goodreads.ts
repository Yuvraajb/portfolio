import { readFile } from "fs/promises";
import path from "path";
import type { Book, BookStatus } from "../content/types";
import { fetchWithTimeout, resilient } from "./resilient";
import { items, tag } from "./xml";

/**
 * Goodreads shelves.
 *
 * Goodreads retired its public API and now gates the per-user RSS key behind a
 * signed-in session — the bare `list_rss/<id>` endpoint returns 404. So this
 * source works in two modes:
 *
 *   1. `GOODREADS_RSS_KEY` set → fetch the live shelves and use them.
 *   2. Otherwise → serve the last known-good snapshot in
 *      `content/bookshelf.json`.
 *
 * The snapshot is real data, so the bookshelf is correct either way; adding the
 * key simply makes it self-updating. To find the key: sign in to Goodreads, open
 * your "My Books" page, and copy the `key=` parameter from the RSS link in the
 * footer.
 */

const SHELVES: { remote: string; status: BookStatus }[] = [
  { remote: "currently-reading", status: "currently-reading" },
  { remote: "read", status: "read" },
  { remote: "to-read", status: "to-read" },
];

const snapshot = async (): Promise<Book[]> => {
  const file = path.join(process.cwd(), "content", "bookshelf.json");
  return JSON.parse(await readFile(file, "utf-8")) as Book[];
};

const parseShelf = (xml: string, status: BookStatus): Book[] =>
  items(xml).map((item) => {
    const cover =
      tag(item, "book_large_image_url") ||
      tag(item, "book_medium_image_url") ||
      tag(item, "book_image_url");
    const rating = Number(tag(item, "user_rating"));

    return {
      title: tag(item, "title"),
      author: tag(item, "author_name"),
      status,
      cover: cover || undefined,
      link: tag(item, "link") || undefined,
      isbn: tag(item, "isbn") || undefined,
      rating: Number.isFinite(rating) && rating > 0 ? rating : undefined,
      dateRead: tag(item, "user_read_at") || undefined,
    } satisfies Book;
  });

export const fetchBooks = async (userId: string): Promise<Book[]> => {
  const key = process.env.GOODREADS_RSS_KEY;
  if (!key) return snapshot();

  return resilient("goodreads", await snapshot(), async () => {
    const shelves = await Promise.all(
      SHELVES.map(async ({ remote, status }) => {
        const url =
          `https://www.goodreads.com/review/list_rss/${encodeURIComponent(userId)}` +
          `?key=${encodeURIComponent(key)}&shelf=${encodeURIComponent(remote)}&sort=date_updated`;
        const res = await fetchWithTimeout(url, {
          next: { revalidate: 3600 },
        } as RequestInit);
        return parseShelf(await res.text(), status);
      }),
    );

    const all = shelves.flat();
    // An empty live response means the key expired — keep the snapshot rather
    // than rendering an empty shelf.
    return all.length > 0 ? all : snapshot();
  });
};
