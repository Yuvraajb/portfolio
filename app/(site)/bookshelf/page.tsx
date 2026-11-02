import { getBooksByStatus, getSite } from "@/app/lib/content";
import getMetadata from "@/app/lib/metadata";
import { Container, Section } from "@/components/layout-primitives";
import { PageHeader } from "@/components/page-header";
import type { Book } from "@/app/lib/content/types";

export const metadata = getMetadata({
  title: "Bookshelf",
  description:
    "The books Yuvraaj Bhatter is currently reading, has finished, and wants to read next — synced live from Goodreads.",
});

export default async function BookshelfPage() {
  const [shelves, site] = await Promise.all([getBooksByStatus(), getSite()]);
  const total = Object.values(shelves).flat().length;

  return (
    <>
      <PageHeader
        eyebrow="Bookshelf"
        title="What I'm reading."
        lede={`${total} books, synced from Goodreads.`}
      >
        <a
          href={site.goodreads.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block border border-[var(--color-line-bright)] px-5 py-2.5 font-mono text-xs text-[var(--color-ink)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent-bright)]"
        >
          Goodreads profile ↗
        </a>
      </PageHeader>

      <Section>
        <Container className="flex flex-col gap-16">
          <Shelf title="Currently reading" books={shelves["currently-reading"]} />
          <Shelf title="Read" books={shelves.read} />
          <Shelf title="Want to read" books={shelves["to-read"]} />
        </Container>
      </Section>
    </>
  );
}

const Shelf = ({ title, books }: { title: string; books: Book[] }) => {
  if (books.length === 0) return null;

  return (
    <section>
      <div className="mb-8 flex items-center gap-4">
        <h2 className="eyebrow">{title}</h2>
        <span className="h-px flex-1 bg-[var(--color-line)]" />
        <span className="font-mono text-[11px] text-[var(--color-faint)]">
          {books.length}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {books.map((book) => (
          <li key={book.link ?? book.title}>
            <a
              href={book.link}
              target="_blank"
              rel="noreferrer"
              className="group block"
            >
              <div className="relative aspect-2/3 overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface)] transition-colors group-hover:border-[var(--color-line-bright)]">
                {book.cover ? (
                  // Goodreads CDN covers, remote and unoptimized by design.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.cover}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center font-mono text-[10px] text-[var(--color-faint)]">
                    no cover
                  </span>
                )}
              </div>

              <p className="mt-3 line-clamp-2 text-xs leading-snug text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent-bright)]">
                {book.title}
              </p>
              <p className="mt-1 line-clamp-1 font-mono text-[10px] text-[var(--color-faint)]">
                {book.author}
              </p>
              {book.rating ? (
                <p
                  className="mt-1 font-mono text-[10px] text-[var(--color-accent)]"
                  aria-label={`Rated ${book.rating} out of 5`}
                >
                  {"★".repeat(book.rating)}
                  <span className="text-[var(--color-line-bright)]">
                    {"★".repeat(5 - book.rating)}
                  </span>
                </p>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};
