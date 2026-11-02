import type { ReactNode } from "react";
import { Container } from "./layout-primitives";

/**
 * Shared header for every non-landing page. The fixed nav is 64px tall, so the
 * generous top padding here is what keeps page titles clear of it.
 */
export const PageHeader = ({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}) => (
  <header className="relative overflow-hidden border-b border-[var(--color-line)] pt-36 pb-16 md:pt-44 md:pb-20">
    {/* Faint accent wash so page tops aren't flat black. */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_100%_at_0%_0%,rgba(59,130,246,0.08),transparent)]"
    />
    <Container className="relative">
      <p className="eyebrow mb-5">{eyebrow}</p>
      <h1 className="max-w-3xl text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] font-medium tracking-[-0.03em] text-[var(--color-ink)]">
        {title}
      </h1>
      {lede ? (
        <p className="mt-5 max-w-xl font-serif text-lg leading-relaxed text-[var(--color-muted)]">
          {lede}
        </p>
      ) : null}
      {children}
    </Container>
  </header>
);
