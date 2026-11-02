import type { MetadataRoute } from "next";
import CONFIG from "./lib/config";
import { getPosts, getProjects } from "./lib/content";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, projects] = await Promise.all([getPosts(), getProjects()]);

  const staticRoutes = ["", "/writing", "/projects", "/bookshelf", "/about"].map(
    (route) => ({
      url: `${CONFIG.SITE_URL}${route}`,
      lastModified: new Date(),
    }),
  );

  const postRoutes = posts.map((post) => ({
    url: `${CONFIG.SITE_URL}/writing/${post.slug}`,
    lastModified: post.date ? new Date(`${post.date}T00:00:00Z`) : new Date(),
  }));

  const projectRoutes = projects.map((project) => ({
    url: `${CONFIG.SITE_URL}/projects/${project.slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...postRoutes, ...projectRoutes];
}
