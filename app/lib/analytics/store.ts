import { appendFile, mkdir, readFile, readdir } from "fs/promises";
import path from "path";
import type { AnalyticsEvent } from "./types";

/**
 * Storage for analytics events, behind an adapter boundary.
 *
 * PLAN.md §11.3: the dashboard must be *honest* about whether it has a real
 * store. Serverless has no writable filesystem, so local dev and production
 * genuinely need different backends — and if production has neither, the
 * dashboard should say "not configured" rather than render convincing zeros.
 *
 *   - Vercel Blob  → production, chosen when BLOB_READ_WRITE_TOKEN is present.
 *     One blob per event (`analytics/YYYY-MM-DD/<id>.json`) so concurrent
 *     writes can't clobber each other the way a read-modify-write append would.
 *   - Filesystem   → local dev, NDJSON per day under `.analytics/`.
 *   - None         → writes are dropped, `configured` reports false.
 */

export type Store = {
  readonly name: string;
  readonly configured: boolean;
  append(event: AnalyticsEvent): Promise<void>;
  /** Inclusive range of `YYYY-MM-DD` day keys. */
  range(days: string[]): Promise<AnalyticsEvent[]>;
};

const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

/** Most recent N events read per dashboard load — bounds the worst case. */
const MAX_EVENTS = 4000;
/** Simultaneous blob reads. Enough to be fast, not enough to exhaust sockets. */
const READ_CONCURRENCY = 24;

/* ------------------------------------------------------------------ Blob */

const blobStore = (): Store => ({
  name: "vercel-blob",
  configured: true,

  async append(event) {
    const { put } = await import("@vercel/blob");
    // `private`: these records describe real visitors. Even hashed, they have
    // no business being fetchable by anyone who guesses a URL.
    await put(
      `analytics/${dayKey(event.ts)}/${event.id}.json`,
      JSON.stringify(event),
      {
        access: "private",
        contentType: "application/json",
        addRandomSuffix: false,
      },
    );
  },

  async range(days) {
    const { list, get } = await import("@vercel/blob");

    // One paginated listing under `analytics/`, filtered in memory — rather
    // than a separate `list()` per day, which cost 30 round trips even for
    // days with no events.
    const wanted = new Set(days);
    const paths: string[] = [];
    let cursor: string | undefined;

    do {
      const page = await list({ prefix: "analytics/", cursor, limit: 1000 });
      cursor = page.hasMore ? page.cursor : undefined;

      for (const blob of page.blobs) {
        // analytics/YYYY-MM-DD/<id>.json
        const day = blob.pathname.split("/")[1];
        if (wanted.has(day)) paths.push(blob.pathname);
      }
    } while (cursor && paths.length < MAX_EVENTS);

    // Private blobs aren't fetchable by URL, so each is read back through the
    // authenticated SDK. Bounded concurrency keeps a busy month from opening
    // hundreds of simultaneous connections inside one function.
    const out: AnalyticsEvent[] = [];
    const capped = paths.slice(-MAX_EVENTS);

    for (let i = 0; i < capped.length; i += READ_CONCURRENCY) {
      const batch = await Promise.all(
        capped.slice(i, i + READ_CONCURRENCY).map(async (pathname) => {
          try {
            const result = await get(pathname, { access: "private" });
            if (!result) return null;
            return JSON.parse(
              await new Response(result.stream).text(),
            ) as AnalyticsEvent;
          } catch {
            return null;
          }
        }),
      );
      out.push(...batch.filter((e): e is AnalyticsEvent => e !== null));
    }

    return out;
  },
});

/* ------------------------------------------------------------ Filesystem */

const FS_DIR = path.join(process.cwd(), ".analytics");

const fsStore = (): Store => ({
  name: "filesystem",
  configured: true,

  async append(event) {
    await mkdir(FS_DIR, { recursive: true });
    await appendFile(
      path.join(FS_DIR, `${dayKey(event.ts)}.ndjson`),
      JSON.stringify(event) + "\n",
      "utf-8",
    );
  },

  async range(days) {
    const files = await readdir(FS_DIR).catch(() => [] as string[]);
    const out: AnalyticsEvent[] = [];

    for (const day of days) {
      const name = `${day}.ndjson`;
      if (!files.includes(name)) continue;

      const raw = await readFile(path.join(FS_DIR, name), "utf-8").catch(() => "");
      for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        try {
          out.push(JSON.parse(line) as AnalyticsEvent);
        } catch {
          /* skip a torn line rather than failing the whole read */
        }
      }
    }

    return out;
  },
});

/* ----------------------------------------------------------------- None */

const nullStore = (): Store => ({
  name: "none",
  configured: false,
  async append() {},
  async range() {
    return [];
  },
});

let cached: Store | null = null;

export const getStore = (): Store => {
  if (cached) return cached;

  // Development ALWAYS uses the filesystem, even when a Blob token is present.
  // `vercel link` and `vercel blob create-store` both write
  // BLOB_READ_WRITE_TOKEN into .env.local, so checking the token first meant
  // every local page load was writing into the production analytics store and
  // polluting real visitor data. Dev traffic must never reach it.
  if (process.env.NODE_ENV === "development") cached = fsStore();
  else if (process.env.BLOB_READ_WRITE_TOKEN) cached = blobStore();
  else cached = nullStore();

  return cached;
};

/** The last `n` day keys, oldest first. */
export const lastDays = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
