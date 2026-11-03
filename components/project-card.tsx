"use client";

import Link from "next/link";
import SpotlightCard from "@/components/SpotlightCard";
import type { Project } from "@/app/lib/content/types";

const CATEGORY_LABEL: Record<Project["category"], string> = {
  ai: "AI / ML",
  ios: "Apple",
  quant: "Quant",
  hardware: "Hardware",
  tools: "Tooling",
};

/**
 * One project. Used on the landing page and the work index, so the hover
 * language is identical in both places.
 */
export const ProjectCard = ({
  project,
  large = false,
}: {
  project: Project;
  large?: boolean;
}) => (
  <Link
    href={`/work/${project.slug}`}
    data-observe={project.name}
    className="group block h-full"
  >
    <SpotlightCard
      className="h-full border border-[var(--color-line)] bg-[var(--color-surface)] p-7 transition-colors duration-300 group-hover:border-[var(--color-line-bright)]"
      spotlightColor="rgba(59, 130, 246, 0.16)"
    >
      <div className="flex h-full flex-col">
        <div className="mb-5 flex items-start justify-between gap-4">
          <span className="eyebrow">{CATEGORY_LABEL[project.category]}</span>
          <span className="font-mono text-[11px] text-[var(--color-faint)]">
            {project.year}
          </span>
        </div>

        <h3
          className={`font-medium tracking-tight text-[var(--color-ink)] ${
            large ? "text-2xl md:text-3xl" : "text-xl"
          }`}
        >
          {project.name}
        </h3>

        {project.award ? (
          <p className="mt-2 font-mono text-[11px] text-[var(--color-accent-bright)]">
            ★ {project.award}
          </p>
        ) : null}

        <p
          className={`mt-3 leading-relaxed text-[var(--color-muted)] ${
            large ? "text-base" : "text-sm"
          }`}
        >
          {large ? project.description : project.summary}
        </p>

        <div className="mt-auto pt-6">
          <div className="flex flex-wrap gap-1.5">
            {project.stack.slice(0, large ? 6 : 3).map((tech) => (
              <span
                key={tech}
                className="border border-[var(--color-line)] px-2 py-1 font-mono text-[10px] text-[var(--color-faint)]"
              >
                {tech}
              </span>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-[var(--color-line)] pt-4">
            {/* Live GitHub stats, absent entirely when unavailable rather
                than rendering a misleading zero. */}
            <span className="font-mono text-[11px] text-[var(--color-faint)]">
              {project.stats
                ? `★ ${project.stats.stars} · ${project.stats.language ?? "—"}`
                : project.private
                  ? "Private repository"
                  : ""}
            </span>
            <span className="font-mono text-xs text-[var(--color-muted)] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--color-accent-bright)]">
              View →
            </span>
          </div>
        </div>
      </div>
    </SpotlightCard>
  </Link>
);
