import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { getPosts, getProjects } from "@/app/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Returns the list of routes the SEO audit should cover.
 *
 * Deliberately does no fetching: the grading happens in the admin's browser
 * (see `app/admin/components/seo-panel.tsx`). A serverless function cannot
 * reliably request its own public hostname — every such request timed out in
 * production and scored a healthy site 0/100.
 */
export async function GET(request: NextRequest) {
  const authed = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [projects, posts] = await Promise.all([getProjects(), getPosts()]);

  const routes = [
    "/",
    "/work",
    "/writing",
    "/bookshelf",
    "/about",
    ...projects.slice(0, 5).map((p) => `/work/${p.slug}`),
    ...posts
      .filter((p) => p.source === "local")
      .slice(0, 3)
      .map((p) => `/writing/${p.slug}`),
  ];

  return NextResponse.json({ routes });
}
