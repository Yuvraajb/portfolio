import { appendFile, mkdir, readFile } from "fs/promises";
import path from "path";
import type { LeaderboardEntry } from "./types";

/**
 * Leaderboard storage, mirroring the analytics store's adapter pattern.
 *
 * One blob per entry rather than a single rewritten list: a read-modify-write
 * on one shared object races under concurrency and would silently drop
 * whichever submission lost. Entries are immutable, and the top N is computed
 * on read.
 *
 * Development always uses the filesystem, even when a Blob token is present —
 * `vercel link` writes BLOB_READ_WRITE_TOKEN into .env.local, and local
 * testing must not post fake scores to the real board.
 */

const PREFIX = "leaderboard/";
const FS_FILE = path.join(process.cwd(), ".leaderboard", "entries.ndjson");
/** Upper bound on entries read per request. */
const MAX_READ = 2000;

export type LeaderboardStore = {
  readonly configured: boolean;
  add(entry: LeaderboardEntry): Promise<void>;
  all(): Promise<LeaderboardEntry[]>;
};

const blobStore = (): LeaderboardStore => ({
  configured: true,

  async add(entry) {
    const { put } = await import("@vercel/blob");
    await put(`${PREFIX}${entry.id}.json`, JSON.stringify(entry), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  },

  async all() {
    const { list, get } = await import("@vercel/blob");
    const paths: string[] = [];
    let cursor: string | undefined;

    do {
      const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
      cursor = page.hasMore ? page.cursor : undefined;
      paths.push(...page.blobs.map((b) => b.pathname));
    } while (cursor && paths.length < MAX_READ);

    const out: LeaderboardEntry[] = [];
    const BATCH = 24;
    for (let i = 0; i < paths.length; i += BATCH) {
      const batch = await Promise.all(
        paths.slice(0, MAX_READ).slice(i, i + BATCH).map(async (p) => {
          try {
            const r = await get(p, { access: "private" });
            if (!r) return null;
            return JSON.parse(
              await new Response(r.stream).text(),
            ) as LeaderboardEntry;
          } catch {
            return null;
          }
        }),
      );
      out.push(...batch.filter((e): e is LeaderboardEntry => e !== null));
    }
    return out;
  },
});

const fsStore = (): LeaderboardStore => ({
  configured: true,

  async add(entry) {
    await mkdir(path.dirname(FS_FILE), { recursive: true });
    await appendFile(FS_FILE, JSON.stringify(entry) + "\n", "utf-8");
  },

  async all() {
    const raw = await readFile(FS_FILE, "utf-8").catch(() => "");
    const out: LeaderboardEntry[] = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line) as LeaderboardEntry);
      } catch {
        /* skip a torn line rather than failing the whole read */
      }
    }
    return out;
  },
});

const nullStore = (): LeaderboardStore => ({
  configured: false,
  async add() {},
  async all() {
    return [];
  },
});

let cached: LeaderboardStore | null = null;

export const getLeaderboardStore = (): LeaderboardStore => {
  if (cached) return cached;
  if (process.env.NODE_ENV === "development") cached = fsStore();
  else if (process.env.BLOB_READ_WRITE_TOKEN) cached = blobStore();
  else cached = nullStore();
  return cached;
};

/**
 * Top N, one entry per name — a single person refreshing shouldn't fill the
 * board with near-identical rows; only their best run shows.
 */
export const topEntries = (
  entries: LeaderboardEntry[],
  limit = 10,
): LeaderboardEntry[] => {
  const best = new Map<string, LeaderboardEntry>();
  for (const entry of entries) {
    const key = entry.name.toLowerCase();
    const existing = best.get(key);
    if (!existing || entry.score > existing.score) best.set(key, entry);
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, limit);
};
