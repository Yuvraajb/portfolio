"use client";

import { Brain, Smartphone, TrendingUp } from "lucide-react";
import AnimatedContent from "@/components/AnimatedContent";
import CountUp from "@/components/CountUp";
import Orb from "@/components/Orb";
import { WebGLSurface } from "@/components/webgl-surface";
import type { Pillar } from "@/app/lib/content/types";
import { Container, Section } from "@/components/layout-primitives";

const ICONS = [Brain, Smartphone, TrendingUp];

/**
 * "What I do" — an Orb on the left, three capability cards on the right.
 *
 * Copy is deliberately short here: the section used to carry three paragraphs
 * of prose, which made the page read as a wall of text once you scrolled past
 * the hero. The visual carries the weight; the words just label it.
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
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-20">
        {/* Visual */}
        <div className="relative mx-auto aspect-square w-full max-w-[380px]">
          <WebGLSurface
            className="absolute inset-0"
            fallback={
              <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.35),transparent_70%)]" />
            }
          >
            <Orb
              colors={["#1e3fd8", "#2f6fe0", "#7dd3fc"]}
              backgroundColor="#07080a"
              glow={0.85}
              bleed={0.7}
              highlight={0.9}
              wobble={0.6}
              hoverIntensity={0.55}
              rotateOnHover
              followCursor
            />
          </WebGLSurface>

          {/* Centred label, so the orb reads as an instrument not an ornament */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="eyebrow">What I do</span>
            {/* A real <h2>: the cards below are <h3>s, so without it the page
                outline jumps h1 → h3. It's the section's actual heading, it
                just happens to live inside the orb. */}
            <h2 className="mt-2 max-w-[11rem] text-lg leading-tight text-[var(--color-ink)]">
              Three things I keep coming back to
            </h2>
          </div>
        </div>

        {/* Capability cards */}
        <div className="flex flex-col gap-3">
          {pillars.map((pillar, i) => {
            const Icon = ICONS[i] ?? Brain;
            return (
              <AnimatedContent key={pillar.label} distance={36} delay={i * 0.09}>
                <div className="group flex items-start gap-5 border border-[var(--color-line)] bg-[var(--color-surface)] p-6 transition-colors hover:border-[var(--color-line-bright)]">
                  <span className="flex size-11 shrink-0 items-center justify-center border border-[var(--color-line-bright)] bg-[var(--color-accent)]/10 text-[var(--color-accent-bright)] transition-colors group-hover:bg-[var(--color-accent)]/20">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </span>
                  <div>
                    <h3 className="font-mono text-sm tracking-wide text-[var(--color-ink)]">
                      {pillar.label}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">
                      {pillar.description}
                    </p>
                  </div>
                </div>
              </AnimatedContent>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat, i) => (
          <AnimatedContent key={stat.label} distance={28} delay={i * 0.07}>
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
