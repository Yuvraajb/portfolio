import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

/**
 * Markdown → HTML for post bodies and long-form content.
 *
 * Runs server-side only, so the parser never ships to the client.
 */
export const renderMarkdown = async (markdown: string): Promise<string> => {
  const file = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(markdown);

  return String(file);
};

/** Rough reading time in minutes, at ~220 wpm. */
export const readingTime = (markdown: string): number => {
  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
};
