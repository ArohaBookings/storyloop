/**
 * What an educator does, asked once in the app (10 Nov 2026).
 *
 * Why: every paying account is a teacher on a personal email and no centre has
 * ever been created, so nobody knew which accounts belong to the people who can
 * bring a whole team in. One tap answers it. A leader is then shown their
 * centre's free month; an educator is pointed at the leader check. The answer
 * is kept as a server-written analytics event (page_events, with the signed-in
 * user's id), so it needs no new column and never reaches the story writer.
 */
export const WORK_ROLES = ["educator", "leader", "owner", "student"] as const;
export type WorkRole = (typeof WORK_ROLES)[number];

export const WORK_ROLE_LABELS: Record<WorkRole, string> = {
  educator: "Educator or teacher",
  leader: "Head teacher or team leader",
  owner: "Owner, director or manager",
  student: "Student or reliever",
};

export const ROLE_EVENT = "role_answered";
export const CENTRE_CARD_DISMISSED_EVENT = "centre_card_dismissed";

export function cleanWorkRole(value: unknown): WorkRole | null {
  return typeof value === "string" && (WORK_ROLES as readonly string[]).includes(value) ? (value as WorkRole) : null;
}

/** The people who can start a centre's free month for a team. */
export function decidesForCentre(role: WorkRole | null): boolean {
  return role === "leader" || role === "owner";
}

/**
 * Which card, if any, the dashboard shows. Pure.
 *
 * Asked only after two stories (they have seen what it does), never of an
 * account already in a centre plan or covered by one, and the centre card stays
 * gone once dismissed.
 */
export function teamCardFor(input: {
  role: WorkRole | null;
  stories: number;
  plan: string;
  coveredByCentre: boolean;
  dismissed: boolean;
}): "ask" | "centre" | null {
  if (input.coveredByCentre) return null;
  if (input.plan === "centre_starter" || input.plan === "centre_growth") return null;
  if (!input.role) return input.stories >= 2 ? "ask" : null;
  if (decidesForCentre(input.role) && !input.dismissed) return "centre";
  return null;
}

/**
 * "Get your centre on board" (components/app/CentreOnBoardCard.tsx), which asks
 * an educator to send a story to her leader: only for someone in no centre, not
 * on a centre plan, and not a leader or owner herself. A leader is shown her own
 * centre card instead and is never told to "show your leader". Pure.
 */
export function showsOnBoardCard(input: { role: WorkRole | null; inCentre: boolean; centrePlan: boolean }): boolean {
  if (input.inCentre || input.centrePlan) return false;
  return !decidesForCentre(input.role);
}
