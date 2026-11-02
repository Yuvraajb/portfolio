import { getBooks, getFeaturedProjects, getPosts, getSite } from "@/app/lib/content";
import { fetchProfileStats } from "@/app/lib/sources/github";
import getMetadata from "@/app/lib/metadata";
import { Hero } from "./components/hero";
import { Pillars } from "./components/pillars";
import {
  BookshelfTeaser,
  ContactBand,
  FeaturedWork,
  StackMarquee,
  WritingTeaser,
} from "./components/landing-sections";

export const metadata = getMetadata();

export default async function LandingPage() {
  const site = await getSite();
  const [projects, posts, books, profile] = await Promise.all([
    getFeaturedProjects(5),
    getPosts(),
    getBooks(),
    fetchProfileStats(site.github.username),
  ]);

  const reading = books.filter((b) => b.status === "currently-reading");
  const shelf = reading.length >= 3 ? reading : books;

  const stats = [
    { label: "Public repos", value: profile?.repos ?? 51 },
    { label: "Hackathon wins", value: 4 },
    { label: "Projects shipped", value: projects.length + 8 },
    { label: "Years building", value: 4 },
  ];

  return (
    <>
      <Hero
        name={site.name}
        tagline={site.tagline}
        roles={site.roles}
        role={site.role}
      />
      <StackMarquee stack={site.stack} />
      <Pillars pillars={site.pillars} stats={stats} />
      <FeaturedWork projects={projects} />
      <WritingTeaser posts={posts.slice(0, 5)} />
      <BookshelfTeaser books={shelf} />
      <ContactBand email={site.email} />
    </>
  );
}
