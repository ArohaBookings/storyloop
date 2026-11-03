/**
 * "Not for you today? One tap tells us why" (3 Nov 2026). Real visitors' own
 * reasons for leaving, recorded as an exit_feedback event (app/api/track). Until
 * now the only evidence was what people did; this asks the people themselves.
 * The labels never name another product.
 */
export const EXIT_REASONS = [
  { key: "only_needed_resource", label: "I only needed the example or template" },
  { key: "want_to_see_more", label: "I want to see more before I sign up" },
  { key: "not_sure_accurate", label: "Not sure it would be accurate" },
  { key: "privacy_policy", label: "Privacy, or my centre's rules" },
  { key: "use_other_ai", label: "I already use another AI tool" },
  { key: "too_busy", label: "Too busy right now" },
  { key: "price", label: "The price" },
  { key: "not_my_curriculum", label: "Not for my curriculum or age group" },
  { key: "something_else", label: "Something else" },
] as const;

export type ExitReason = (typeof EXIT_REASONS)[number]["key"];
export type ExitSurface = "home" | "guide" | "signup";
export const EXIT_TEXT_MAX = 300;

const KEYS = new Set<string>(EXIT_REASONS.map((r) => r.key));
const SURFACES = new Set<string>(["home", "guide", "signup"]);

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
