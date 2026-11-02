import CONFIG from "@/app/lib/config";
import { getPosts } from "@/app/lib/content";

/** Regenerate hourly; a content write can bust the `posts` tag for sooner. */
export const revalidate = 3600;

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function GET() {
  const posts = await getPosts();

  const items = posts
    .map((post) => {
      const url = post.remoteUrl ?? `${CONFIG.SITE_URL}/writing/${post.slug}`;
      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="false">${escapeXml(post.slug)}</guid>
      <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>
      ${post.description ? `<description>${escapeXml(post.description)}</description>` : ""}
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(CONFIG.NAME)}</title>
    <link>${CONFIG.SITE_URL}</link>
    <description>${escapeXml(CONFIG.TAGLINE)}</description>
    <language>en-us</language>
    <atom:link href="${CONFIG.SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  });
}
