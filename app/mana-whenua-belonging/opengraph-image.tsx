import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";
import { strandBySlug } from "@/lib/te-whariki-strands";

// This page sets its own openGraph metadata, which blocks the layout's image.
export const alt = "A Te Whāriki strand, with its goals and learning outcomes";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
  const strand = strandBySlug("mana-whenua-belonging");
  return ogImage({
    kicker: strand ? `Te Whāriki · Strand ${strand.n} of 5` : "Te Whāriki",
    title: strand ? `${strand.maori} | ${strand.english}: goals and learning outcomes` : "Te Whāriki strands",
  });
}
