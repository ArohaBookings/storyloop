/**
 * One prompt per story (release decision, 19 Nov 2026), decided here and
 * nowhere else.
 *
 * Several quiet cards want the same moment, the moment she takes a finished
 * story away (copies it): the next-story card, "Send this to my leader" and
 * the review ask. Shown together they bury the story and teach her to ignore
 * all of them. So a story on screen has ONE prompt slot:
 *
 *  1. "second_story": her first story. The next one, in a tap (app lane,
 *     lib/next-story.ts).
 *  2. "leader_card": her second story or later. "Send this to my leader"
 *     (lib/leader-card.ts): once ever, and dismissible for good.
 *  3. "review_ask": otherwise, from her second copy, on its own 30-day rule
 *     (lib/review-ask.ts).
 *
 * The first card to take a story's slot keeps it until another story is on
 * screen. Closing a card does not hand the slot to the next one: one prompt
 * per story, never two on one screen. The price reminder line (after a wall on
 * an earlier visit) only shows when no card holds the slot.
 *
 * Each card still decides for itself whether it is due (its own rule, usually
 * answered by the server); this file only decides which due card may show.
 * Pure: the story page and Story history use it, and it is tested without a
 * browser (tests/one-prompt.test.ts).
 */

export type StoryPrompt = "second_story" | "leader_card" | "review_ask";

/** Highest first: when more than one is due for the same story, the first wins. */
export const PROMPT_ORDER: readonly StoryPrompt[] = ["second_story", "leader_card", "review_ask"];

/** Which card holds the slot of which story, or null while none does. */
export type PromptSlot = { storyId: string; prompt: StoryPrompt } | null;

/**
 * The one prompt a story may show, given which cards are due for it: the
 * holder of its slot if one has taken it, otherwise the first due card in
 * PROMPT_ORDER, otherwise none. Pure.
 */
export function promptFor(storyId: string, due: Partial<Record<StoryPrompt, boolean>>, slot: PromptSlot): StoryPrompt | null {
  if (!storyId) return null;
  if (slot && slot.storyId === storyId) return slot.prompt;
  return PROMPT_ORDER.find((prompt) => due[prompt] === true) ?? null;
}

/**
 * Whether this card may still show for this story: nothing holds the story's
 * slot, or this card does. A card that may not show does not even ask
 * whether it is due. Pure.
 */
export function mayShowPrompt(prompt: StoryPrompt, storyId: string, slot: PromptSlot): boolean {
  if (!storyId) return false;
  return !slot || slot.storyId !== storyId || slot.prompt === prompt;
}

/**
 * The slot after a card shows for a story: the card takes it if it is free
 * (or held for another story, now off screen); otherwise the holder keeps it.
 * Pure.
 */
export function claimPrompt(slot: PromptSlot, storyId: string, prompt: StoryPrompt): PromptSlot {
  if (!storyId) return slot;
  if (slot && slot.storyId === storyId) return slot;
  return { storyId, prompt };
}

/** The price reminder line never shows together with a card. Pure. */
export function priceReminderMayShow(slot: PromptSlot, storyOnScreen: string): boolean {
  return !slot || !storyOnScreen || slot.storyId !== storyOnScreen;
}
