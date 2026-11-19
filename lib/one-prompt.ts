/**
 * One prompt at a time on the story page (19 Nov 2026): never two cards asking
 * something of her on one screen. Several things want to appear once a story
 * is written, copied or saved; only the most important of those that want to
 * shows, and the others wait their turn. A card that waits stays mounted, so
 * nothing she has started in it (a half-written review) is lost.
 *
 * Most important first:
 * - wall: the free-limit wall (her story stays on screen beside it).
 * - next_story: the next-story card under her first story (lib/next-story.ts).
 * - upgrade: "First story created" or "1 free story left this month".
 * - review_ask: the review ask under Copy, from her second copy (lib/review-ask.ts).
 * - price_reminder: the quiet price line after a wall on an earlier visit.
 *
 * Any new card that appears after a story is added to this list, in its place,
 * rather than given rules of its own.
 */

export const PROMPT_ORDER = ["wall", "next_story", "upgrade", "review_ask", "price_reminder"] as const;
export type StoryPrompt = (typeof PROMPT_ORDER)[number];
/** Which prompts want the screen right now. A prompt left out does not. */
export type PromptsWanted = Partial<Record<StoryPrompt, boolean>>;

/** The one prompt on screen: the most important of those that want to show, or none (pure). */
export function promptOnScreen(wanted: PromptsWanted): StoryPrompt | null {
  return PROMPT_ORDER.find((prompt) => wanted[prompt] === true) ?? null;
}

/** Whether this prompt may show now: nothing more important wants the screen (pure). */
export function mayShowPrompt(prompt: StoryPrompt, wanted: PromptsWanted): boolean {
  return promptOnScreen({ ...wanted, [prompt]: true }) === prompt;
}
