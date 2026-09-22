import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";
import { SEO_PAGES } from "@/lib/seo-pages";

/**
 * A guide's own card, carrying its own heading.
 *
 * The difference between a share that says "StoryLoop" and one that says
 * "You get a few days' notice, not a few weeks" is the difference between a
 * link somebody scrolls past and a link somebody opens.
 */
export const alt = "StoryLoop guide";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function GuideOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = SEO_PAGES[slug];
  return ogImage({
    kicker: page?.kicker ?? "Guide",
    title: page?.heading ?? page?.title ?? "StoryLoop",
  });
}
