import type { MetadataRoute } from "next";
import { SEO_PAGES, SEO_PAGE_SLUGS } from "@/lib/seo-pages";
import { EYLF_OUTCOMES } from "@/lib/eylf-outcomes";
import { TE_WHARIKI_STRANDS } from "@/lib/te-whariki-strands";
import { listPublishedPosts } from "@/lib/blog";
import { BUYER_PAGES, BUYER_PAGE_SLUGS } from "@/lib/buyer-pages";

const SITE_URL = "https://storyloop.space";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = ["", "about", "resources", "examples", "ai-policy", "documentation-time-calculator", "review-readiness-check", "learning-story-data", "accuracy", "privacy", "terms", "blog", "features", "what-is-a-learning-story", "eylf-learning-outcomes", "learning-story-template", "safety", "data-sheet", "for-educators", "for-families",
    "te-whariki-learning-outcomes-guide",
    // Free printables (14 Oct 2026): Google ranks PDFs for "... pdf" searches.
    "printables/eylf-v2-outcomes-and-sub-outcomes.pdf",
    "printables/te-whariki-learning-outcomes.pdf",
    "printables/eyfs-areas-of-learning.pdf",
    "printables/aistear-themes.pdf",
    "printables/eylf-principles-and-practices.pdf",
    "printables/te-whariki-principles-strands-goals.pdf",
    "printables/learning-story-template-te-whariki.pdf",
    "printables/learning-story-template-eylf.pdf",
    ...EYLF_OUTCOMES.map((outcome) => `eylf-learning-outcomes/${outcome.slug}`),
    ...TE_WHARIKI_STRANDS.map((strand) => strand.slug),
    // Pages for the people who buy (lib/buyer-pages.ts, 18 Nov 2026).
    ...BUYER_PAGE_SLUGS,
  ];

  const reviewedAt = (slug: string) => SEO_PAGES[slug]?.reviewedAt ?? (BUYER_PAGES as Record<string, { reviewedAt: string } | undefined>)[slug]?.reviewedAt;
  const base: MetadataRoute.Sitemap = [...staticPages, ...SEO_PAGE_SLUGS].map((slug) => ({
    url: slug ? `${SITE_URL}/${slug}` : `${SITE_URL}/`,
    lastModified: slug && reviewedAt(slug)
      ? new Date(`${reviewedAt(slug)}T00:00:00.000Z`)
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
