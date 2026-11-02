import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  adminConfigured,
  createSession,
  sessionCookieOptions,
  verifyPassword,
} from "@/app/lib/auth";
import { rateLimit, resetRateLimit } from "@/app/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin login.
 *
 * Brute-force cover: 5 attempts per IP per 10 minutes, then a 15-minute
 * lockout. Failures always answer with the same generic message and a uniform
 * shape, so nothing distinguishes "wrong password" from "no such account".
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "0.0.0.0";

  const key = `login:${ip}`;
  const limit = rateLimit(key, 5, 10 * 60_000, 15 * 60_000);

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
      },
    );
  }

  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Admin is not configured on this deployment." },
      { status: 503 },
    );
  }

  const { password } = (await request.json().catch(() => ({}))) as {
    password?: string;
  };

  if (typeof password !== "string" || !verifyPassword(password)) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  resetRateLimit(key);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SESSION_COOKIE,
    await createSession(),
    sessionCookieOptions(SESSION_TTL_SECONDS),
  );
  return response;
}
