import type { TransitionDraft, TransitionFramework } from "@/lib/ai/transition-draft";

/**
 * A whole room's statements, collected on the statement page so they can go
 * to the leader as one set (25 Nov 2026, switch CLASS_SET_ON).
 *
 * STUB: types only. Lane A owns the body (collecting, storing in the browser,
 * clearing); lane B and components/app/SendToLeader.tsx import the types.
 */
export type ClassPiece = {
  childFirstName: string;
  mode: "transition" | "summary";
  framework: TransitionFramework;
  note: string;
  draft: TransitionDraft;
  /** When it was drafted, in milliseconds since 1970. */
  at: number;
};
