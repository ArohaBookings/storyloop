type InsightStory = {
  id: string;
  child_name: string | null;
  outcomes: string[] | null;
  next_steps: string[] | null;
  metadata: unknown;
  created_at: string;
};

function record(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function countValues(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildStoryInsights(stories: InsightStory[]) {
  const childGroups = new Map<string, InsightStory[]>();
  const dispositions: string[] = [];
  const curriculum: string[] = [];
  let reflectedStories = 0;
  let revisitedStories = 0;
  let openFollowUps = 0;

  stories.forEach((story) => {
    const name = story.child_name?.trim() || "Unassigned stories";
    childGroups.set(name, [...(childGroups.get(name) ?? []), story]);

    const metadata = record(story.metadata);
    dispositions.push(...strings(metadata.learningDispositions));
    curriculum.push(...(story.outcomes ?? []));

    if (typeof metadata.educatorReflection === "string" && metadata.educatorReflection.trim()) {
      reflectedStories += 1;
    }
    if (metadata.followUpStatus === "revisited") revisitedStories += 1;
    if (metadata.followUpStatus === "open") openFollowUps += 1;
  });

  const children = [...childGroups.entries()]
    .map(([name, childStories]) => {
      const childDispositions = countValues(
        childStories.flatMap((story) => strings(record(story.metadata).learningDispositions))
      );
      const latest = childStories
        .slice()
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
      return {
        name,
        storyCount: childStories.length,
        latestDate: latest?.created_at ?? "",
        dispositions: childDispositions.slice(0, 4),
        openNextSteps: childStories.reduce((sum, story) => sum + (story.next_steps?.length ?? 0), 0),
      };
    })
    .sort((a, b) => b.storyCount - a.storyCount || a.name.localeCompare(b.name));

  return {
    totalStories: stories.length,
    children,
    dispositions: countValues(dispositions).slice(0, 8),
    curriculum: countValues(curriculum).slice(0, 8),
    reflectedStories,
    revisitedStories,
    openFollowUps,
  };
}
