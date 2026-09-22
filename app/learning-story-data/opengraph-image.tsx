import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";

export const alt = "Learning stories in numbers";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  return ogImage({ kicker: "Updated daily", title: "Learning stories in numbers" });
}
