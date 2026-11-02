/**
 * A deliberately small RSS reader.
 *
 * Both feeds we consume (Substack, Goodreads) are plain RSS 2.0, so pulling in
 * a full XML parser would be more dependency than the job needs. This handles
 * exactly the shape those feeds emit: flat `<item>` elements with text or
 * CDATA children.
 */

const decodeEntities = (value: string): string =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");

/** Pull the text of the first `<tag>` inside a chunk, CDATA-aware. */
export const tag = (xml: string, name: string): string => {
  const match = xml.match(
    new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"),
  );
  if (!match) return "";

  const raw = match[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return decodeEntities((cdata ? cdata[1] : raw).trim());
};

/** Split a feed into its `<item>` chunks. */
export const items = (xml: string): string[] =>
  xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];

/** Strip tags from an HTML blob and collapse whitespace, for summaries. */
export const stripHtml = (html: string, limit = 200): string => {
  const text = decodeEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= limit) return text;
  return text.slice(0, text.lastIndexOf(" ", limit)) + "…";
};

/** First `<img src>` in an HTML blob, used for post cover images. */
export const firstImage = (html: string): string | undefined =>
  html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];

/** RFC-822 (`Mon, 02 Jan 2026 …`) → `2026-01-02`. */
export const toIsoDate = (value: string): string => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toISOString().slice(0, 10);
};
