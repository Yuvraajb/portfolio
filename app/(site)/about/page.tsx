import Image from "next/image";
import { getSite } from "@/app/lib/content";
import getMetadata from "@/app/lib/metadata";
import { Container, Section } from "@/components/layout-primitives";
import { PageHeader } from "@/components/page-header";

export const metadata = getMetadata({
  title: "About",
  description:
    "Yuvraaj Bhatter — Computer Science at Santa Clara University, building at the intersection of AI, iOS, and quantitative finance.",
});

/** Hand-maintained; short enough that a CMS would be overhead. */
const TIMELINE = [
  {
    year: "2026",
    title: "Swift Student Challenge Winner",
    detail: "One of 350 winners worldwide. Three days at Apple Park for WWDC '26.",
  },
  {
    year: "2026",
    title: "1st Place, Hack4Humanity",
    detail: "ElevenLabs track, for CRIS.ai — a real-time AI crisis response system.",
  },
  {
    year: "2025",
    title: "3rd Place, AWS × INRIX Hackathon",
    detail: "AI for Scalable Solutions track, against 254 participants.",
  },
  {
    year: "2025",
    title: "Quantitative research",
    detail: "Mean-reversion backtesting, market-regime modelling, trading agents.",
  },
  {
    year: "2024",
    title: "Computer Science, Santa Clara University",
    detail: "Where the AI, iOS, and quant threads started converging.",
  },
];

export default async function AboutPage() {
  const site = await getSite();

  return (
    <>
      <PageHeader eyebrow="About" title="Hi, I'm Yuvraaj." />

      <Section>
        <Container>
          <div className="grid gap-14 lg:grid-cols-[1fr_300px]">
            <div className="prose-content max-w-[66ch]">
              {site.bio.split("\n\n").map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>

            <aside className="flex flex-col gap-8">
              <div className="relative aspect-square overflow-hidden border border-[var(--color-line)]">
                <Image
                  src={site.avatar}
                  alt={site.name}
                  fill
                  sizes="300px"
                  className="object-cover"
                  priority
                />
              </div>

              <div>
                <h2 className="eyebrow mb-4">Stack</h2>
                <div className="flex flex-wrap gap-1.5">
                  {site.stack.map((tech) => (
                    <span
                      key={tech}
                      className="border border-[var(--color-line)] px-2 py-1 font-mono text-[10px] text-[var(--color-muted)]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="eyebrow mb-4">Elsewhere</h2>
                <ul className="flex flex-col">
                  {site.social.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target={link.url.startsWith("http") ? "_blank" : undefined}
                        rel="noreferrer"
                        className="group flex items-center justify-between border-b border-[var(--color-line)] py-2.5 font-mono text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
                      >
                        {link.label}
                        <span className="text-[var(--color-faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-accent-bright)]">
                          ↗
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </Container>
      </Section>

      <Section className="border-t border-[var(--color-line)]">
        <Container>
          <h2 className="eyebrow mb-10">Timeline</h2>
          <ol className="flex flex-col">
            {TIMELINE.map((entry) => (
              <li
                key={`${entry.year}-${entry.title}`}
                className="grid gap-2 border-b border-[var(--color-line)] py-6 md:grid-cols-[100px_1fr] md:gap-8"
              >
                <span className="font-mono text-[11px] text-[var(--color-accent)] md:pt-1">
                  {entry.year}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-[var(--color-ink)]">{entry.title}</span>
                  <span className="text-sm text-[var(--color-muted)]">
                    {entry.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Container>
      </Section>
    </>
  );
}
