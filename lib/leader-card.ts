import { showsOnBoardCard, type WorkRole } from "@/lib/work-role";

/**
 * "Send this to my leader" (19 Nov 2026): a quiet card, never a pop-up, that
 * appears under a story right after an educator copies it, from her second
 * story on, and offers to send that story to her leader for a quick look
 * through the leader check she already has (components/app/LeaderCheck.tsx;
 * the leader's page carries the centre's free period and one-tap invite).
 *
 * Why: of the routes to a first centre, the research ranked this first: the
 * leader meets StoryLoop through a real story about her own children, with no
 * cold contact. Nobody had ever sent a leader check, and the only way in was a
 * row of buttons she had no reason to look at.
 *
 * Who sees it, all decided here so it can be tested without a database:
 *  - her own story, and she has saved at least two (she has seen what it does);
 *  - someone in no centre, not on a centre plan, and not a leader or owner
 *    herself (the same people as "Get your centre on board", lib/work-role.ts);
 *  - ONCE (release decision, 19 Nov 2026): after it has been offered
 *    LEADER_CARD_MAX_SHOWS times it never comes back, whatever she did;
 *  - never again once she has sent any story to a leader, or said No thanks.
 * It takes the story's one prompt slot (lib/one-prompt.ts), so the review ask
 * never shows beside it. "Offered" and "No thanks" are kept on the server, as
 * page_events rows with her id like the centre card's (lib/work-role-server.ts),
 * so both hold on every device.
 */

export const LEADER_CARD_DISMISSED_EVENT = "leader_card_dismissed";
/** Kept when the server answers "show": how "once" is counted, on every device. */
export const LEADER_CARD_OFFERED_EVENT = "leader_card_offered";
/** The card starts with her second saved story. */
export const LEADER_CARD_MIN_STORIES = 2;
/** How many times it is ever offered: once (release decision, 19 Nov 2026). */
export const LEADER_CARD_MAX_SHOWS = 1;

export type LeaderCardFacts = {
  /** The story she copied is one of her own saved stories. */
  storyIsHers: boolean;
  /** How many stories she has saved. */
  stories: number;
  inCentre: boolean;
  centrePlan: boolean;
  role: WorkRole | null;
  /** She said No thanks to the card. */
  dismissed: boolean;
  /** She has made a leader check before, for any story. */
  sentBefore: boolean;
  /** How many times the card has been offered to her before. */
  offeredBefore: number;
};

/** Whether the card shows after this copy. Pure. */
export function showsLeaderCard(facts: LeaderCardFacts): boolean {
  if (!facts.storyIsHers || facts.stories < LEADER_CARD_MIN_STORIES) return false;
  if (facts.dismissed || facts.sentBefore) return false;
  if (!(facts.offeredBefore < LEADER_CARD_MAX_SHOWS)) return false;
  return showsOnBoardCard({ role: facts.role, inCentre: facts.inCentre, centrePlan: facts.centrePlan });
}

/** What the browser may ask for. Anything else is refused. Pure. */
export function readLeaderCardRequest(body: unknown): { action: "check"; storyId: string } | { action: "dismiss" } | null {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (input.action === "dismiss") return { action: "dismiss" };
  if (input.action === "check" && typeof input.storyId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.storyId)) {
    return { action: "check", storyId: input.storyId.toLowerCase() };
  }
  return null;
}
