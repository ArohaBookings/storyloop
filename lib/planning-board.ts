type PlanningStory = {
  id?: string;
  child_id?: string | null;
  child_name?: string | null;
  story_text?: string | null;
  outcomes?: string[] | null;
  next_steps?: string[] | null;
  metadata?: unknown;
  created_at?: string | null;
};

type ChildProfile = {
  id: string;
  name: string;
  age_group?: string | null;
  interests?: string[] | null;
};

function record(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function daysSince(value?: string | null) {
  if (!value) return null;
  const ms = Date.now() - Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function buildPlanningBoard(stories: PlanningStory[], children: ChildProfile[] = []) {
  const openResponses = stories.flatMap((story) => {
    const metadata = record(story.metadata);
    const progress = strings(story.next_steps).map((text) => ({ text, status: "planned" }));
    const savedProgress = Array.isArray(metadata.nextStepProgress) ? metadata.nextStepProgress : progress;
    return savedProgress.flatMap((entry) => {
      const item = record(entry);
      const status = typeof item.status === "string" ? item.status : "planned";
      const text = typeof item.text === "string" ? item.text.trim() : "";
      if (!text || status === "tried") return [];
      return [{
        childName: story.child_name ?? "Unassigned",
        text,
        status,
        storyId: story.id ?? "",
      }];
    });
  }).slice(0, 12);

  const childLastStory = new Map<string, PlanningStory>();
  stories.forEach((story) => {
    const key = story.child_id ?? story.child_name ?? "";
    if (!key) return;
    const current = childLastStory.get(key);
    if (!current || Date.parse(story.created_at ?? "") > Date.parse(current.created_at ?? "")) {
      childLastStory.set(key, story);
    }
  });

  const radar = children.map((child) => {
    const latest = childLastStory.get(child.id) ?? childLastStory.get(child.name);
    const gapDays = daysSince(latest?.created_at);
    const needsAttention = gapDays === null || gapDays >= 14;
    return {
      childId: child.id,
      childName: child.name,
      ageGroup: child.age_group ?? "",
      lastStoryAt: latest?.created_at ?? null,
      gapDays,
      signal: needsAttention ? "Needs a fresh observation" : gapDays && gapDays >= 7 ? "Watch this week" : "Current",
      interests: child.interests ?? [],
    };
  }).sort((a, b) => (b.gapDays ?? 999) - (a.gapDays ?? 999));

  const familyReplyGaps = stories
    .filter((story) => {
      const metadata = record(story.metadata);
      return typeof metadata.familyQuestion === "string" && metadata.familyQuestion && !metadata.whanauVoice;
    })
    .slice(0, 8)
    .map((story) => ({
      storyId: story.id ?? "",
      childName: story.child_name ?? "Unassigned",
      question: String(record(story.metadata).familyQuestion ?? ""),
      createdAt: story.created_at ?? null,
    }));

  const unreviewedStories = stories
    .filter((story) => {
      const metadata = record(story.metadata);
      return !metadata.reviewedAt;
    })
    .slice(0, 8)
    .map((story) => ({
      storyId: story.id ?? "",
      childName: story.child_name ?? "Unassigned",
      createdAt: story.created_at ?? null,
    }));

  return {
    openResponses,
    documentationRadar: radar,
    familyReplyGaps,
    unreviewedStories,
  };
}
