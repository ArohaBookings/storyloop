import { REAL_EXAMPLES, type RealExample } from "./real-examples";

/**
 * Which real draft the guide proof card shows for each curriculum, and the
 * opening of it. Both drafts are exactly what production wrote in the 23 Sep
 * 2026 evaluation run and scored 10 for staying true to the note.
 */
export const PROOF_PICKS = { NZ: "two-shoes-independence-nz", AU: "four-maths-au" } as const;

export function proofExample(framework: "NZ" | "AU"): RealExample | null {
  return REAL_EXAMPLES.find((item) => item.slug === PROOF_PICKS[framework] && item.framework === framework) ?? null;
}

/** The first two paragraphs of the draft, after the title and the "Learning Story" label. */
export function draftOpening(story: string): Array<{ heading: string | null; text: string }> {
  const paragraphs = story
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^Learning Story\s*\n?/i, "").trim())
    .filter(Boolean);
  return paragraphs.slice(1, 3).map((part) => {
    // A section of the draft starts with its heading on its own line.
    const [first, ...rest] = part.split("\n");
    const isHeading = rest.length > 0 && first.length <= 40 && !/[.!?,"”]$/.test(first.trim());
    return isHeading ? { heading: first.trim(), text: rest.join(" ").trim() } : { heading: null, text: part.replace(/\n/g, " ") };
  });
}
