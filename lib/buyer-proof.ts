import { REAL_EXAMPLES, type RealExample } from "@/lib/real-examples";
import { HERO_PROOFS, type HeroProofItem } from "@/lib/hero-proofs";

/**
 * The real examples the buyer pages show (lib/buyer-pages.ts). Every word
 * comes from a draft StoryLoop's production writer returned in the 23 Sep 2026
 * evaluation run (lib/real-examples.ts) or from the hero's proof card
 * (lib/hero-proofs.ts, itself checked against those drafts), so a page can
 * never show an example the product did not write. Server-side only: the
 * pages render these as text, and no story file reaches a phone.
 */

/** The section headings StoryLoop's drafts use, each on its own line. */
export const DRAFT_HEADINGS = [
  "Learning Story",
  "What learning we noticed",
  "Curriculum links",
  "Where to next / Responding",
  "Family link",
  "Whānau link",
] as const;

export function realExample(slug: string): RealExample | null {
  return REAL_EXAMPLES.find((example) => example.slug === slug) ?? null;
}

/** The paragraphs under one heading of a real draft, word for word. Pure. */
export function draftSection(story: string, heading: string): string[] {
  const paragraphs: string[] = [];
  let current: string | null = null;
  for (const raw of story.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if ((DRAFT_HEADINGS as readonly string[]).includes(line)) {
      current = line;
      continue;
    }
    if (current === heading) paragraphs.push(line);
  }
  return paragraphs;
}

export type NoteProof = {
  /** Where the full draft is. */
  href: string;
  /** The educator's note, as she wrote it (trimmed to two lines on the hero card). */
  note: string;
  /** What StoryLoop wrote from it, word for word. */
  wrote: string;
  /** The child's words inside `wrote`, highlighted. */
  quote: string | null;
  /** The curriculum the draft links, as short labels. */
  links: string[];
};

/** The hero's proof card for one country: a real note and one sentence of its draft. */
export function heroNoteProof(region: "AU" | "NZ"): NoteProof {
  const proof: HeroProofItem = HERO_PROOFS[region];
  return { href: proof.href, note: proof.jot, wrote: proof.excerpt, quote: proof.quote, links: proof.links };
}

/**
 * For the observation page: the real note and the outcome line StoryLoop wrote
 * from it, with its reason ("EYLF Outcome 5: ... Ruby used the words "all gone"
 * to let us know she was finished ...").
 */
export function outcomeNoteProof(): NoteProof | null {
  const hero = HERO_PROOFS.AU;
  const example = realExample(hero.slug);
  if (!example) return null;
  const line = draftSection(example.story, "Curriculum links").find((paragraph) => hero.quote && paragraph.includes(hero.quote));
  if (!line) return null;
  return { href: hero.href, note: hero.jot, wrote: line, quote: hero.quote, links: [] };
}
