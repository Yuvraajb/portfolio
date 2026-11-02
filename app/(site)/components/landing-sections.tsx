"use client";

import Link from "next/link";
import AnimatedContent from "@/components/AnimatedContent";
import LogoLoop from "@/components/LogoLoop";
import StarBorder from "@/components/StarBorder";
import { ProjectCard } from "@/components/project-card";
import {
  Container,
  Section,
  SectionHeading,
} from "@/components/layout-primitives";
import type { Book, PostSummary, Project } from "@/app/lib/content/types";
import { formatDateShort } from "@/app/utils/format-date";
import { usePrefersReducedMotion } from "@/app/utils/use-reduced-motion";

/** Tech marquee — a quiet band of capability between hero and content. */
export const StackMarquee = ({ stack }: { stack: string[] }) => (
  <div className="border-y border-[var(--color-line)] bg-[var(--color-surface)]/40 py-5">
    <LogoLoop
      logos={stack.map((tech) => ({
        node: (
          <span className="px-6 font-mono text-sm whitespace-nowrap text-[var(--color-faint)]">
            {tech}
          </span>
        ),
        title: tech,
      }))}
      speed={40}
      logoHeight={20}
      gap={0}
      pauseOnHover
      fadeOut
      fadeOutColor="#07080a"
      ariaLabel="Technologies I work with"
    />
  </div>
);

/** Selected work — the first card spans two columns as the anchor. */
export const FeaturedWork = ({ projects }: { projects: Project[] }) => (
  <Section id="work">
    <Container>
      <SectionHeading
        index="02"
        eyebrow="Selected work"
        title="Things I've built, and what they taught me."
        action={
          <Link
            href="/work"
            className="font-mono text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent-bright)]"
          >
            All work →
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project, i) => (
          <AnimatedContent
            key={project.slug}
            distance={40}
            delay={i * 0.08}
            className={i === 0 ? "md:col-span-2" : ""}
          >
            <ProjectCard project={project} large={i === 0} />
          </AnimatedContent>
        ))}
      </div>
    </Container>
  </Section>
);

/** Writing teaser — a dense list, dates right-aligned, mono throughout. */
export const WritingTeaser = ({ posts }: { posts: PostSummary[] }) => {
  if (posts.length === 0) return null;

  return (
    <Section id="writing">
      <Container>
        <SectionHeading
          index="03"
          eyebrow="Writing"
          title="Notes on what I'm building and learning."
          action={
            <Link
              href="/writing"
              className="font-mono text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent-bright)]"
            >
              All writing →
            </Link>
          }
        />

        <ul className="border-t border-[var(--color-line)]">
          {posts.map((post, i) => (
            // AnimatedContent renders a <div>, so it has to live *inside* the
            // <li> — wrapping the <li> would put a div between <ul> and <li>
            // and break the list semantics screen readers rely on.
            <li key={post.slug}>
              <AnimatedContent distance={24} delay={i * 0.06}>
                <Link
                  href={post.remoteUrl ?? `/writing/${post.slug}`}
                  target={post.remoteUrl ? "_blank" : undefined}
                  rel={post.remoteUrl ? "noreferrer" : undefined}
                  className="group flex items-baseline justify-between gap-6 border-b border-[var(--color-line)] py-5 transition-colors hover:border-[var(--color-line-bright)]"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="truncate text-base text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent-bright)]">
                      {post.title}
                    </span>
                    {post.description ? (
                      <span className="line-clamp-1 text-sm text-[var(--color-muted)]">
                        {post.description}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-[var(--color-faint)]">
                    {formatDateShort(post.date)}
                    {post.remoteUrl ? " ↗" : ""}
                  </span>
                </Link>
              </AnimatedContent>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
};

/** Bookshelf teaser — covers only; the full shelf lives on its own page. */
export const BookshelfTeaser = ({ books }: { books: Book[] }) => {
  if (books.length === 0) return null;

  return (
    <Section id="reading">
      <Container>
        <SectionHeading
          index="04"
          eyebrow="Bookshelf"
          title="What I'm reading."
          action={
            <Link
              href="/bookshelf"
              className="font-mono text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent-bright)]"
            >
              Full shelf →
            </Link>
          }
        />

        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {books.slice(0, 6).map((book, i) => (
            <AnimatedContent key={book.link ?? book.title} distance={30} delay={i * 0.06}>
              <a
                href={book.link}
                target="_blank"
                rel="noreferrer"
                className="group block"
              >
                <div className="relative aspect-2/3 overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface)]">
                  {book.cover ? (
                    // Goodreads CDN covers; plain <img> keeps remote-host
                    // config out of the critical path.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.cover}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 font-mono text-[11px] leading-snug text-[var(--color-muted)]">
                  {book.title}
                </p>
              </a>
            </AnimatedContent>
          ))}
        </div>
      </Container>
    </Section>
  );
};

/**
 * Closing call to action.
 *
 * `StarBorder` draws its animated border on a canvas, which is pure decoration
 * — so under reduced motion it's replaced by a plain bordered link rather than
 * rendering a GPU surface the visitor asked not to see.
 */
export const ContactBand = ({ email }: { email: string }) => {
  const reduced = usePrefersReducedMotion();

  return (
  <Section id="contact">
    <Container>
      <div className="relative overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface)] px-8 py-16 text-center md:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(59,130,246,0.10),transparent)]" />
        <div className="relative">
          <p className="eyebrow mb-6">Get in touch</p>
          <h2 className="mx-auto max-w-2xl text-3xl font-medium tracking-tight text-[var(--color-ink)] md:text-5xl">
            Building something interesting?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[var(--color-muted)]">
            I&rsquo;m open to internships, collaborations, and conversations about
            anything at the edge of AI and good software.
          </p>

          <div className="mt-10 flex justify-center">
            {reduced === false ? (
              <StarBorder
                as="a"
                href={`mailto:${email}`}
                color="#3b82f6"
                duration={5}
                glow={0.8}
                sparkle
              >
                <span className="font-mono text-sm">{email}</span>
              </StarBorder>
            ) : (
              <a
                href={`mailto:${email}`}
                className="border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-6 py-3 font-mono text-sm text-[var(--color-accent-bright)] transition-colors hover:bg-[var(--color-accent)]/20"
              >
                {email}
              </a>
            )}
          </div>
        </div>
      </div>
    </Container>
  </Section>
  );
};
