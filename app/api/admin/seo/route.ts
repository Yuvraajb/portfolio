import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/app/lib/auth";
import { runSeoAudit } from "@/app/lib/seo/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** The audit fetches a dozen routes; give it room but never unbounded. */
export const maxDuration = 60;

/**
 * SEO audit, on its own endpoint rather than inline in the dashboard.
 *
 * Running it during the page render blocked `/admin` behind a dozen
 * self-requests and hung in production. Here the dashboard paints
 * immediately from stored analytics and the audit streams in afterwards.
 *
 * Gated by the same session cookie as the dashboard — `proxy.ts` only covers
 * `/admin*`, so this `/api/admin/*` route checks auth itself.
 */
export async function GET(request: NextRequest) {
  const authed = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await runSeoAudit());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Audit failed to complete.",
      },
      { status: 502 },
    );
  }
}
