"use client";

import { useMemo, useState } from "react";
import AnimatedContent from "@/components/AnimatedContent";
import { ProjectCard } from "@/components/project-card";
import type { Project, ProjectCategory } from "@/app/lib/content/types";

const LABELS: Record<ProjectCategory | "all", string> = {
  all: "All",
  ai: "AI / ML",
  ios: "Apple",
  quant: "Quant",
  hardware: "Hardware",
  tools: "Tooling",
};

/**
 * Filterable work index. Filtering is client-side because the whole project
 * list is small and already on the page — a round trip per filter click would
 * be slower and worse.
 */
export const WorkGrid = ({
  projects,
  categories,
}: {
  projects: Project[];
  categories: ProjectCategory[];
}) => {
  const [active, setActive] = useState<ProjectCategory | "all">("all");

  const filtered = useMemo(
    () =>
      active === "all"
        ? projects
        : projects.filter((p) => p.category === active),
    [projects, active],
  );

  const options: (ProjectCategory | "all")[] = ["all", ...categories];

  return (
    <>
      {/* The project cards are h3s. Without this h2 the page jumps h1 → h3,
          which breaks the outline for screen-reader navigation. */}
      <h2 className="sr-only">
        {active === "all" ? "All projects" : `${LABELS[active]} projects`}
      </h2>

      <div className="mb-10 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = active === option;
          const count =
            option === "all"
              ? projects.length
              : projects.filter((p) => p.category === option).length;

          return (
            <button
              key={option}
              type="button"
              onClick={() => setActive(option)}
              aria-pressed={selected}
              className={`border px-4 py-2 font-mono text-xs transition-all duration-200 ${
                selected
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent-bright)]"
                  : "border-[var(--color-line)] text-[var(--color-muted)] hover:border-[var(--color-line-bright)] hover:text-[var(--color-ink)]"
              }`}
            >
              {LABELS[option]}
              <span className="ml-2 text-[var(--color-faint)]">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((project, i) => (
          <AnimatedContent
            // Keying on filter + slug replays the entrance when the set changes.
            key={`${active}-${project.slug}`}
            distance={30}
            delay={Math.min(i, 6) * 0.05}
          >
            <ProjectCard project={project} />
          </AnimatedContent>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center font-mono text-sm text-[var(--color-faint)]">
          Nothing here yet.
        </p>
      ) : null}
    </>
  );
};
