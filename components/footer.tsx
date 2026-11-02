import Link from "next/link";
import type { SiteContent } from "@/app/lib/content/types";

/**
 * Footer as a readout panel: a big outbound-link list on the left, status
 * fields on the right. Mono throughout, in keeping with the instrument system.
 */
export const Footer = ({ site }: { site: SiteContent }) => (
  <footer className="mt-32 border-t border-[var(--color-line)]">
    <div className="mx-auto w-full max-w-[1200px] px-6 py-16 lg:px-10">
      <div className="flex flex-col gap-12 md:flex-row md:justify-between">
        <div className="max-w-sm">
          <p className="eyebrow mb-4">Elsewhere</p>
          <ul className="flex flex-col">
            {site.social.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target={link.url.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="group flex items-center justify-between border-b border-[var(--color-line)] py-3 transition-colors hover:border-[var(--color-line-bright)]"
                >
                  <span className="font-mono text-sm text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-ink)]">
                    {link.label}
                  </span>
                  <span className="font-mono text-xs text-[var(--color-faint)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--color-accent-bright)]">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-6 font-mono text-xs">
          <Field label="Status" value="Open to internships & collaborations" />
          <Field label="Based in" value={site.location} />
          <Field label="Studying" value={site.role} />
          <Field label="Email" value={site.email} href={`mailto:${site.email}`} />
        </div>
      </div>

      <div className="mt-16 flex flex-col gap-3 border-t border-[var(--color-line)] pt-6 font-mono text-[11px] text-[var(--color-faint)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {site.name}
        </p>
        <p className="flex items-center gap-4">
          <Link href="/lab" className="transition-colors hover:text-[var(--color-muted)]">
            /lab
          </Link>
          <span>Built with Next.js · React Bits · WebGL</span>
        </p>
      </div>
    </div>
  </footer>
);

const Field = ({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) => (
  <div className="flex flex-col gap-1">
    <span className="text-[var(--color-faint)] uppercase tracking-[0.18em] text-[10px]">
      {label}
    </span>
    {href ? (
      <a
        href={href}
        className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-accent-bright)]"
      >
        {value}
      </a>
    ) : (
      <span className="text-[var(--color-muted)]">{value}</span>
    )}
  </div>
);
