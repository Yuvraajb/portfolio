/**
 * In-memory sliding-window rate limiter.
 *
 * Scope note, stated plainly: this is per-instance. On Vercel's Fluid Compute
 * a single instance serves many concurrent requests and is reused, so this
 * genuinely throttles both telemetry floods and login brute-force from one
 * source — but it is not a global limiter, and a distributed attacker hitting
 * many instances could exceed the nominal rate. For a personal site that is
 * the right trade: no external dependency, no added latency on every request.
 * If the site ever needs hard global limits, swap this for Upstash Redis
 * behind the same function signature.
 */

type Bucket = { hits: number[]; blockedUntil?: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export const rateLimit = (
  key: string,
  limit: number,
  windowMs: number,
  /** Lockout applied once the limit is breached. Used for login. */
  blockMs = 0,
): RateLimitResult => {
  const now = Date.now();

  // Crude bound on memory: if the map runs away, drop the oldest half.
  if (buckets.size > MAX_KEYS) {
    const keys = [...buckets.keys()].slice(0, MAX_KEYS / 2);
    for (const k of keys) buckets.delete(k);
  }

  const bucket = buckets.get(key) ?? { hits: [] };

  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return { allowed: false, remaining: 0, retryAfterMs: bucket.blockedUntil - now };
  }

  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    if (blockMs > 0) bucket.blockedUntil = now + blockMs;
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: blockMs > 0 ? blockMs : windowMs - (now - bucket.hits[0]),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  return {
    allowed: true,
    remaining: limit - bucket.hits.length,
    retryAfterMs: 0,
  };
};

/** Clear a key's history — called after a successful login. */
export const resetRateLimit = (key: string) => buckets.delete(key);
