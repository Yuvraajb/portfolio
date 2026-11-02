import { getProjectCategories, getProjects } from "@/app/lib/content";
import getMetadata from "@/app/lib/metadata";
import { Container, Section } from "@/components/layout-primitives";
import { PageHeader } from "@/components/page-header";
import { WorkGrid } from "./components/work-grid";

export const metadata = getMetadata({
  title: "Work",
  path: "/work",
  description:
    "Projects by Yuvraaj Bhatter — AI systems, iOS apps, quantitative research, and hardware experiments.",
});

export default async function WorkPage() {
  const [projects, categories] = await Promise.all([
    getProjects(),
    getProjectCategories(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Work"
        title="Everything I've built worth showing."
        lede="Hackathon wins, research engines, and a few things made purely because they were interesting."
      />
      <Section>
        <Container>
          <WorkGrid projects={projects} categories={categories} />
        </Container>
      </Section>
    </>
  );
}
