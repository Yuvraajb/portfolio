import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";

/**
 * Edge-level request shaping, ahead of any route resolution.
 *
 * Two jobs:
 *   1. Gate `/admin` — an unauthenticated request is redirected to the login
 *      screen *before* a dashboard page is ever rendered, so private data can't
 *      leak through a streaming response or an error boundary.
 *   2. Canonicalize legacy URLs from the previous static site so existing
 *      links and search results don't 404.
 *
 * Security headers are applied here too, which means they cover every response
 * including API routes and redirects.
 */

const LEGACY_REDIRECTS: Record<string, string> = {
  "/blog": "/writing",
  "/projects": "/work",
};

/**
 * Content Security Policy.
 *
 * Notes on the two loosenings, both of which are forced rather than lazy:
 *   - `'unsafe-inline'` in style-src: Next.js and the React Bits components
 *     set inline styles for animation transforms. A nonce can't cover styles
 *     written by JS at runtime.
 *   - `'unsafe-eval'` in script-src for development only: the dev bundler and
 *     React Fast Refresh require it. Production gets the stricter policy.
 *
 * `img-src` allows the Goodreads and Substack CDNs because book covers and
 * post images come from them; everything else is same-origin only.
 */
const csp = (): string =>
  [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://i.gr-assets.com https://images-na.ssl-images-amazon.com https://substackcdn.com https://*.substack.com",
    "font-src 'self' data:",
    "connect-src 'self' https://va.vercel-scripts.com https://vitals.vercel-insights.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "Content-Security-Policy": csp(),
};

const withSecurityHeaders = (response: NextResponse): NextResponse => {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
};

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  // 1. Admin gate
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const authed = await verifySession(
      request.cookies.get(SESSION_COOKIE)?.value,
    );

    if (!authed && pathname !== "/admin/login") {
      const login = url.clone();
      login.pathname = "/admin/login";
      login.search = "";
      return withSecurityHeaders(NextResponse.redirect(login));
    }

    // Already signed in — don't show the login form again.
    if (authed && pathname === "/admin/login") {
      const dashboard = url.clone();
      dashboard.pathname = "/admin";
      return withSecurityHeaders(NextResponse.redirect(dashboard));
    }

    // Never let an admin page be cached or indexed.
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return withSecurityHeaders(response);
  }

  // 2. Legacy URL canonicalization
  for (const [from, to] of Object.entries(LEGACY_REDIRECTS)) {
    if (pathname === from || pathname.startsWith(`${from}/`)) {
      const next = url.clone();
      next.pathname = pathname.replace(from, to);
      return withSecurityHeaders(NextResponse.redirect(next, 308));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|feed.xml).*)",
  ],
};
