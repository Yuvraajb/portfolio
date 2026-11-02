import type { Metadata } from "next";
import CONFIG from "./config";

/**
 * Keep meta descriptions inside the ~160 characters search engines render.
 *
 * Clamping centrally rather than hand-trimming each page means page copy can
 * be written for humans — a project's full prose description stays long on the
 * page itself and only the metadata copy is shortened, on a word boundary.
 */
const clampDescription = (value: string, limit = 158): string => {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;

  const cut = text.lastIndexOf(" ", limit - 1);
  return text.slice(0, cut > limit * 0.6 ? cut : limit - 1).trimEnd() + "…";
};

/**
 * One factory for every page's metadata, so title formatting, OG cards, and
 * robots directives stay identical sitewide. Pages call this from their
 * `generateMetadata` / `metadata` export instead of hand-rolling the object.
 *
 *   export const metadata = getMetadata({ title: "Projects", description: "..." });
 */
const getMetadata = ({
  title,
  description,
  subtitle,
  image,
  type = "website",
  noIndex = false,
}: {
  title?: string;
  description?: string;
  subtitle?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
} = {}): Metadata => {
  // Fall back to the dynamic OG route, which renders the title into a card.
  const ogImage =
    image ??
    (() => {
      const url = new URL("/og", CONFIG.SITE_URL);
      url.searchParams.set("title", title ?? CONFIG.NAME);
      if (subtitle ?? description) {
        url.searchParams.set("subtitle", subtitle ?? description ?? "");
      }
      return url.toString();
    })();

  // Search results truncate around 60 characters, so only append the name
  // suffix when it still fits — a long post title shouldn't get cut mid-word
  // just to carry a byline that's already obvious from the domain.
  const suffixed = title ? `${title} / ${CONFIG.NAME}` : CONFIG.NAME;
  const resolvedTitle = suffixed.length > 60 && title ? title : suffixed;

  const resolvedDescription = clampDescription(description ?? CONFIG.TAGLINE);

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    metadataBase: new URL(CONFIG.SITE_URL),
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      siteName: CONFIG.NAME,
      type,
      locale: "en_US",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      creator: CONFIG.TWITTER,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
  };
};

export default getMetadata;
