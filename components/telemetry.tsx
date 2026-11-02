"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * First-party, cookieless telemetry.
 *
 * Sends three kinds of signal to `/api/collect`:
 *   - `view`      once per route change
 *   - `engage`    on leave, carrying dwell time and max scroll depth
 *   - `outbound`  when a link to another origin is clicked
 *
 * Everything is fire-and-forget and failure-silent: analytics must never be
 * able to break a page. `sendBeacon` is used on exit because a normal fetch is
 * cancelled when the document unloads.
 */
export const Telemetry = () => {
  const pathname = usePathname();
  const start = useRef(Date.now());
  const maxScroll = useRef(0);
  const sent = useRef(false);

  useEffect(() => {
    start.current = Date.now();
    maxScroll.current = 0;
    sent.current = false;

    send("view", {
      path: pathname,
      referrer: document.referrer || null,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      ...utm(),
    });

    const onScroll = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const pct =
        scrollable > 0
          ? Math.round((window.scrollY / scrollable) * 100)
          : 100;
      maxScroll.current = Math.min(100, Math.max(maxScroll.current, pct));
    };

    const flush = () => {
      if (sent.current) return;
      sent.current = true;
      send(
        "engage",
        {
          path: pathname,
          dwellMs: Date.now() - start.current,
          scrollDepth: maxScroll.current,
        },
        true,
      );
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!/^https?:\/\//.test(href)) return;
      if (new URL(href).origin === window.location.origin) return;
      send("outbound", { path: pathname, href });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("click", onClick, true);

    return () => {
      flush();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("click", onClick, true);
    };
  }, [pathname]);

  return null;
};

const utm = () => {
  const params = new URLSearchParams(window.location.search);
  const pick = (key: string) => params.get(key) || undefined;
  return {
    utmSource: pick("utm_source"),
    utmMedium: pick("utm_medium"),
    utmCampaign: pick("utm_campaign"),
  };
};

type Payload = Record<string, unknown>;

const send = (type: string, data: Payload, beacon = false) => {
  const body = JSON.stringify({ type, ...data, ts: Date.now() });

  try {
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/collect",
        new Blob([body], { type: "application/json" }),
      );
      return;
    }
    void fetch("/api/collect", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* telemetry must never surface an error to the page */
  }
};
