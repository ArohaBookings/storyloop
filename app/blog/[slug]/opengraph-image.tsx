import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";
import { getPublishedPost } from "@/lib/blog";

/** A post's own card, carrying its own headline. */
export const alt = "StoryLoop";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function PostOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // A share card must never be the reason a page fails to render.
  const post = await getPublishedPost(slug).catch(() => null);
  return ogImage({
    kicker: "StoryLoop journal",
    title: post?.title ?? "Writing for early childhood educators",
  });
}
