/**
 * One switch per held page (25 Nov 2026), so the conductor and Leo can release
 * them one at a time. Every entry is false: the page stays as the live site has
 * it (a held buyer page answers 404; a held re-aim leaves the live words).
 *
 * - The four buyer pages held since 19 Nov (lib/buyer-pages.ts): the master
 *   switch HELD_BUYER_PAGES_ON there still turns all of them on at once.
 * - "eylf-planning-cycle": the page is already live at that URL with its June
 *   words. The 25 Nov re-aim (analysis/search.json new_pages, one example
 *   carried through every step and the note box) is built beside it in
 *   lib/seo-pages.ts and replaces those words only when this is true. The URL
 *   and canonical never change.
 */
export const HELD_PAGE_ON = {
  "educational-leader-checklist": false,
  "documentation-workload-early-childhood": false,
  "exceeding-nqs-documentation": false,
  "ask-your-centre": false,
  "eylf-planning-cycle": false,
} as const satisfies Record<string, boolean>;

export type HeldPageSlug = keyof typeof HELD_PAGE_ON;

/** Whether one held page is switched on. Pure. */
export function heldPageOn(slug: string): boolean {
  return (HELD_PAGE_ON as Record<string, boolean>)[slug] === true;
}
