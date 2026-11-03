/**
 * The real examples on the hero photograph's proof chip (components/landing/Hero.tsx).
 * Kept here, small, so the homepage does not ship lib/real-examples.ts (39 KB
 * of stories) to every phone. tests/hero-proofs.test.ts checks every field
 * against the real drafts, so this can never drift from what StoryLoop wrote.
 * The jots are the real notes, trimmed to fit two lines.
 */
/**
 * `excerpt`: one or two sentences taken word for word from the real draft, holding
 * the child's words (`quote`, as the draft prints them). The hero shows the note
 * and this excerpt side by side (3 Nov 2026): the product's whole value in one
 * glance, with no typing.
 */
export type HeroProofItem = { slug: string; href: string; jot: string; title: string; words: number; links: string[]; excerpt: string; quote: string };
export type HeroRegion = "AU" | "NZ" | "UK" | "IE";

/**
 * Which example a visitor sees, by the device's time zone. Australia is the
 * default (most visitors). England and Ireland (27 Oct 2026, ahead of ads in
 * both countries) see their own curriculum, linked to the guide that shows the
 * whole story and lets them try it.
 */
export function heroRegionForZone(zone: string): HeroRegion {
  if (zone === "Pacific/Auckland" || zone === "Pacific/Chatham") return "NZ";
  if (zone === "Europe/Dublin") return "IE";
  if (["Europe/London", "Europe/Belfast", "Europe/Jersey", "Europe/Guernsey", "Europe/Isle_of_Man"].includes(zone)) return "UK";
  return "AU";
}

export const HERO_PROOFS: Record<HeroRegion, HeroProofItem> = {
  AU: {
    slug: "one-feeding-au",
    href: "/examples#one-feeding-au",
    jot: "Ruby fed herself yoghurt with a spoon, fingers for the last bit. Said 'all gone'.",
    title: "Ruby feeding herself",
    words: 293,
    links: ["EYLF Outcome 3", "EYLF Outcome 5"],
    excerpt: "Near the end, Ruby put the spoon down and used her fingers for the last bit. When she finished, she said, \"all gone\".",
    quote: "\"all gone\"",
  },
  NZ: {
    slug: "toddler-sand-quote-nz",
    href: "/examples#toddler-sand-quote-nz",
    jot: "Tama filled the bucket, tipped it out, again and again. Said \"more sand\" when it was empty.",
    title: "More sand",
    words: 385,
    links: ["Mana aotūroa", "Mana reo"],
    excerpt: "When the bucket was empty, Tama used his words to ask for what he wanted. He said, \"more sand\".",
    quote: "\"more sand\"",
  },
  // lib/international-examples.ts; words counted from the whole draft.
  UK: {
    slug: "uk-playdough",
    href: "/eyfs-learning-stories#try",
    jot: "Poppy rolled playdough snakes. Said 'mine is longest', then cut hers in half: 'now it's two'.",
    title: "Making more with playdough",
    words: 331,
    links: ["EYFS: Mathematics", "Communication and language"],
    excerpt: "After comparing the two pieces, Poppy changed her idea. She cut her long piece in half and said, “now it’s two”.",
    quote: "“now it’s two”",
  },
  IE: {
    slug: "ie-puddles",
    href: "/aistear-learning-stories#try",
    jot: "Oisín stamped in the puddle, stamped harder. Said 'big splash!' Drew in the mud: 'look, road'.",
    title: "Puddles, mud and roads",
    words: 373,
    links: ["Exploring and Thinking", "Communicating"],
    excerpt: "He stamped in the water, watched the splash, and then stamped harder. When the splash changed, Oisín named what he saw: “big splash!”",
    quote: "“big splash!”",
  },
};
