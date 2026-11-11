import type { TransitionFramework } from "@/lib/ai/transition-draft";

/**
 * "A statement or summary from my notes" (11 Nov 2026).
 *
 * Why it exists. The drafter on the child's page needs a child profile with
 * saved stories, and in 60 days only 5 accounts had made a profile at all:
 * people use StoryLoop as one box they type into. The same job, started from
 * that box: paste what you know about a child, get the outcome-by-outcome
 * draft. It shares the child-page drafter's allowance, so it is one feature
 * with two doors, not two allowances.
 */

/** A first name only: whatever is typed, the first word, at most 30 letters. */
export function cleanFirstName(value: unknown): string {
  if (typeof value !== "string") return "";
  return (value.trim().split(/\s+/)[0] ?? "").replace(/[^\p{L}\p{M}'’-]/gu, "").slice(0, 30);
}

/**
 * The curriculum to offer first, from the browser's time zone. A guess the
 * educator can change with one tap, never a rule.
 */
export function frameworkForZone(zone: string | null | undefined): TransitionFramework {
  const z = (zone ?? "").toLowerCase();
  if (z.includes("auckland") || z.includes("chatham")) return "TW";
  if (z.includes("melbourne")) return "VEYLDF";
  if (z.includes("brisbane") || z.includes("lindeman")) return "QKLG";
  return "EYLF";
}

export const STATEMENT_FRAMEWORKS: TransitionFramework[] = ["EYLF", "VEYLDF", "QKLG", "TW"];
