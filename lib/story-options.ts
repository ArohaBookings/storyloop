export type StoryTone = "warm" | "concise" | "reflective";
export type StoryFrameworkId = "AU" | "NZ";

export type StoryPreferences = {
  defaultFramework?: StoryFrameworkId;
  preferredTone?: StoryTone;
  languageStyle?: "plain_ece";
  emphasis?: string[];
  notes?: string;
};

export type StoryMetadata = {
  learningSummary?: string;
  learningDispositions?: string[];
  socialEmotionalLinks?: string[];
  culturalConnections?: string[];
  whanauConnection?: string;
};

export const STORY_FRAMEWORKS = {
  AU: {
    id: "AU",
    label: "Australia",
    pickerLabel: "EYLF",
    curriculumPrompt: [
      "Australia framework: Belonging, Being and Becoming: The Early Years Learning Framework for Australia (EYLF v2.0).",
      "Use the five EYLF outcomes only when supported by the observation:",
      "1. Children have a strong sense of identity.",
      "2. Children are connected with and contribute to their world.",
      "3. Children have a strong sense of wellbeing.",
      "4. Children are confident and involved learners.",
      "5. Children are effective communicators.",
      "Name the most relevant outcome clearly and keep any interpretation grounded in what the educator actually saw.",
    ].join("\n"),
    voicePrompt:
      "Write like an experienced early childhood educator in plain Australian English. Keep the tone warm, grounded, and easy to share with families or a room leader.",
    culturalPrompt:
      "If family, identity, home language, or community are relevant, note them respectfully without making assumptions about background or values.",
    transcriptionPrompt:
      "Transcribe an early childhood educator's voice note clearly. Preserve child names, everyday educator phrasing, and any curriculum terms.",
  },
  NZ: {
    id: "NZ",
    label: "Aotearoa New Zealand",
    pickerLabel: "Te Whariki",
    curriculumPrompt: [
      "Aotearoa New Zealand framework: Te Whariki.",
      "Use Te Whariki principles, strands, goals, and learning outcomes with a local-curriculum mindset.",
      "The five strands are Mana atua | Wellbeing, Mana whenua | Belonging, Mana tangata | Contribution, Mana reo | Communication, and Mana aoturoa | Exploration.",
      "When relevant, connect the observation to learning dispositions and working theories in ways that are visible in the moment.",
      "When social and emotional learning is evident, use a Kowhiti Whakapae-informed lens to name growing capabilities such as self-regulation, belonging, communication, or relationships.",
      "When it fits naturally, weave in a small amount of accurate te reo Maori such as tamariki, kaiako, whanau, ako, manaakitanga, or aroha.",
      "If Pacific identity, language, family, or values are relevant, add one respectful Tapasa-informed cultural connection without assuming heritage that was not observed.",
    ].join("\n"),
    voicePrompt:
      "Write like a thoughtful kaiako using plain, natural language. The writing should feel human, reflective, and practical rather than poetic or academic.",
    culturalPrompt:
      "Affirm identity, language, culture, and whanau relationships when there is evidence for them. Keep cultural references specific, respectful, and light-handed.",
    transcriptionPrompt:
      "Transcribe an early childhood educator's voice note clearly. Preserve te reo Maori macrons when obvious, child names, and common kaiako language such as whanau, tamariki, manaakitanga, and aroha.",
  },
} as const satisfies Record<
  StoryFrameworkId,
  {
    id: StoryFrameworkId;
    label: string;
    pickerLabel: string;
    curriculumPrompt: string;
    voicePrompt: string;
    culturalPrompt: string;
    transcriptionPrompt: string;
  }
>;

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sanitiseStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return dedupeStrings(
    value
      .map((entry) => cleanString(entry))
      .filter(Boolean)
      .slice(0, 8)
  );
}

export function normalizeTone(value?: string | null): StoryTone {
  return value === "concise" || value === "reflective" ? value : "warm";
}

export function normalizeFramework(value?: string | null): StoryFrameworkId {
  return value === "NZ" ? "NZ" : "AU";
}

export function sanitizeStoryPreferences(value: unknown): StoryPreferences {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawDefaultFramework = cleanString(source.defaultFramework);
  const rawPreferredTone = cleanString(source.preferredTone);
  const notes = cleanString(source.notes);

  return {
    defaultFramework: rawDefaultFramework ? normalizeFramework(rawDefaultFramework) : undefined,
    preferredTone: rawPreferredTone ? normalizeTone(rawPreferredTone) : undefined,
    languageStyle: "plain_ece",
    emphasis: sanitiseStringArray(source.emphasis),
    notes: notes || undefined,
  };
}

export function mergeStoryPreferences(
  ...preferences: Array<StoryPreferences | null | undefined>
): StoryPreferences {
  return preferences.reduce<StoryPreferences>(
    (merged, current) => {
      if (!current) return merged;
      return {
        defaultFramework: current.defaultFramework ?? merged.defaultFramework,
        preferredTone: current.preferredTone ?? merged.preferredTone,
        languageStyle: current.languageStyle ?? merged.languageStyle ?? "plain_ece",
        emphasis: dedupeStrings([...(merged.emphasis ?? []), ...(current.emphasis ?? [])]),
        notes: current.notes ?? merged.notes,
      };
    },
    { languageStyle: "plain_ece", emphasis: [] }
  );
}
