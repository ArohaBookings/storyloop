import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";

// This page sets its own openGraph metadata, which blocks the layout's image.
export const alt = "The 5 EYLF learning outcomes, in plain English";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  return ogImage({ kicker: "EYLF V2.0", title: "The 5 EYLF learning outcomes, in plain English" });
}
