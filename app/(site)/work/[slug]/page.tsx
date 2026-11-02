import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getProjects } from "@/app/lib/content";
import getMetadata from "@/app/lib/metadata";
import { Container, Section } from "@/components/layout-primitives";
import { ProjectCard } from "@/components/project-card";
import { formatDate } from "@/app/utils/format-date";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProjects()).map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return getMetadata({ title: "Not found", noIndex: true });

  return getMetadata({
    title: project.name,
    description: project.description,
    subtitle: project.tag,
  });
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const related = (await getProjects())
    .filter((p) => p.slug !== slug && p.category === project.category)
    .slice(0, 3);

  return (
    <>
      <header className="relative overflow-hidden border-b border-[var(--color-line)] pt-36 pb-14 md:pt-44 md:pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_100%_at_0%_0%,rgba(59,130,246,0.09),transparent)]"
        />
        <Container className="relative">
          <Link
            href="/work"
            className="eyebrow mb-8 inline-block transition-colors hover:text-[var(--color-accent-bright)]"
          >
            ← All work
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <span className="eyebrow">{project.year}</span>
            {project.tag ? (
              <>
                <span className="text-[var(--color-faint)]">·</span>
                <span className="font-mono text-[11px] tracking-wide text-[var(--color-accent-bright)]">
                  {project.tag}
                </span>
              </>
            ) : null}
          </div>

          <h1 className="mt-4 text-[clamp(2.25rem,6vw,4rem)] leading-[1.03] font-medium tracking-[-0.03em] text-[var(--color-ink)]">
            {project.name}
          </h1>

          <p className="mt-6 max-w-2xl font-serif text-lg leading-relaxed text-[var(--color-muted)] md:text-xl">
            {project.description}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            {project.url ? (
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="border border-[var(--color-line-bright)] px-5 py-2.5 font-mono text-xs text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent-bright)]"
              >
                {project.private ? "Private repository" : "Source ↗"}
              </a>
            ) : null}
            {project.demo ? (
              <a
                href={project.demo}
                target="_blank"
                rel="noreferrer"
                className="border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-5 py-2.5 font-mono text-xs text-[var(--color-accent-bright)] transition-colors hover:bg-[var(--color-accent)]/20"
              >
                Live demo ↗
              </a>
            ) : null}
          </div>
        </Container>
      </header>

      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_280px]">
            <div>
              {project.highlights?.length ? (
                <>
                  <h2 className="eyebrow mb-6">Highlights</h2>
                  <ul className="flex flex-col gap-4">
                    {project.highlights.map((item) => (
                      <li
                        key={item}
                        className="flex gap-4 border-b border-[var(--color-line)] pb-4"
                      >
                        <span
                          aria-hidden
                          className="mt-1.5 font-mono text-xs text-[var(--color-accent)]"
                        >
                          ◆
                        </span>
                        <span className="text-[var(--color-muted)]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>

            {/* Spec panel — static facts on the left, live GitHub on the right */}
            <aside className="flex flex-col gap-6">
              <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
                <h2 className="eyebrow mb-4">Stack</h2>
                <div className="flex flex-wrap gap-1.5">
                  {project.stack.map((tech) => (
                    <span
                      key={tech}
                      className="border border-[var(--color-line)] px-2 py-1 font-mono text-[10px] text-[var(--color-muted)]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {project.stats ? (
                <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
                  <h2 className="eyebrow mb-4">Repository</h2>
                  <dl className="flex flex-col gap-3 font-mono text-xs">
                    <Row label="Stars" value={String(project.stats.stars)} />
                    <Row label="Forks" value={String(project.stats.forks)} />
                    <Row label="Language" value={project.stats.language ?? "—"} />
                    <Row
                      label="Last push"
                      value={formatDate(project.stats.pushedAt.slice(0, 10))}
                    />
                  </dl>
                </div>
              ) : null}
            </aside>
          </div>
        </Container>
      </Section>

      {related.length > 0 ? (
        <Section className="border-t border-[var(--color-line)]">
          <Container>
            <h2 className="eyebrow mb-8">Related work</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {related.map((item) => (
                <ProjectCard key={item.slug} project={item} />
              ))}
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-4">
    <dt className="text-[var(--color-faint)]">{label}</dt>
    <dd className="text-[var(--color-ink)]">{value}</dd>
  </div>
);
