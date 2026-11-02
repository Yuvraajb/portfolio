import { Footer } from "@/components/footer";
import { Topbar } from "@/components/topbar";
import { getSite } from "@/app/lib/content";

/**
 * Site chrome. The nav is fixed and the hero sits beneath it, so `<main>`
 * carries no top padding — pages that aren't full-bleed add their own.
 */
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const site = await getSite();

  return (
    <>
      <Topbar links={site.nav} />
      <main className="flex-1">{children}</main>
      <Footer site={site} />
    </>
  );
}
