import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";

// This page sets its own openGraph metadata, which blocks the layout's image.
export const alt = "Te Whāriki learning outcomes, all 20 by strand";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  return ogImage({ kicker: "Te Whāriki", title: "Te Whāriki learning outcomes, all 20 by strand" });
}
