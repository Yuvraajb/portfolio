import type { Post } from "../content/types";
import { fetchWithTimeout, resilient } from "./resilient";
import { firstImage, items, stripHtml, tag, toIsoDate } from "./xml";

/**
 * Substack posts, pulled live from the publication's RSS feed.
 *
 * These are *remote* posts: the canonical copy lives on Substack, so each one
 * carries a `remoteUrl` and the site links out rather than rehosting the body.
 * Verified against the real feed shape at yuvraajb.substack.com/feed.
 */
export const fetchSubstackPosts = async (feedUrl: string): Promise<Post[]> =>
  resilient("substack", [], async () => {
    const res = await fetchWithTimeout(feedUrl, {
      next: { revalidate: 1800 },
    } as RequestInit);
    const xml = await res.text();

    return items(xml).map((item) => {
      // Substack puts the full HTML body in content:encoded and a short blurb
      // in description; prefer the blurb, fall back to trimming the body.
      const body = tag(item, "content:encoded");
      const blurb = tag(item, "description");
      const title = tag(item, "title");

      return {
        slug: slugFromLink(tag(item, "link"), title),
        title,
        description: stripHtml(blurb || body, 180),
        body: "",
        tags: ["substack"],
        date: toIsoDate(tag(item, "pubDate")),
        remoteUrl: tag(item, "link"),
        source: "substack" as const,
        cover: firstImage(body),
      } satisfies Post & { cover?: string };
    });
  });

/** `…/p/my-post-title` → `my-post-title`. */
const slugFromLink = (link: string, fallbackTitle: string): string => {
  const fromUrl = link.split("/p/")[1]?.split(/[?#]/)[0];
  if (fromUrl) return fromUrl;

  return fallbackTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
};
