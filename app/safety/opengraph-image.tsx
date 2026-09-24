import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";

// This page sets its own openGraph metadata, which blocks the layout's image.
export const alt = "Children's information and AI, in plain words";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  return ogImage({ kicker: "Child safety and AI", title: "Children's information and AI, in plain words" });
}
