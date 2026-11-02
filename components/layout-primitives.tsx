import type { ReactNode } from "react";

/** The single content measure used sitewide. */
export const Container = ({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={`mx-auto w-full max-w-[1200px] px-6 lg:px-10 ${className}`}>
    {children}
  </div>
);

/** Vertical rhythm between major page sections. */
export const Section = ({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) => (
  <section id={id} className={`py-20 md:py-28 ${className}`}>
    {children}
  </section>
);

/**
 * Section header: a numbered mono eyebrow on a hairline, then the title.
 * The index is what makes the page read as a sequence of instrument panels
 * rather than a stack of unrelated blocks.
 */
export const SectionHeading = ({
  index,
  eyebrow,
  title,
  action,
}: {
  index: string;
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) => (
  <div className="mb-12">
    <div className="mb-6 flex items-center gap-4">
      <span className="eyebrow text-[var(--color-accent)]">{index}</span>
      <span className="eyebrow">{eyebrow}</span>
      <span className="h-px flex-1 bg-[var(--color-line)]" />
      {action}
    </div>
    <h2 className="max-w-3xl text-3xl font-medium tracking-tight text-[var(--color-ink)] md:text-4xl">
      {title}
    </h2>
  </div>
);
