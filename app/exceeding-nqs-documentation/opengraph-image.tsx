import { notFound } from "next/navigation";
import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";
import { BUYER_PAGES, buyerPageLive } from "@/lib/buyer-pages";

// This page sets its own openGraph metadata, which blocks the layout's image.
const page = BUYER_PAGES["exceeding-nqs-documentation"];
export const alt = page.h1;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  // No share image for a page held out of this release (lib/buyer-pages.ts HELD_BUYER_PAGES_ON).
  if (!buyerPageLive("exceeding-nqs-documentation")) notFound();
  return ogImage({ kicker: page.kicker, title: page.h1 });
}
