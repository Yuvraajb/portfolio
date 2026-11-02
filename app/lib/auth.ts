/**
 * Admin session auth.
 *
 * Deliberately dependency-free and built on Web Crypto so the *same* code runs
 * in `proxy.ts` (which gates `/admin` before a page ever renders) and in route
 * handlers. A second implementation for a second runtime is exactly how auth
 * holes appear.
 *
 * Design:
 *   - Session is a signed token, not a bearer of the password. The password
 *     never leaves the server and is never stored in the cookie.
 *   - HMAC-SHA256 over `{exp}` with `ADMIN_SESSION_SECRET`. Tampering with the
 *     expiry invalidates the signature.
 *   - Constant-time comparison everywhere, so neither the password check nor
 *     the signature check leaks information through timing.
 *   - Cookie is HttpOnly + Secure + SameSite=Strict: unreadable from JS,
 *     HTTPS-only, and not sent on cross-site requests (which is CSRF cover for
 *     the login and logout endpoints).
 */

export const SESSION_COOKIE = "yb_admin";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

const encoder = new TextEncoder();

const b64url = (bytes: ArrayBuffer | Uint8Array): string => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Compare two strings without leaking their divergence point via timing. */
export const safeEqual = (a: string, b: string): boolean => {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  // Always compare the same number of bytes; length difference is folded in.
  const length = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < length; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
};

const secret = (): string | null => process.env.ADMIN_SESSION_SECRET ?? null;

const sign = async (payload: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret() ?? ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
};

/** Issue a signed session token. */
export const createSession = async (): Promise<string> => {
  const payload = b64url(
    encoder.encode(JSON.stringify({ exp: Date.now() + SESSION_TTL_MS })),
  );
  return `${payload}.${await sign(payload)}`;
};

/** Verify signature and expiry. Returns false for anything malformed. */
export const verifySession = async (token: string | undefined): Promise<boolean> => {
  if (!token || !secret()) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  if (!safeEqual(signature, await sign(payload))) return false;

  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { exp } = JSON.parse(json) as { exp?: number };
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
};

/** Check a submitted password against `ADMIN_PASSWORD`. */
export const verifyPassword = (candidate: string): boolean => {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !secret()) return false;
  // Reject trivially short secrets rather than pretending they're safe.
  if (expected.length < 12) {
    console.error("ADMIN_PASSWORD must be at least 12 characters.");
    return false;
  }
  return safeEqual(candidate, expected);
};

export const sessionCookieOptions = (maxAgeSeconds: number) =>
  ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  });

export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

/** True when the admin surface has been configured at all. */
export const adminConfigured = (): boolean =>
  Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
