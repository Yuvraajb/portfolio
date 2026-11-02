"use client";

import AnimatedContent from "@/components/AnimatedContent";
import SpotlightCard from "@/components/SpotlightCard";
import CountUp from "@/components/CountUp";
import type { Pillar } from "@/app/lib/content/types";
import { Container, Section, SectionHeading } from "@/components/layout-primitives";

/**
 * "What I do" — three pillars, each a spotlight card, plus a strip of real
 * numbers underneath. The numbers are sourced from GitHub rather than written
 * by hand, so they can't quietly go stale.
 */
export const Pillars = ({
  pillars,
  stats,
}: {
  pillars: Pillar[];
  stats: { label: string; value: number; suffix?: string }[];
}) => (
  <Section id="what-i-do">
    <Container>
      <SectionHeading
        index="01"
        eyebrow="What I do"
        title="Three things I keep coming back to."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {pillars.map((pillar, i) => (
          <AnimatedContent key={pillar.label} distance={40} delay={i * 0.09}>
            <SpotlightCard
              className="h-full border border-[var(--color-line)] bg-[var(--color-surface)] p-7"
              spotlightColor="rgba(59, 130, 246, 0.14)"
            >
              <div className="flex h-full flex-col gap-4">
                <span
                  aria-hidden
                  className="font-mono text-2xl text-[var(--color-accent)]"
                >
                  {pillar.glyph}
                </span>
                <h3 className="font-mono text-sm tracking-wide text-[var(--color-ink)]">
                  {pillar.label}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--color-muted)]">
                  {pillar.description}
                </p>
              </div>
            </SpotlightCard>
          </AnimatedContent>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat, i) => (
          <AnimatedContent key={stat.label} distance={30} delay={i * 0.07}>
            <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
              <div className="font-mono text-3xl tracking-tight text-[var(--color-ink)] tabular-nums">
                <CountUp to={stat.value} duration={1.6} />
                {stat.suffix}
              </div>
              <p className="eyebrow mt-2">{stat.label}</p>
            </div>
          </AnimatedContent>
        ))}
      </div>
    </Container>
  </Section>
);
