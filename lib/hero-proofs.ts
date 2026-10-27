/**
 * The two real examples on the phone hero (components/landing/HeroProof.tsx).
 * Kept here, small, so the homepage does not ship lib/real-examples.ts (39 KB
 * of stories) to every phone. tests/hero-proofs.test.ts checks every field
 * against the real drafts, so this can never drift from what StoryLoop wrote.
 * The jots are the real notes, trimmed to fit two lines.
 */
export type HeroProofItem = { slug: string; jot: string; title: string; words: number; links: string[] };

export const HERO_PROOFS: Record<"AU" | "NZ", HeroProofItem> = {
  AU: {
    slug: "one-feeding-au",
    jot: "Ruby fed herself yoghurt with a spoon, fingers for the last bit. Said 'all gone'.",
    title: "Ruby feeding herself",
    words: 293,
    links: ["EYLF Outcome 3", "EYLF Outcome 5"],
  },
  NZ: {
    slug: "toddler-sand-quote-nz",
    jot: "Tama filled the bucket, tipped it out, again and again. Said \"more sand\" when it was empty.",
    title: "More sand",
    words: 385,
    links: ["Mana aotūroa", "Mana reo"],
  },
};
