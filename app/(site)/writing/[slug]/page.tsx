import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPost, getPosts, getRelatedPosts } from "@/app/lib/content";
import { readingTime, renderMarkdown } from "@/app/lib/markdown";
import getMetadata from "@/app/lib/metadata";
import { Container, Section } from "@/components/layout-primitives";
import { formatDate, formatDateShort } from "@/app/utils/format-date";

type Params = { params: Promise<{ slug: string }> };

/** Only locally-authored posts get a page here; Substack posts link out. */
export async function generateStaticParams() {
  return (await getPosts())
    .filter((post) => post.source === "local")
    .map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return getMetadata({ title: "Not found", noIndex: true });

  return getMetadata({
    title: post.title,
    description: post.description,
    subtitle: formatDate(post.date),
    type: "article",
    path: `/writing/${post.slug}`,
  });
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  // A Substack post has no local body — send readers to the canonical copy
  // rather than rendering an empty article shell.
  if (post.remoteUrl && !post.body) redirect(post.remoteUrl);

  const [html, related] = await Promise.all([
    renderMarkdown(post.body),
    getRelatedPosts(slug, 3),
  ]);

  return (
    <>
      <header className="relative overflow-hidden border-b border-[var(--color-line)] pt-36 pb-14 md:pt-44 md:pb-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_100%_at_0%_0%,rgba(59,130,246,0.08),transparent)]"
        />
        <Container className="relative">
          <Link
            href="/writing"
            className="eyebrow mb-8 inline-block transition-colors hover:text-[var(--color-accent-bright)]"
          >
            ← All writing
          </Link>

          <h1 className="max-w-3xl text-[clamp(2rem,5vw,3.25rem)] leading-[1.08] font-medium tracking-[-0.03em] text-[var(--color-ink)]">
            {post.title}
          </h1>

          <p className="mt-6 font-mono text-[11px] text-[var(--color-faint)]">
            {formatDate(post.date)} · {readingTime(post.body)} min read
          </p>
        </Container>
      </header>

      <Section>
        <Container>
          <article
            className="prose-content max-w-[68ch]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </Container>
      </Section>

      {related.length > 0 ? (
        <Section className="border-t border-[var(--color-line)]">
          <Container>
            <h2 className="eyebrow mb-8">Keep reading</h2>
            <ul className="border-t border-[var(--color-line)]">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={item.remoteUrl ?? `/writing/${item.slug}`}
                    target={item.remoteUrl ? "_blank" : undefined}
                    rel={item.remoteUrl ? "noreferrer" : undefined}
                    className="group flex items-baseline justify-between gap-6 border-b border-[var(--color-line)] py-5"
                  >
                    <span className="text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent-bright)]">
                      {item.title}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--color-faint)]">
                      {formatDateShort(item.date)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}
    </>
  );
}
