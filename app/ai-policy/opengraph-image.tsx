import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";

/**
 * This page's own share card. A page that sets its own openGraph metadata
 * without `images` blocks the one inherited from the layout, so each such
 * segment needs its own, and each is better for carrying its own title.
 */
export const alt = "An AI policy your service can actually adopt";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  return ogImage({ kicker: "Free tool", title: "An AI policy your service can actually adopt" });
}
