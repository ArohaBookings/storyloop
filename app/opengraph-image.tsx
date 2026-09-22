import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";

/** The card behind every share that does not have a more specific one. */
export const alt = "StoryLoop — learning stories drafted faster, without losing educator voice";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  return ogImage({
    kicker: "For early childhood educators",
    title: "Learning stories drafted faster, without losing your voice",
  });
}
