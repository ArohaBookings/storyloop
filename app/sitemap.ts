import type { MetadataRoute } from "next";
import { SEO_PAGES, SEO_PAGE_SLUGS } from "@/lib/seo-pages";
import { listPublishedPosts } from "@/lib/blog";

const SITE_URL = "https://storyloop.space";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = ["", "about", "resources", "privacy", "terms", "blog"];

  const base: MetadataRoute.Sitemap = [...staticPages, ...SEO_PAGE_SLUGS].map((slug) => ({
    url: slug ? `${SITE_URL}/${slug}` : `${SITE_URL}/`,
    lastModified: slug && SEO_PAGES[slug]?.reviewedAt
      ? new Date(`${SEO_PAGES[slug].reviewedAt}T00:00:00.000Z`)
      : undefined,
    changeFrequency: slug ? "monthly" : "weekly",
    priority: slug ? 0.75 : 1,
  }));

  // Guides are the SEO surface that grows over time, so they must be listed
  // individually with their real modified date. A sitemap failure must never
  // take down the whole sitemap.
  let posts: MetadataRoute.Sitemap = [];
  try {
    posts = (await listPublishedPosts(200)).map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));
  } catch {
    posts = [];
  }

  return [...base, ...posts];
}
