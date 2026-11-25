/**
 * One switch per held page (25 Nov 2026), so the conductor and Leo can release
 * them one at a time. Off, a page stays as the live site has it (a held buyer
 * page answers 404; a held re-aim leaves the live words). The values are in
 * lib/build-switches.ts; this file says what each one does.
 *
 * - The four buyer pages held since 19 Nov (lib/buyer-pages.ts): the master
 *   switch HELD_BUYER_PAGES_ON there still turns all of them on at once.
 * - "eylf-planning-cycle": the page is already live at that URL with its June
 *   words. The 25 Nov re-aim (analysis/search.json new_pages, one example
 *   carried through every step and the note box) is built beside it in
 *   lib/seo-pages.ts and replaces those words only when this is true. The URL
 *   and canonical never change.
 * - "assessment-and-rating-evidence" (builder X3, 25 Nov): the live page re-aimed
 *   at "assessment and rating" (lib/seo-pages-held.ts ASSESSMENT_AND_RATING_REAIM)
 *   with a leader block. Same URL and canonical; off keeps the live words.
 * - "qip-childcare" (builder X3, 25 Nov): a new page for "qip childcare", what a
 *   Quality Area 1 entry in a QIP looks like (lib/buyer-pages.ts). Off: 404, not
 *   in the sitemap, and no page links to it.
 */
// The values live in lib/build-switches.ts (MERGE2 2g), the one file that holds every switch of this build.
import { HELD_PAGE_ON } from "@/lib/build-switches";
export { HELD_PAGE_ON };

export type HeldPageSlug = keyof typeof HELD_PAGE_ON;

/** Whether one held page is switched on. Pure. */
export function heldPageOn(slug: string): boolean {
  return (HELD_PAGE_ON as Record<string, boolean>)[slug] === true;
}
