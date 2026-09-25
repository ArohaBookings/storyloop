import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";

// This page sets its own openGraph metadata, which blocks the layout's image.
export const alt = "Which AI tool should you use for learning stories?";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  return ogImage({ kicker: "An honest comparison", title: "Which AI tool should you use for learning stories?" });
}
