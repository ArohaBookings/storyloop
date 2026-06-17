export type StoryTone = "natural" | "warm" | "professional" | "simple";
export type StoryDepth = "concise" | "balanced" | "detailed";
export type TeReoLevel = "low" | "medium" | "high";
export type StoryFrameworkId = "AU" | "NZ";
export type PedagogyFocus =
  | "balanced"
  | "intentional_teaching"
  | "child_voice"
  | "family_partnership"
  | "working_theories";

export type StoryPreferences = {
  defaultFramework?: StoryFrameworkId;
  preferredTone?: StoryTone;
  depthPreference?: StoryDepth;
  preferredStoryLength?: StoryDepth;
  centrePhilosophy?: string;
  likedPhrases?: string[];
  avoidedPhrases?: string[];
  includeTeReoLevel?: TeReoLevel;
  includeKowhitiWhakapae?: boolean;
  includeTapasa?: boolean;
  pedagogyFocus?: PedagogyFocus;
  languageStyle?: "plain_ece";
  emphasis?: string[];
  notes?: string;
};

export type StoryMetadata = {
  storyTitle?: string;
  learningSummary?: string;
  childVoice?: string;
  curriculumLinks?: string[];
  learningDispositions?: string[];
  socialEmotionalLinks?: string[];
  culturalConnections?: string[];
  whanauConnection?: string;
  assumptions?: string[];
  evidenceAnchors?: string[];
  educatorChecks?: string[];
  pedagogyLinks?: string[];
  frameworkEvidence?: string[];
  parentFriendlyVersion?: string;
  storyQuality?: {
    score?: number;
    passes?: boolean;
    revisionCount?: number;
    checks?: Record<string, boolean>;
    issues?: string[];
    strengths?: string[];
  };
  inputMethod?: "typed" | "paste" | "voice" | "sample" | "backlog";
  familyQuestion?: string;
  followUpPrompt?: string;
  educatorReflection?: string;
  followUpStatus?: "open" | "revisited";
  whanauVoice?: string;
  whanauCapturedAt?: string;
  nextStepProgress?: Array<{
    text: string;
    status: "planned" | "tried" | "continue";
    note?: string;
  }>;
  reviewChecklist?: {
    evidence: boolean;
    childVoice: boolean;
    curriculum: boolean;
    culture: boolean;
    privacy: boolean;
  };
  reviewedAt?: string | null;
  sourceStoryId?: string;
  continuityContextUsed?: boolean;
  storySettings?: {
    framework?: StoryFrameworkId;
    tone?: StoryTone;
    depth?: StoryDepth;
    includeTeReoLevel?: TeReoLevel;
    includeKowhitiWhakapae?: boolean;
    includeTapasa?: boolean;
    pedagogyFocus?: PedagogyFocus;
  };
};

export const STORY_FRAMEWORKS = {
  AU: {
    id: "AU",
    label: "Australia",
    pickerLabel: "EYLF",
    curriculumPrompt: [
      "Australia framework: Belonging, Being and Becoming: The Early Years Learning Framework for Australia (EYLF V2.0, 2022).",
      "Use the five EYLF learning outcomes only when supported by the observation. They are broad and observable, so link to the child's actual actions rather than dropping in a generic outcome.",
      "1. Children have a strong sense of identity.",
      "2. Children are connected with and contribute to their world.",
      "3. Children have a strong sense of wellbeing.",
      "4. Children are confident and involved learners.",
      "5. Children are effective communicators.",
      "For tinkering, testing, working theories, persistence, or problem solving, consider Outcome 4 before other outcomes.",
      "For explaining ideas, symbols, story, gesture, or conversation, consider Outcome 5 if the observation includes communication evidence.",
      "Name the most relevant outcome clearly and include a short why-it-links explanation.",
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
    pickerLabel: "Te Whāriki",
    curriculumPrompt: [
      "Aotearoa New Zealand framework: Te Whāriki.",
      "Use Te Whāriki principles, strands, goals, and learning outcomes with a local-curriculum mindset.",
      "The five strands are strands, not outcomes: Mana atua | Wellbeing, Mana whenua | Belonging, Mana tangata | Contribution, Mana reo | Communication, and Mana aotūroa | Exploration.",
      "Learning outcomes sit within each strand. They are broad valued learning across knowledge, skills, attitudes, and dispositions that children develop over time.",
      "When linking Te Whāriki, name the relevant strand and then the relevant learning outcome or outcome idea. Include a short why-it-links explanation.",
      "For testing ideas, tools, movement, physical problem solving, working theories, or curiosity, consider Mana aotūroa | Exploration, particularly strategies for active exploration, thinking, reasoning, and problem solving.",
      "For child voice, symbols, storytelling, explanations, or sharing thinking, consider Mana reo | Communication when the observation supports it.",
      "For contribution, collaboration, leadership, empathy, or taking responsibility with others, consider Mana tangata | Contribution when the observation supports it.",
      "When relevant, connect the observation to learning dispositions and working theories in ways that are visible in the moment.",
    ].join("\n"),
    voicePrompt:
      "Write like a thoughtful kaiako using plain, natural language. The writing should feel human, reflective, and practical rather than poetic or academic.",
    culturalPrompt:
      "Affirm identity, language, culture, and whānau relationships when there is evidence for them. Keep cultural references specific, respectful, and light-handed.",
    transcriptionPrompt:
      "Transcribe an early childhood educator's voice note clearly. Preserve te reo Māori macrons when obvious, child names, and common kaiako language such as whānau, tamariki, manaakitanga, and aroha.",
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
  if (value === "natural" || value === "warm" || value === "professional" || value === "simple") {
    return value;
  }
  if (value === "reflective") return "warm";
  if (value === "concise") return "natural";
  return "natural";
}

export function normalizeDepth(value?: string | null): StoryDepth {
  return value === "concise" || value === "detailed" ? value : "balanced";
}

export function normalizeTeReoLevel(value?: string | null): TeReoLevel {
  return value === "medium" || value === "high" ? value : "low";
}

export function normalizeFramework(value?: string | null): StoryFrameworkId {
  return value === "NZ" ? "NZ" : "AU";
}

export function normalizePedagogyFocus(value?: string | null): PedagogyFocus {
  if (
    value === "intentional_teaching" ||
    value === "child_voice" ||
    value === "family_partnership" ||
    value === "working_theories"
  ) {
    return value;
  }
  return "balanced";
}

function sanitizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export function sanitizeStoryPreferences(value: unknown): StoryPreferences {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawDefaultFramework = cleanString(source.defaultFramework);
  const rawPreferredTone = cleanString(source.preferredTone);
  const rawDepthPreference = cleanString(source.depthPreference);
  const rawPreferredStoryLength = cleanString(source.preferredStoryLength);
  const rawTeReoLevel = cleanString(source.includeTeReoLevel);
  const rawPedagogyFocus = cleanString(source.pedagogyFocus);
  const notes = cleanString(source.notes);
  const centrePhilosophy = cleanString(source.centrePhilosophy).slice(0, 1200);

  return {
    defaultFramework: rawDefaultFramework ? normalizeFramework(rawDefaultFramework) : undefined,
    preferredTone: rawPreferredTone ? normalizeTone(rawPreferredTone) : undefined,
    depthPreference: rawDepthPreference ? normalizeDepth(rawDepthPreference) : undefined,
    preferredStoryLength: rawPreferredStoryLength ? normalizeDepth(rawPreferredStoryLength) : undefined,
    centrePhilosophy: centrePhilosophy || undefined,
    likedPhrases: sanitiseStringArray(source.likedPhrases).slice(0, 10),
    avoidedPhrases: sanitiseStringArray(source.avoidedPhrases).slice(0, 10),
    includeTeReoLevel: rawTeReoLevel ? normalizeTeReoLevel(rawTeReoLevel) : undefined,
    includeKowhitiWhakapae: sanitizeBoolean(source.includeKowhitiWhakapae),
    includeTapasa: sanitizeBoolean(source.includeTapasa),
    pedagogyFocus: normalizePedagogyFocus(rawPedagogyFocus),
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
        depthPreference: current.depthPreference ?? merged.depthPreference,
        preferredStoryLength: current.preferredStoryLength ?? merged.preferredStoryLength,
        centrePhilosophy: current.centrePhilosophy ?? merged.centrePhilosophy,
        likedPhrases: dedupeStrings([...(merged.likedPhrases ?? []), ...(current.likedPhrases ?? [])]).slice(0, 10),
        avoidedPhrases: dedupeStrings([...(merged.avoidedPhrases ?? []), ...(current.avoidedPhrases ?? [])]).slice(0, 10),
        includeTeReoLevel: current.includeTeReoLevel ?? merged.includeTeReoLevel,
        includeKowhitiWhakapae: current.includeKowhitiWhakapae ?? merged.includeKowhitiWhakapae,
        includeTapasa: current.includeTapasa ?? merged.includeTapasa,
        pedagogyFocus: current.pedagogyFocus ?? merged.pedagogyFocus,
        languageStyle: current.languageStyle ?? merged.languageStyle ?? "plain_ece",
        emphasis: dedupeStrings([...(merged.emphasis ?? []), ...(current.emphasis ?? [])]),
        notes: current.notes ?? merged.notes,
      };
    },
    {
      languageStyle: "plain_ece",
      emphasis: [],
      depthPreference: "balanced",
      preferredStoryLength: "balanced",
      likedPhrases: [],
      avoidedPhrases: [],
      includeTeReoLevel: "low",
      includeKowhitiWhakapae: false,
      includeTapasa: false,
      pedagogyFocus: "balanced",
    }
  );
}
