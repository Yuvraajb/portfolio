"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { NavLink } from "@/app/lib/content/types";

/**
 * Instrument-panel navigation: mono labels, a live local clock, and a hairline
 * that only appears once the page has scrolled (so the hero meets the viewport
 * edge with nothing on top of it).
 */
export const Topbar = ({ links }: { links: NavLink[] }) => {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "America/Los_Angeles",
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const isActive = (url: string) =>
    url === "/" ? pathname === "/" : pathname.startsWith(url);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-[var(--color-line)] bg-[var(--color-bg)]/85 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-6 lg:px-10">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-mono text-sm tracking-tight"
        >
          <span className="inline-block size-1.5 rounded-full bg-[var(--color-accent)] transition-transform duration-300 group-hover:scale-150" />
          <span className="text-[var(--color-ink)]">yuvraaj</span>
          <span className="text-[var(--color-faint)]">bhatter</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <ul className="flex items-center gap-7">
            {links.map((link) => (
              <li key={link.url}>
                <Link
                  href={link.url}
                  className={`group relative font-mono text-[13px] transition-colors ${
                    isActive(link.url)
                      ? "text-[var(--color-ink)]"
                      : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute -bottom-1.5 left-0 h-px bg-[var(--color-accent)] transition-all duration-300 ${
                      isActive(link.url) ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              </li>
            ))}
          </ul>

          {/* Local time — the small "this is a live instrument" signal. */}
          <span
            suppressHydrationWarning
            className="font-mono text-[11px] tabular-nums text-[var(--color-faint)]"
          >
            SJC {clock}
          </span>
        </div>

        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex size-9 items-center justify-center md:hidden"
        >
          <span className="relative block h-3 w-5">
            <span
              className={`absolute left-0 block h-px w-full bg-[var(--color-ink)] transition-all duration-300 ${
                open ? "top-1.5 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 block h-px w-full bg-[var(--color-ink)] transition-all duration-300 ${
                open ? "top-1.5 -rotate-45" : "top-3"
              }`}
            />
          </span>
        </button>
      </nav>

      {/* Mobile sheet */}
      <div
        className={`overflow-hidden border-t border-[var(--color-line)] bg-[var(--color-bg)] transition-[max-height] duration-400 md:hidden ${
          open ? "max-h-80" : "max-h-0 border-t-0"
        }`}
      >
        <ul className="flex flex-col px-6 py-2">
          {links.map((link) => (
            <li key={link.url}>
              <Link
                href={link.url}
                // Closed here rather than in an effect on `pathname`: the tap
                // is the actual cause, and reacting to the route change
                // instead means a setState cascade on every navigation.
                onClick={() => setOpen(false)}
                className={`block border-b border-[var(--color-line)] py-4 font-mono text-sm ${
                  isActive(link.url)
                    ? "text-[var(--color-accent-bright)]"
                    : "text-[var(--color-muted)]"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
};
