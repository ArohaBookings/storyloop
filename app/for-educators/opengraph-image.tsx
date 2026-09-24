import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";

// This page sets its own openGraph metadata, which blocks the layout's image.
export const alt = "Finish the learning story before you leave";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  return ogImage({ kicker: "For educators", title: "Finish the learning story before you leave" });
}
