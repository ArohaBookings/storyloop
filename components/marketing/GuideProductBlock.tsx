import type { SeoPage } from "@/lib/seo-pages";

/**
 * The product in a guide's own words, mounted once after the intro in
 * app/[slug]/page.tsx (25 Nov 2026, search re-aim).
 *
 * STUB: renders nothing. Lane C owns the body.
 */
export type GuideProductBlockProps = { page: SeoPage };

export default function GuideProductBlock({ page }: GuideProductBlockProps) {
  void page;
  return null;
}
