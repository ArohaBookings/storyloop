import type { StoryFrameworkId } from "@/lib/story-options";

export type ExportPlatform = "storypark" | "educa" | "kinderloop" | "brightwheel";

export type ExportPackInput = {
  childName?: string | null;
  ageGroup?: string | null;
  story: string;
  storyTitle?: string;
  observations?: string | null;
  learningSummary?: string;
  curriculumLinks?: string[];
  outcomes?: string[];
  nextSteps?: string[];
  familyQuestion?: string;
  framework?: StoryFrameworkId | string | null;
};

export type ExportPack = {
  platform: ExportPlatform;
  label: string;
  description: string;
  sections: Array<{ label: string; value: string }>;
  text: string;
};

const PLATFORM_COPY: Record<ExportPlatform, { label: string; description: string }> = {
  storypark: {
    label: "Storypark",
    description: "Story first, then learning analysis, next steps, and family question.",
  },
  educa: {
    label: "Educa",
    description: "Learning story, curriculum links, teacher response, and family engagement.",
  },
  kinderloop: {
    label: "Kinderloop",
    description: "Short update-friendly copy with a clear observation and home prompt.",
  },
  brightwheel: {
    label: "Brightwheel",
    description: "Parent-readable activity update plus developmental learning note.",
  },
};

function list(values?: string[]) {
  return values?.filter(Boolean).map((item) => `- ${item}`).join("\n") ?? "";
}

function joinSections(sections: Array<{ label: string; value: string }>) {
  return sections
    .filter((section) => section.value.trim())
    .map((section) => `${section.label}\n${section.value.trim()}`)
    .join("\n\n");
}

export function buildExportPacks(input: ExportPackInput): ExportPack[] {
  const child = input.childName?.trim() || "Child";
  const title = input.storyTitle?.trim() || `${child}'s learning story`;
  const frameworkLabel = input.framework === "NZ" ? "Te Whāriki" : "EYLF";
  const familyLabel = input.framework === "NZ" ? "Question for family/whānau" : "Question for family";
  const nextSteps = list(input.nextSteps);
  const curriculum = list(input.curriculumLinks?.length ? input.curriculumLinks : input.outcomes);

  const packs: Array<{ platform: ExportPlatform; sections: Array<{ label: string; value: string }> }> = [
    {
      platform: "storypark",
      sections: [
        { label: "Title", value: title },
        { label: "Learning story", value: input.story },
        { label: "What learning was visible", value: input.learningSummary ?? "" },
        { label: `${frameworkLabel} links`, value: curriculum },
        { label: "Possible next steps", value: nextSteps },
        { label: familyLabel, value: input.familyQuestion ?? "" },
      ],
    },
    {
      platform: "educa",
      sections: [
        { label: "Observation", value: input.observations ?? "" },
        { label: "Story", value: input.story },
        { label: "Analysis of learning", value: input.learningSummary ?? "" },
        { label: "Curriculum links", value: curriculum },
        { label: "Teacher response / next steps", value: nextSteps },
      ],
    },
    {
      platform: "kinderloop",
      sections: [
        { label: "Update", value: input.story },
        { label: "Learning noticed", value: input.learningSummary ?? "" },
        { label: "Home question", value: input.familyQuestion ?? "" },
      ],
    },
    {
      platform: "brightwheel",
      sections: [
        { label: "Activity update", value: input.story },
        { label: "Development and learning", value: input.learningSummary ?? "" },
        { label: "Next step", value: nextSteps },
        { label: "Family connection", value: input.familyQuestion ?? "" },
      ],
    },
  ];

  return packs.map(({ platform, sections }) => ({
    platform,
    ...PLATFORM_COPY[platform],
    sections,
    text: joinSections(sections),
  }));
}
