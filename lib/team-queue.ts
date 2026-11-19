import type { ReviewStatus } from "@/lib/centre-team";
import type { StoryCheckResult } from "@/lib/check-my-story";

/**
 * One story in a leader's team review queue, as the page shows it. Built on
 * the server from stories the leader may read (lib/centre-team-server.ts), or
 * from the invented sample team (lib/sample-team.ts). Shared by both so the
 * sample shows the queue exactly as it works.
 */
export type TeamQueueItem = {
  id: string;
  /** The educator's first name, never an address. */
  author: string;
  childName: string | null;
  createdAt: string;
  storyText: string;
  /** The educator's own note the story was written from. */
  note: string | null;
  outcomes: string[];
  review: TeamReviewView | null;
  /**
   * Check my story (19 Nov 2026): what a leader looks for, worked out on the
   * server from the story and its note (lib/check-my-story.ts withStoryCheck).
   * Every item a page shows carries it.
   */
  check?: StoryCheckResult;
};

export type TeamReviewView = {
  status: ReviewStatus;
  note: string | null;
  /** First name of the leader who answered, or "You". */
  reviewer: string | null;
  at: string;
};

/** What the author sees on her own story: the centre's answer, if any. */
export type AuthorReviewView = TeamReviewView & { centreName: string | null; seen: boolean };

/** "today", "yesterday", "3 days ago", "12 Nov": how long ago, in a leader's words. */
export function agoLabel(iso: string, now = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

/** The same, ready for the middle of a sentence: "today", "3 days ago", "on 12 Nov". */
export function whenLabel(iso: string, now = new Date()): string {
  const label = agoLabel(iso, now);
  return /^\d/.test(label) && !label.endsWith("ago") ? `on ${label}` : label;
}

/** How many stories in the queue have no answer yet. */
export function waitingCount(items: readonly Pick<TeamQueueItem, "review">[]): number {
  return items.filter((item) => !item.review).length;
}
