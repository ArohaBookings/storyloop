import { ogImage, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og-image";
import { eylfOutcomeBySlug } from "@/lib/eylf-outcomes";

// This page sets its own openGraph metadata, which blocks the layout's image.
export const alt = "An EYLF V2.0 learning outcome, with its sub-outcomes and examples";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage({ params }: { params: Promise<{ outcome: string }> }) {
  const outcome = eylfOutcomeBySlug((await params).outcome);
  return ogImage({
    kicker: outcome ? `EYLF V2.0 · Outcome ${outcome.n}` : "EYLF V2.0",
    title: outcome ? outcome.title : "The 5 EYLF learning outcomes",
  });
}
