import type { MetadataRoute } from "next";
import { SEO_PAGE_SLUGS } from "@/lib/seo-pages";

const SITE_URL = "https://storyloop.space";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "about", "resources", "privacy", "terms"];
  const now = new Date();

  return [...staticPages, ...SEO_PAGE_SLUGS].map((slug) => ({
    url: slug ? `${SITE_URL}/${slug}` : `${SITE_URL}/`,
    lastModified: now,
    changeFrequency: slug ? "monthly" : "weekly",
    priority: slug ? 0.75 : 1,
  }));
}
