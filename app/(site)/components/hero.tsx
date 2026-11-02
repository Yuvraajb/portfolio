"use client";

import dynamic from "next/dynamic";
import DecryptedText from "@/components/DecryptedText";
import RotatingText from "@/components/RotatingText";
import { WebGLSurface } from "@/components/webgl-surface";
import { Container } from "@/components/layout-primitives";

/** The glyph ramp shared by the background field and the name's scramble. */
const ASCII_RAMP = " =+xX0S8#@";

// ~30KB of WebGL that nothing above the fold needs synchronously.
const GradientASCII = dynamic(() => import("@/components/GradientASCII"), {
  ssr: false,
});

/**
 * Landing hero.
 *
 * One idea carried by every layer: glyphs resolving into meaning. The ASCII
 * field behind is a drifting mass of characters; the name decrypts out of
 * random glyphs into real letters. Both use `ASCII_RAMP`, so the scramble in
 * the name is literally made of the same characters as the field — one system,
 * not two stacked effects.
 */
export const Hero = ({
  name,
  tagline,
  roles,
  role,
}: {
  name: string;
  tagline: string;
  roles: string[];
  role: string;
}) => (
  <section className="relative isolate flex min-h-[92svh] flex-col justify-end overflow-hidden">
    <WebGLSurface
      className="absolute inset-0 -z-10"
      // Static gradient stand-in for reduced-motion users and pre-mount.
      fallback={
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,#1e3fd8_0%,#0b1e6b_35%,#07080a_72%)]" />
      }
    >
      <GradientASCII
        colors={["#1e3fd8", "#f6f8ff", "#a5d8ff", "#38bdf8"]}
        shape="horizon"
        characters={ASCII_RAMP}
        cellSize={18}
        density={0.8}
        glyphOpacity={1}
        gradientOpacity={1}
        scrambleRadius={0.14}
        clickEffect="wave"
      />
    </WebGLSurface>

    {/* Nav scrim. The ASCII field is near-white at the top of the `horizon`
        shape, which leaves the fixed nav unreadable. A short gradient only
        over the top ~140px restores contrast without dimming the field. */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-[#07080a]/85 to-transparent"
    />

    <Container className="relative pb-20 md:pb-28">
      <p className="eyebrow mb-6 flex items-center gap-3 !text-white/70">
        <span className="inline-block size-1.5 animate-pulse rounded-full bg-[var(--color-accent-bright)]" />
        {role}
      </p>

      <h1 className="text-[clamp(2.5rem,8vw,5.5rem)] leading-[0.95] font-medium tracking-[-0.03em] text-white">
        <DecryptedText
          text={name}
          animateOn="view"
          sequential
          revealDirection="start"
          characters={ASCII_RAMP}
          speed={34}
          parentClassName="inline-block"
          encryptedClassName="text-[var(--color-accent-bright)]/70"
        />
      </h1>

      {/* Sans, not serif, deliberately. This is the LCP element, and pulling
          Source Serif 4 onto the critical path for one line cost 3.2s of
          render delay on throttled mobile. The design system reserves the
          serif for long-form reading anyway, so this is the correct call
          twice over. */}
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80 md:text-xl">
        {tagline}
      </p>

      <div className="mt-8 flex items-center gap-2 font-mono text-xs text-white/55 md:text-sm">
        <span aria-hidden className="text-[var(--color-accent-bright)]">
          &gt;
        </span>
        <RotatingText
          texts={roles}
          rotationInterval={2600}
          staggerDuration={0.015}
          splitBy="characters"
          mainClassName="text-[var(--color-accent-bright)]"
          splitLevelClassName="overflow-hidden"
        />
      </div>
    </Container>

    {/* Scroll affordance */}
    <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex">
      <span className="font-mono text-[10px] tracking-[0.2em] text-white/35">
        SCROLL
      </span>
      <span className="block h-8 w-px animate-pulse bg-gradient-to-b from-white/40 to-transparent" />
    </div>
  </section>
);
