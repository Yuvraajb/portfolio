/**
 * Every external data source goes through this.
 *
 * The rule from PLAN.md §4: a third-party outage must degrade the page, never
 * break it. Goodreads and Substack are RSS endpoints on someone else's
 * infrastructure — if either is slow or down, the bookshelf should render
 * empty, not throw a 500 into the whole route.
 */
export const resilient = async <T>(
  label: string,
  fallback: T,
  fn: () => Promise<T>,
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    // warn, not error: degrading to the fallback is the designed behaviour,
    // not a fault. Logging it at error level makes healthy runs look broken
    // and buries the failures that do matter.
    console.warn(
      `[source:${label}] unavailable, serving fallback —`,
      error instanceof Error ? error.message : error,
    );
    return fallback;
  }
};

/** fetch with a hard timeout, so a hanging feed can't stall a render. */
export const fetchWithTimeout = async (
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> => {
  const { timeoutMs = 8000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        // Some feed hosts reject requests without a UA.
        "User-Agent": "yuvraajb.dev (+https://yuvraajb.vercel.app)",
        ...rest.headers,
      },
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
};
