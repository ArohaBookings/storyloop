import type { StoryFrameworkId } from "@/lib/story-options";

type CompassStory = {
  id: string;
  outcomes: string[] | null;
  metadata: unknown;
  location?: string | null;
};

type CompassDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  keywords: string[];
};

const AU_DEFINITIONS: CompassDefinition[] = [
  { id: "eylf-1", label: "Outcome 1 · Strong sense of identity", shortLabel: "Identity", keywords: ["outcome 1", "identity"] },
  { id: "eylf-2", label: "Outcome 2 · Connected with and contribute to their world", shortLabel: "Connection", keywords: ["outcome 2", "contribute to their world", "connected with"] },
  { id: "eylf-3", label: "Outcome 3 · Strong sense of wellbeing", shortLabel: "Wellbeing", keywords: ["outcome 3", "wellbeing"] },
  { id: "eylf-4", label: "Outcome 4 · Confident and involved learners", shortLabel: "Learning", keywords: ["outcome 4", "involved learner", "problem solving", "working theor"] },
  { id: "eylf-5", label: "Outcome 5 · Effective communicators", shortLabel: "Communication", keywords: ["outcome 5", "communicator", "communication"] },
];

const NZ_DEFINITIONS: CompassDefinition[] = [
  { id: "tw-wellbeing", label: "Mana atua · Wellbeing", shortLabel: "Wellbeing", keywords: ["mana atua", "wellbeing"] },
  { id: "tw-belonging", label: "Mana whenua · Belonging", shortLabel: "Belonging", keywords: ["mana whenua", "belonging"] },
  { id: "tw-contribution", label: "Mana tangata · Contribution", shortLabel: "Contribution", keywords: ["mana tangata", "contribution"] },
  { id: "tw-communication", label: "Mana reo · Communication", shortLabel: "Communication", keywords: ["mana reo", "communication"] },
  { id: "tw-exploration", label: "Mana aotūroa · Exploration", shortLabel: "Exploration", keywords: ["mana aotūroa", "mana aoturoa", "exploration", "working theor"] },
];

function record(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function buildCurriculumCompass(framework: StoryFrameworkId, stories: CompassStory[]) {
  const definitions = framework === "NZ" ? NZ_DEFINITIONS : AU_DEFINITIONS;
  const relevantStories = stories.filter((story) => !story.location || story.location === framework);

  return definitions.map((definition) => {
    const evidenceStoryIds = relevantStories.flatMap((story) => {
      const metadata = record(story.metadata);
      const searchable = [
        ...(story.outcomes ?? []),
        ...strings(metadata.curriculumLinks),
        typeof metadata.learningSummary === "string" ? metadata.learningSummary : "",
      ]
        .join(" ")
        .toLowerCase();
      const matched = definition.keywords.some((keyword) => searchable.includes(keyword));
      return matched ? [story.id] : [];
    });

    return {
      ...definition,
      count: evidenceStoryIds.length,
      evidenceStoryIds,
    };
  });
}
