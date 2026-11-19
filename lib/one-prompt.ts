/**
 * One prompt at a time, one card per story (release decision, 19 Nov 2026),
 * decided here and nowhere else. The story page (/generate) and every story in
 * Story history ask this file before they show any of the prompts below.
 *
 * Several things want her attention once a story is written, copied or saved.
 * Shown together they bury the story and teach her to ignore all of them. So:
 *
 *  1. Never two on one screen: of the prompts that want the screen, only the
 *     most important shows; the others wait. A card that waits stays mounted
 *     (hidden), so nothing she started in it (a half-written review) is lost.
 *  2. One card per story: the story cards (the next-story card, "Send this to
 *     my leader", the review ask) share one slot per story. The first of them
 *     to show for a story keeps that slot until another story is on screen;
 *     closing it does not hand the slot to the next card.
 *
 * Most important first:
 * - wall: the free-limit wall (her story stays on screen beside it). Above all.
 * - next_story: the next-story card after her first story (lib/next-story.ts).
 * - upgrade: "First story created" or "1 free story left this month".
 * - leader_card: "Send this to my leader" after her second story or later,
 *   once ever, dismissible for good (lib/leader-card.ts).
 * - review_ask: the review ask, only at Copy, from her second copy
 *   (lib/review-ask.ts). At a copy the leader card is asked first; the copy
 *   counts toward the review ask only once the leader card has said it will
 *   not show for that story (reviewCopyCounts).
 * - price_reminder: the quiet price line after a wall on an earlier visit:
 *   never beside another prompt or a story card.
 *
 * Each card still decides for itself whether it is due (its own rule, usually
 * answered by the server); this file only decides which due card may show.
 * Pure, tested without a browser (tests/one-prompt.test.ts). Any new card that
 * appears after a story is added to this list, in its place, rather than given
 * rules of its own.
 */

export const PROMPT_ORDER = ["wall", "next_story", "upgrade", "leader_card", "review_ask", "price_reminder"] as const;
export type StoryPrompt = (typeof PROMPT_ORDER)[number];

/** The cards that share one slot per story. */
export const STORY_CARDS: readonly StoryPrompt[] = ["next_story", "leader_card", "review_ask"];
/** Cards that belong to one story and so need its id to show. */
const NEEDS_STORY: readonly StoryPrompt[] = ["leader_card", "review_ask"];

/** Which prompts want the screen right now. A prompt left out does not. */
export type PromptsWanted = Partial<Record<StoryPrompt, boolean>>;

/** Which story card holds the slot of which story, or null while none does. */
export type PromptSlot = { storyId: string; prompt: StoryPrompt } | null;

/** Everything the rule needs to know about the screen. */
export type PromptScreen = {
  wanted: PromptsWanted;
  /** The story on screen ("" when none). */
  storyId?: string;
  slot?: PromptSlot;
};

/** Whether the one-card-per-story slot keeps this prompt off the screen (pure). */
function heldBack(prompt: StoryPrompt, { storyId = "", slot = null }: PromptScreen): boolean {
  if (NEEDS_STORY.includes(prompt) && !storyId) return true;
  const slotHere = Boolean(slot && storyId && slot.storyId === storyId);
  if (prompt === "price_reminder") return slotHere;
  if (STORY_CARDS.includes(prompt)) return slotHere && slot!.prompt !== prompt;
  return false;
}

/** The one prompt on screen: the most important of those that want to show and are not held back, or none (pure). */
export function promptOnScreen(screen: PromptScreen): StoryPrompt | null {
  return PROMPT_ORDER.find((prompt) => screen.wanted[prompt] === true && !heldBack(prompt, screen)) ?? null;
}

/** Whether this prompt may show now: its story's slot is free or its own, and nothing more important wants the screen (pure). */
export function mayShowPrompt(prompt: StoryPrompt, screen: PromptScreen): boolean {
  if (heldBack(prompt, screen)) return false;
  return promptOnScreen({ ...screen, wanted: { ...screen.wanted, [prompt]: true } }) === prompt;
}

/**
 * The slot after a story card shows for a story: the card takes it if it is
 * free (or held for another story, now off screen); otherwise the holder keeps
 * it. Prompts that are not story cards never take it. Pure.
 */
export function claimPrompt(slot: PromptSlot, storyId: string, prompt: StoryPrompt): PromptSlot {
  if (!storyId || !STORY_CARDS.includes(prompt)) return slot;
  if (slot && slot.storyId === storyId) return slot;
  return { storyId, prompt };
}

/** What the leader card has said about the story on screen. */
export type LeaderAnswer = "unknown" | "shown" | "declined";

/**
 * At a copy: does it count toward the review ask now ("count"), once the
 * leader card has answered ("wait"), or not at all ("skip")? The leader card
 * comes first; the review ask may follow only a copy of a story the leader
 * card declined, and never while another prompt has the screen. Pure.
 */
export function reviewCopyCounts(screen: PromptScreen, leader: LeaderAnswer): "count" | "wait" | "skip" {
  if (!mayShowPrompt("review_ask", screen)) return "skip";
  if (leader === "declined") return "count";
  return leader === "unknown" ? "wait" : "skip";
}
