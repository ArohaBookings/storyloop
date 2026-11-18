import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";
import { BUYER_PAGES } from "@/lib/buyer-pages";

// This page sets its own openGraph metadata, which blocks the layout's image.
const page = BUYER_PAGES["ask-your-centre"];
export const alt = page.h1;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  return ogImage({ kicker: page.kicker, title: page.h1 });
}
