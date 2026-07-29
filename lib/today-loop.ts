import { normalizePlanKey } from "@/lib/plans";

export const FREE_TODAY_CAPTURE_LIMIT = 10;

export type DailyCaptureStatus = "captured" | "planned" | "story_ready" | "archived";

export type DailyCapture = {
  id: string;
  child_id: string | null;
  child_name: string | null;
  note: string;
  status: DailyCaptureStatus;
  observed_at: string;
  created_at: string;
  updated_at: string;
};

export type TodayChild = {
  id: string;
  name: string;
};

export type TodayStory = {
  id: string;
  child_id: string | null;
  child_name: string | null;
  next_steps: string[] | null;
  metadata: unknown;
  created_at: string;
};

export type TodayFocus = {
  id: string;
  kind: "close_loop" | "revisit" | "notice";
  eyebrow: string;
  title: string;
  body: string;
  childId: string | null;
  sourceStoryId: string | null;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function isOpenFollowUp(story: TodayStory) {
  const metadata = asRecord(story.metadata);
  return metadata.followUpStatus !== "revisited";
}

export function monthStartIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function todayCaptureAllowance(plan: unknown, used: number) {
  if (normalizePlanKey(plan) !== "free") {
    return { limit: null, used, remaining: null, allowed: true };
  }

  const remaining = Math.max(FREE_TODAY_CAPTURE_LIMIT - used, 0);
  return {
    limit: FREE_TODAY_CAPTURE_LIMIT,
    used,
    remaining,
    allowed: remaining > 0,
  };
}

/**
 * Build a small, deterministic room focus from work the educator already did.
 * No child is scored or ranked. The order only helps the educator close an
 * unfinished loop, revisit an existing next step, then notice a child whose
 * most recent documented story is oldest.
 */
export function buildTodayFocus({
  children,
  stories,
  captures,
}: {
  children: TodayChild[];
  stories: TodayStory[];
  captures: DailyCapture[];
}): TodayFocus[] {
  const result: TodayFocus[] = [];
  const usedChildren = new Set<string>();
  const childById = new Map(children.map((child) => [child.id, child]));

  for (const capture of captures) {
    if (result.length >= 3) break;
    if (capture.status !== "captured") continue;
    if (capture.child_id && usedChildren.has(capture.child_id)) continue;

    result.push({
      id: `capture-${capture.id}`,
      kind: "close_loop",
      eyebrow: "Close a loop",
      title: capture.child_name ? `Decide what to do with ${capture.child_name}'s moment` : "Decide what this moment needs",
      body: "Turn it into a story, hold it for planning, or archive it. No duplicate form.",
      childId: capture.child_id,
      sourceStoryId: null,
    });
    if (capture.child_id) usedChildren.add(capture.child_id);
  }

  const latestStoryByChild = new Map<string, TodayStory>();
  for (const story of stories) {
    if (!story.child_id || latestStoryByChild.has(story.child_id)) continue;
    latestStoryByChild.set(story.child_id, story);
  }

  for (const story of stories) {
    if (result.length >= 3) break;
    if (!story.child_id || usedChildren.has(story.child_id) || !isOpenFollowUp(story)) continue;
    const nextStep = story.next_steps?.find((item) => typeof item === "string" && item.trim());
    if (!nextStep) continue;
    const name = childById.get(story.child_id)?.name ?? story.child_name ?? "this child";

    result.push({
      id: `story-${story.id}`,
      kind: "revisit",
      eyebrow: "Revisit",
      title: `Notice what happens next for ${name}`,
      body: nextStep,
      childId: story.child_id,
      sourceStoryId: story.id,
    });
    usedChildren.add(story.child_id);
  }

  const childrenByOldestStory = [...children].sort((a, b) => {
    const aDate = latestStoryByChild.get(a.id)?.created_at ?? "";
    const bDate = latestStoryByChild.get(b.id)?.created_at ?? "";
    if (!aDate && bDate) return -1;
    if (aDate && !bDate) return 1;
    return aDate.localeCompare(bDate);
  });

  for (const child of childrenByOldestStory) {
    if (result.length >= 3) break;
    if (usedChildren.has(child.id)) continue;
    const latest = latestStoryByChild.get(child.id);
    const dateLabel = latest
      ? new Date(latest.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
      : null;

    result.push({
      id: `notice-${child.id}`,
      kind: "notice",
      eyebrow: "Stay curious",
      title: `Make space to notice ${child.name}`,
      body: dateLabel
        ? `Their most recent saved story was ${dateLabel}. Capture only what genuinely happens today.`
        : "There is no saved story yet. A short, real moment is enough to begin.",
      childId: child.id,
      sourceStoryId: null,
    });
    usedChildren.add(child.id);
  }

  if (result.length === 0) {
    result.push({
      id: "first-moment",
      kind: "notice",
      eyebrow: "Start lightly",
      title: "Notice one moment worth remembering",
      body: "Capture what a child did, said, tried, or changed. Decide later whether it needs a story.",
      childId: null,
      sourceStoryId: null,
    });
  }

  return result.slice(0, 3);
}
