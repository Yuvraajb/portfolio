import Link from "next/link";
import { getPosts, getSite } from "@/app/lib/content";
import getMetadata from "@/app/lib/metadata";
import { Container, Section } from "@/components/layout-primitives";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/app/utils/format-date";

export const metadata = getMetadata({
  title: "Writing",
  description:
    "Essays and notes by Yuvraaj Bhatter on software, machine learning, and building things.",
});

export default async function WritingPage() {
  const [posts, site] = await Promise.all([getPosts(), getSite()]);

  return (
    <>
      <PageHeader
        eyebrow="Writing"
        title="Notes on what I'm building and learning."
        lede="Published here and on Substack. Posts marked ↗ open on Substack, where the canonical copy lives."
      >
        <a
          href={site.externalBlog.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block border border-[var(--color-line-bright)] px-5 py-2.5 font-mono text-xs text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent-bright)]"
        >
          Subscribe on Substack ↗
        </a>
      </PageHeader>

      <Section>
        <Container>
          {posts.length === 0 ? (
            <p className="py-16 text-center font-mono text-sm text-[var(--color-faint)]">
              Nothing published yet.
            </p>
          ) : (
            <ul className="border-t border-[var(--color-line)]">
              {posts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={post.remoteUrl ?? `/writing/${post.slug}`}
                    target={post.remoteUrl ? "_blank" : undefined}
                    rel={post.remoteUrl ? "noreferrer" : undefined}
                    className="group grid gap-2 border-b border-[var(--color-line)] py-7 transition-colors hover:border-[var(--color-line-bright)] md:grid-cols-[140px_1fr] md:gap-8"
                  >
                    <span className="font-mono text-[11px] text-[var(--color-faint)] md:pt-1.5">
                      {formatDate(post.date)}
                    </span>

                    <span className="flex flex-col gap-2">
                      <span className="text-lg text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent-bright)] md:text-xl">
                        {post.title}
                        {post.remoteUrl ? (
                          <span className="ml-2 font-mono text-xs text-[var(--color-faint)]">
                            ↗
                          </span>
                        ) : null}
                      </span>

                      {post.description ? (
                        <span className="max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
                          {post.description}
                        </span>
                      ) : null}

                      {post.tags.length > 0 ? (
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          {post.tags.map((tag) => (
                            <span
                              key={tag}
                              className="border border-[var(--color-line)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-faint)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </Section>
    </>
  );
}
