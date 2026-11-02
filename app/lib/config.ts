/**
 * Single source of truth for the site's absolute URL and identity.
 *
 * Everything that needs an absolute URL (metadata, OG images, RSS, sitemap)
 * reads from here rather than hardcoding a domain, so previews and local dev
 * resolve correctly without conditional logic scattered across the app.
 */

const resolveSiteUrl = (): string => {
  if (process.env.SITE_URL) return process.env.SITE_URL;

  // Vercel injects this on preview deployments (no protocol).
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // The live site. This is a *fallback* — set SITE_URL explicitly in the
  // environment, especially before pointing a custom domain here. Getting it
  // wrong is quiet and expensive: canonicals, OG image URLs, the sitemap and
  // the RSS feed all advertise whatever this returns, so a stale value tells
  // search engines the real content lives somewhere it doesn't.
  return process.env.NODE_ENV === "production"
    ? "https://yuvraajb.vercel.app"
    : "http://localhost:3000";
};

const CONFIG = {
  SITE_URL: resolveSiteUrl(),
  NAME: "Yuvraaj Bhatter",
  SHORT_NAME: "Yuvraaj",
  // Doubles as the default meta description, so it is deliberately sized into
  // the 70–160 character window search engines display without truncating.
  TAGLINE:
    "Yuvraaj Bhatter — Computer Science at Santa Clara University, building at the intersection of AI, iOS, and quantitative finance.",
  TWITTER: "@bhatteryuvraaj",
} as const;

export default CONFIG;
