/**
 * "What's stopping you from trying it?" (3 Nov 2026). Real visitors' own
 * reasons, recorded as an exit_feedback event (app/api/track) and, from 18 Nov
 * 2026, exit_question_answered (lib/analytics/events.ts). Until now the only
 * evidence was what people did; this asks the people themselves.
 *
 * 18 Nov 2026: also on /pricing, /features and /for-centres (fault P07: on
 * /about alone it was never answered), one tap only, shown once per visitor.
 * The typed note is gone: an event carries a listed reason, never words a
 * person typed. The labels never name or point to another product.
 */
export const EXIT_REASONS = [
  { key: "only_needed_resource", label: "I only needed the example or template" },
  { key: "want_to_see_more", label: "I want to see more before I sign up" },
  { key: "not_sure_accurate", label: "Not sure it would be accurate" },
  { key: "privacy_policy", label: "Privacy, or my centre's rules" },
  // The key is kept for the data; the label no longer points at other products.
  { key: "use_other_ai", label: "I already have a way that works" },
  { key: "too_busy", label: "Too busy right now" },
  { key: "price", label: "The price" },
  { key: "not_my_curriculum", label: "Not for my curriculum or age group" },
  { key: "something_else", label: "Something else" },
] as const;

export type ExitReason = (typeof EXIT_REASONS)[number]["key"];
export type ExitSurface = "about" | "pricing" | "features" | "for_centres";
export const EXIT_TEXT_MAX = 300;

const KEYS = new Set<string>(EXIT_REASONS.map((r) => r.key));
const SURFACES = new Set<string>(["about", "pricing", "features", "for_centres"]);

/** Where each surface lives, for the page key of the new events. */
export const EXIT_SURFACE_PATH: Record<ExitSurface, string> = {
  about: "/about",
  pricing: "/pricing",
  features: "/features",
  for_centres: "/for-centres",
};

/**
 * Once per visitor: the question shows on the first of these pages where she
 * scrolls to it. For the rest of that visit it stays on that page (a reload or
 * a step back does not take away a half-made answer); after that, and on every
 * other page, it is gone. `seenOn` is the page it was first shown on, read back
 * from the browser; `seenThisVisit` says that happened in this visit.
 */
export function shouldShowExitQuestion(seenOn: string | null, answered: boolean, here: ExitSurface, seenThisVisit: boolean): boolean {
  if (answered) return false;
  if (!seenOn) return true;
  return seenOn === here && seenThisVisit;
}

/** What may be recorded: a known reason, a known surface and a short note with emails and long digit runs blanked. */
export function cleanExitFeedback(raw: { reason?: unknown; surface?: unknown; text?: unknown }) {
  const reason = typeof raw.reason === "string" && KEYS.has(raw.reason) ? (raw.reason as ExitReason) : null;
  const surface = typeof raw.surface === "string" && SURFACES.has(raw.surface) ? (raw.surface as ExitSurface) : null;
  if (!reason || !surface) return null;
  const text = typeof raw.text === "string"
    ? raw.text.replace(/[^\s@]+@[^\s@]+/g, "[email]").replace(/\d[\d\s-]{6,}\d/g, "[number]").replace(/\s+/g, " ").trim().slice(0, EXIT_TEXT_MAX)
    : "";
  return { reason, surface, text };
}
