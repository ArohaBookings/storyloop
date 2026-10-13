import type { AnyFrameworkId } from "@/lib/international-frameworks";

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

// England (EYFS areas of learning) and Ireland (Aistear Themes), 13 Oct 2026.
const UK_DEFINITIONS: CompassDefinition[] = [
  { id: "eyfs-cl", label: "Communication and Language", shortLabel: "Communication", keywords: ["communication and language"] },
  { id: "eyfs-pd", label: "Physical Development", shortLabel: "Physical", keywords: ["physical development"] },
  { id: "eyfs-psed", label: "Personal, Social and Emotional Development", shortLabel: "PSED", keywords: ["personal, social and emotional", "personal social and emotional"] },
  { id: "eyfs-literacy", label: "Literacy", shortLabel: "Literacy", keywords: ["literacy"] },
  { id: "eyfs-maths", label: "Mathematics", shortLabel: "Mathematics", keywords: ["mathematics"] },
  { id: "eyfs-utw", label: "Understanding the World", shortLabel: "World", keywords: ["understanding the world"] },
  { id: "eyfs-ead", label: "Expressive Arts and Design", shortLabel: "Arts", keywords: ["expressive arts and design"] },
];

const IE_DEFINITIONS: CompassDefinition[] = [
  { id: "aistear-wellbeing", label: "Wellbeing", shortLabel: "Wellbeing", keywords: ["wellbeing", "well-being"] },
  { id: "aistear-identity", label: "Identity and Belonging", shortLabel: "Identity", keywords: ["identity and belonging"] },
  { id: "aistear-communicating", label: "Communicating", shortLabel: "Communicating", keywords: ["communicating"] },
  { id: "aistear-exploring", label: "Exploring and Thinking", shortLabel: "Exploring", keywords: ["exploring and thinking"] },
];

function record(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function buildCurriculumCompass(framework: AnyFrameworkId, stories: CompassStory[]) {
  const definitions = framework === "UK" ? UK_DEFINITIONS : framework === "IE" ? IE_DEFINITIONS : framework === "NZ" ? NZ_DEFINITIONS : AU_DEFINITIONS;
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
