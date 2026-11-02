"use client";

import Link from "next/link";
import { useState } from "react";
import type { Project } from "@/app/lib/content/types";

/**
 * Featured work as a hover-reveal rail: project names on the left, artwork and
 * detail on the right, swapping as you move between rows.
 *
 * Built directly rather than with React Bits' `FlowingMenu` because that
 * component reveals a horizontal marquee *inside* each row, which fights the
 * fixed right-hand panel this layout needs. The interaction is the same idea,
 * the layout is the one that was asked for.
 *
 * The panel is `hidden lg:block` — on touch there is no hover, so small
 * screens get a plain stacked list with the art inline instead.
 */
export const WorkReveal = ({ projects }: { projects: Project[] }) => {
  const [active, setActive] = useState(0);
  const current = projects[active];

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,520px)] lg:gap-16">
      {/* Left: the list */}
      <ul
        className="border-t border-[var(--color-line)]"
        onMouseLeave={() => setActive(0)}
      >
        {projects.map((project, i) => (
          <li key={project.slug}>
            <Link
              href={`/work/${project.slug}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className="group relative flex items-center gap-5 border-b border-[var(--color-line)] py-6 transition-colors lg:py-7"
            >
              {/* Fill that sweeps in from the left on the active row */}
              <span
                aria-hidden
                className={`absolute inset-y-0 left-0 -z-10 bg-[var(--color-accent)]/[0.07] transition-all duration-500 ease-[var(--ease-out-expo)] ${
                  active === i ? "w-full" : "w-0"
                }`}
              />

              <span
                className={`font-mono text-[11px] tabular-nums transition-colors ${
                  active === i
                    ? "text-[var(--color-accent-bright)]"
                    : "text-[var(--color-faint)]"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-1 pl-1">
                <span
                  className={`text-xl font-medium tracking-tight transition-all duration-300 md:text-2xl ${
                    active === i
                      ? "translate-x-1 text-[var(--color-ink)]"
                      : "text-[var(--color-muted)]"
                  }`}
                >
                  {project.name}
                </span>
                {project.tag ? (
                  <span className="font-mono text-[11px] text-[var(--color-faint)]">
                    {project.tag}
                  </span>
                ) : null}
              </span>

              {/* Inline art for touch / small screens, where hover doesn't exist */}
              <span className="relative block w-28 shrink-0 overflow-hidden border border-[var(--color-line)] lg:hidden">
                <span className="block aspect-[1200/630]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artFor(project)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </span>
              </span>

              <span
                className={`hidden shrink-0 pr-2 font-mono text-sm transition-all duration-300 lg:block ${
                  active === i
                    ? "translate-x-0 text-[var(--color-accent-bright)] opacity-100"
                    : "-translate-x-2 opacity-0"
                }`}
              >
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Right: the reveal panel */}
      <aside className="sticky top-28 hidden self-start lg:block">
        <div className="relative aspect-[1200/630] overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface)]">
          {projects.map((project, i) => (
            // All frames stay mounted and cross-fade, so switching rows never
            // flashes an empty panel while a new image decodes.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={project.slug}
              src={artFor(project)}
              alt=""
              loading={i === 0 ? "eager" : "lazy"}
              className={`absolute inset-0 size-full object-cover transition-opacity duration-500 ${
                active === i ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 min-h-[7.5rem]">
          <p className="text-sm leading-relaxed text-[var(--color-muted)]">
            {current.summary}
          </p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {current.stack.map((tech) => (
              <span
                key={tech}
                className="border border-[var(--color-line)] px-2 py-1 font-mono text-[10px] text-[var(--color-faint)]"
              >
                {tech}
              </span>
            ))}
          </div>
          {current.stats ? (
            <p className="mt-4 font-mono text-[11px] text-[var(--color-faint)]">
              ★ {current.stats.stars} · {current.stats.language ?? "—"}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
};

/** Generated, on-brand card art — deterministic per project title. */
const artFor = (project: Project): string => {
  const params = new URLSearchParams({ title: project.name });
  if (project.tag) params.set("tag", project.tag);
  return `/og?${params.toString()}`;
};
