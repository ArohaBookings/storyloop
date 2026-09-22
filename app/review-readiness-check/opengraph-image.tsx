import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";

/**
 * This page's own share card. A page that sets its own openGraph metadata
 * without `images` blocks the one inherited from the layout, so each such
 * segment needs its own, and each is better for carrying its own title.
 */
export const alt = "Would your documentation hold up if the call came tomorrow?";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  return ogImage({ kicker: "Free for directors", title: "Would your documentation hold up if the call came tomorrow?" });
}
