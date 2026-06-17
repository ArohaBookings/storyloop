import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { LEARNING_STORY_PROMPT, buildUserMessage } from "./prompts";
import {
  mergeStoryPreferences,
  normalizeDepth,
  normalizeFramework,
  normalizeTeReoLevel,
  normalizeTone,
  type StoryDepth,
  type StoryFrameworkId,
  type PedagogyFocus,
  type StoryMetadata,
  type StoryPreferences,
  type StoryTone,
  type TeReoLevel,
} from "@/lib/story-options";

export interface StoryResult extends StoryMetadata {
  storyTitle: string;
  story: string;
  outcomes: string[];
  curriculumLinks: string[];
  learningSummary: string;
  childVoice: string;
  childAge: string;
  nextSteps: string[];
  assumptions: string[];
  evidenceAnchors: string[];
  educatorChecks: string[];
  pedagogyLinks: string[];
  frameworkEvidence: string[];
  parentFriendlyVersion?: string;
  storyQuality?: {
    score?: number;
    passes?: boolean;
    revisionCount?: number;
    checks?: Record<string, boolean>;
    issues?: string[];
    strengths?: string[];
  };
  familyQuestion: string;
  followUpPrompt: string;
  wordCount: number;
}

type QualityReviewResponse = {
  passes?: boolean;
  score?: number;
  checks?: Record<string, boolean>;
  issues?: string[];
  strengths?: string[];
  revision?: Partial<StoryResult>;
};

export type BacklogRescueItem = {
  id: string;
  observation: string;
  recommendation: "full_story" | "short_update" | "combine" | "skip";
  priority: "high" | "medium" | "low";
  reason: string;
  suggestedTitle: string;
  storySeed: string;
  frameworkHint: string;
};

type BacklogRescueResponse = {
  summary: string;
  items: BacklogRescueItem[];
  nextBestAction: string;
};

async function callAI(systemPrompt: string, userContent: string): Promise<string> {
  // OpenAI primary
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.chat.completions.create({
        model: "gpt-4o-mini", // Cheap, fast, high quality for this task
        max_tokens: 2000,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
      return res.choices[0]?.message?.content ?? "";
    } catch (e) {
      console.error("OpenAI failed, falling back:", e);
    }
  }

  // Anthropic fallback
  if (process.env.ANTHROPIC_API_KEY) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt + "\n\nCRITICAL: Return ONLY valid JSON. No markdown, no code fences, no preamble.",
      messages: [{ role: "user", content: userContent }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    return text.replace(/```json\n?|```/g, "").trim();
  }

  throw new Error("No AI API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.");
}

function parseJSON<T>(text: string): T {
  const clean = text.replace(/```json\n?|```/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]) as T;
  return JSON.parse(clean) as T;
}

function toShortStringArray(value: unknown, limit = 6) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
        .slice(0, limit)
    )
  );
}

function formatStoryText(value: unknown) {
  const story = typeof value === "string" ? value.trim() : "";
  if (!story || story.includes("\n\n")) return story;

  const sentences = story.match(/[^.!?]+[.!?]+(?:["']|$)/g)?.map((sentence) => sentence.trim()) ?? [];
  if (sentences.length < 3) return story;

  const splitAt = Math.ceil(sentences.length / 2);
  return `${sentences.slice(0, splitAt).join(" ")}\n\n${sentences.slice(splitAt).join(" ")}`;
}

function formatTitle(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, 90) : "";
}

function ensureStoryTitle(story: string, title: string) {
  if (!title || !story) return story;
  const normalisedStoryStart = story.slice(0, title.length).toLowerCase();
  if (normalisedStoryStart === title.toLowerCase()) return story;
  return `${title}\n\n${story}`;
}

function preserveInitialCase(source: string, replacement: string) {
  return source[0] === source[0]?.toUpperCase()
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

function localiseSpelling(text: string) {
  return text
    .replace(/\bcolors\b/gi, (match) => preserveInitialCase(match, "colours"))
    .replace(/\bcolored\b/gi, (match) => preserveInitialCase(match, "coloured"))
    .replace(/\bcoloring\b/gi, (match) => preserveInitialCase(match, "colouring"))
    .replace(/\bcolor\b/gi, (match) => preserveInitialCase(match, "colour"))
    .replace(/\bbehavior\b/gi, (match) => preserveInitialCase(match, "behaviour"))
    .replace(/\bfavorite\b/gi, (match) => preserveInitialCase(match, "favourite"))
    .replace(/\bcenter\b/gi, (match) => preserveInitialCase(match, "centre"))
    .replace(/\bcategorize\b/gi, (match) => preserveInitialCase(match, "categorise"))
    .replace(/\bcategorizes\b/gi, (match) => preserveInitialCase(match, "categorises"))
    .replace(/\bcategorized\b/gi, (match) => preserveInitialCase(match, "categorised"))
    .replace(/\bcategorizing\b/gi, (match) => preserveInitialCase(match, "categorising"))
    .replace(/\bcategorization\b/gi, (match) => preserveInitialCase(match, "categorisation"))
    .replace(/\borganize\b/gi, (match) => preserveInitialCase(match, "organise"))
    .replace(/\borganizes\b/gi, (match) => preserveInitialCase(match, "organises"))
    .replace(/\borganized\b/gi, (match) => preserveInitialCase(match, "organised"))
    .replace(/\borganizing\b/gi, (match) => preserveInitialCase(match, "organising"))
    .replace(/\borganization\b/gi, (match) => preserveInitialCase(match, "organisation"))
    .replace(/\brecognize\b/gi, (match) => preserveInitialCase(match, "recognise"))
    .replace(/\brecognizes\b/gi, (match) => preserveInitialCase(match, "recognises"))
    .replace(/\brecognized\b/gi, (match) => preserveInitialCase(match, "recognised"))
    .replace(/\brecognizing\b/gi, (match) => preserveInitialCase(match, "recognising"));
}

function localiseStringArray(values: string[]) {
  return values.map(localiseSpelling);
}

function normaliseStoryResult(result: Partial<StoryResult>): StoryResult {
  const storyTitle = localiseSpelling(formatTitle(result.storyTitle));
  const story = localiseSpelling(ensureStoryTitle(formatStoryText(result.story), storyTitle));
  const learningSummary =
    typeof result.learningSummary === "string" && result.learningSummary.trim()
      ? localiseSpelling(result.learningSummary.trim())
      : "Learning is visible through the child's actions, choices, and responses in this moment.";
  const whanauConnection =
    typeof result.whanauConnection === "string" && result.whanauConnection.trim()
      ? localiseSpelling(result.whanauConnection.trim())
      : "This is a moment families can build on by talking about the same ideas and interests together.";
  const childVoice =
    typeof result.childVoice === "string" && result.childVoice.trim()
      ? localiseSpelling(result.childVoice.trim())
      : "";

  return {
    storyTitle,
    story,
    outcomes: localiseStringArray(toShortStringArray(result.outcomes, 4)),
    curriculumLinks: localiseStringArray(toShortStringArray(result.curriculumLinks, 4)),
    learningSummary,
    childVoice,
    learningDispositions: localiseStringArray(toShortStringArray(result.learningDispositions, 4)),
    socialEmotionalLinks: localiseStringArray(toShortStringArray(result.socialEmotionalLinks, 4)),
    culturalConnections: localiseStringArray(toShortStringArray(result.culturalConnections, 4)),
    whanauConnection,
    assumptions: localiseStringArray(toShortStringArray(result.assumptions, 3)),
    evidenceAnchors: localiseStringArray(toShortStringArray(result.evidenceAnchors, 4)),
    educatorChecks: localiseStringArray(toShortStringArray(result.educatorChecks, 3)),
    pedagogyLinks: localiseStringArray(toShortStringArray(result.pedagogyLinks, 3)),
    frameworkEvidence: localiseStringArray(toShortStringArray(result.frameworkEvidence, 4)),
    parentFriendlyVersion:
      typeof result.parentFriendlyVersion === "string" ? localiseSpelling(result.parentFriendlyVersion.trim()) : undefined,
    storyQuality: result.storyQuality,
    familyQuestion:
      typeof result.familyQuestion === "string" ? localiseSpelling(result.familyQuestion.trim()) : "",
    followUpPrompt:
      typeof result.followUpPrompt === "string" ? localiseSpelling(result.followUpPrompt.trim()) : "",
    childAge: typeof result.childAge === "string" && result.childAge.trim() ? result.childAge.trim() : "Not stated",
    nextSteps: localiseStringArray(toShortStringArray(result.nextSteps, 4)),
    wordCount:
      typeof result.wordCount === "number" && Number.isFinite(result.wordCount)
        ? result.wordCount
        : story.split(/\s+/).filter(Boolean).length,
  };
}

function normaliseQualityReview(value: QualityReviewResponse, revisionCount: number) {
  const checks = value.checks && typeof value.checks === "object" ? value.checks : {};
  const score = typeof value.score === "number" && Number.isFinite(value.score) ? Math.max(0, Math.min(100, value.score)) : undefined;
  return {
    passes: Boolean(value.passes),
    score,
    revisionCount,
    checks,
    issues: localiseStringArray(toShortStringArray(value.issues, 8)),
    strengths: localiseStringArray(toShortStringArray(value.strengths, 6)),
  };
}

const STORY_QUALITY_PROMPT = `You are StoryLoop's educator review helper.

Review the draft before an educator sees it. This is not compliance and not a final sign-off.

Check:
- natural educator tone
- child voice where supported
- learning dispositions
- working theories if relevant
- Te Whāriki/EYLF link accuracy
- responding/next steps
- not too generic
- not too poetic
- not too AI-sounding
- no invented details
- clear link between observation and learning

Return only valid JSON:
{
  "passes": true,
  "score": 88,
  "checks": {
    "naturalEducatorTone": true,
    "childVoiceSupported": true,
    "learningDispositionsVisible": true,
    "workingTheoriesWhenRelevant": true,
    "frameworkLinksFit": true,
    "respondingNextStepsPractical": true,
    "notGeneric": true,
    "notPoetic": true,
    "notAISounding": true,
    "noInventedDetails": true,
    "evidenceToLearningClear": true
  },
  "issues": [],
  "strengths": ["Evidence stays close to the observation"],
  "revision": null
}

If score is below 88 or any important check fails, include "revision" as a complete improved StoryLoop JSON object using the same shape as the original story result. Preserve all true evidence. Remove invented, generic, poetic, or unsupported claims.`;

async function runStoryQualityCoach(
  initial: StoryResult,
  params: {
    observations: string;
    framework: StoryFrameworkId;
    tone: StoryTone;
    depth: StoryDepth;
    childContext?: string;
  }
) {
  let current = initial;
  let latestReview: ReturnType<typeof normaliseQualityReview> | undefined;
  let revisionCount = 0;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const reviewText = await callAI(
      STORY_QUALITY_PROMPT,
      JSON.stringify({
        observations: params.observations,
        framework: params.framework,
        tone: params.tone,
        depth: params.depth,
        childContext: params.childContext || "",
        currentDraft: current,
      })
    );
    const parsed = parseJSON<QualityReviewResponse>(reviewText);
    latestReview = normaliseQualityReview(parsed, revisionCount);

    if (latestReview.passes && (latestReview.score ?? 0) >= 88) break;
    if (!parsed.revision || typeof parsed.revision !== "object") break;

    current = normaliseStoryResult({ ...current, ...parsed.revision });
    revisionCount += 1;
  }

  return {
    ...current,
    storyQuality: latestReview ? { ...latestReview, revisionCount } : current.storyQuality,
  };
}

export async function generateLearningStory(params: {
  observations: string;
  ageGroup?: string;
  childName?: string;
  tone?: StoryTone;
  depth?: StoryDepth;
  framework?: StoryFrameworkId;
  includeTeReoLevel?: TeReoLevel;
  includeKowhitiWhakapae?: boolean;
  includeTapasa?: boolean;
  pedagogyFocus?: PedagogyFocus;
  childContext?: string;
  preferences?: StoryPreferences;
}): Promise<StoryResult> {
  const observations = params.observations
    .slice(0, 3000)
    .replace(/ignore (all )?previous/gi, "")
    .replace(/system:/gi, "");

  const tone = normalizeTone(params.tone);
  const framework = normalizeFramework(params.framework);
  const preferences = mergeStoryPreferences(params.preferences, {
    preferredTone: tone,
    depthPreference: normalizeDepth(params.depth ?? params.preferences?.depthPreference),
    includeTeReoLevel: normalizeTeReoLevel(params.includeTeReoLevel ?? params.preferences?.includeTeReoLevel),
    includeKowhitiWhakapae: params.includeKowhitiWhakapae ?? params.preferences?.includeKowhitiWhakapae,
    includeTapasa: params.includeTapasa ?? params.preferences?.includeTapasa,
    pedagogyFocus: params.pedagogyFocus ?? params.preferences?.pedagogyFocus,
  });

  const userContent = buildUserMessage(
    observations,
    params.ageGroup,
    params.childName,
    tone,
    framework,
    preferences,
    params.childContext
  );
  const result = await callAI(LEARNING_STORY_PROMPT, userContent);
  const firstDraft = normaliseStoryResult(parseJSON<StoryResult>(result));

  try {
    return await runStoryQualityCoach(firstDraft, {
      observations,
      framework,
      tone,
      depth: preferences.depthPreference ?? "balanced",
      childContext: params.childContext,
    });
  } catch (qualityError) {
    console.error("Story quality check failed:", qualityError);
    return {
      ...firstDraft,
      storyQuality: {
        passes: false,
        revisionCount: 0,
        issues: ["The story was generated, but the quality review helper could not complete."],
      },
    };
  }
}

export async function generateParentFriendlyVersion(params: {
  story: string;
  childName?: string | null;
  framework?: StoryFrameworkId;
  learningSummary?: string;
}) {
  const prompt = `Create a parent-friendly version of an early childhood learning story.

Rules:
- Keep it warm, shorter, and easy for families to read.
- Do not remove the child's agency.
- Do not add new details.
- Keep curriculum language light.
- 90-150 words.

Return only valid JSON:
{ "parentVersion": "text only" }`;

  const response = await callAI(
    prompt,
    JSON.stringify({
      childName: params.childName ?? "the child",
      framework: params.framework ?? "AU",
      learningSummary: params.learningSummary ?? "",
      story: params.story,
    })
  );
  const parsed = parseJSON<{ parentVersion?: string }>(response);
  return localiseSpelling((parsed.parentVersion ?? "").trim());
}

export async function analyzeBacklogRescue(params: {
  observations: string;
  framework: StoryFrameworkId;
  preferences?: StoryPreferences;
}) {
  const prompt = `You are StoryLoop's Backlog Rescue helper for early childhood educators.

The educator may paste several rough observations from a week.

Your job:
- identify which observations are worth a full learning story
- suggest which can be short updates instead
- combine repeated fragments when helpful
- help prioritise the documentation backlog
- do not write full stories yet
- keep it practical, calm, and non-judgemental

Return only valid JSON:
{
  "summary": "short practical summary",
  "items": [
    {
      "id": "item-1",
      "observation": "short cleaned observation",
      "recommendation": "full_story",
      "priority": "high",
      "reason": "why this is worth documenting this way",
      "suggestedTitle": "short title",
      "storySeed": "copy-ready observation seed for generating a story",
      "frameworkHint": "simple EYLF or Te Whāriki hint"
    }
  ],
  "nextBestAction": "one clear next step"
}`;

  const response = await callAI(
    prompt,
    JSON.stringify({
      framework: params.framework,
      preferences: params.preferences ?? {},
      observations: params.observations.slice(0, 6000),
    })
  );
  const parsed = parseJSON<BacklogRescueResponse>(response);
  return {
    summary: localiseSpelling(typeof parsed.summary === "string" ? parsed.summary.trim() : ""),
    nextBestAction: localiseSpelling(
      typeof parsed.nextBestAction === "string" ? parsed.nextBestAction.trim() : ""
    ),
    items: Array.isArray(parsed.items)
      ? parsed.items.slice(0, 8).map((item, index) => ({
          id: typeof item.id === "string" ? item.id : `item-${index + 1}`,
          observation: localiseSpelling(typeof item.observation === "string" ? item.observation.trim() : ""),
          recommendation:
            item.recommendation === "short_update" ||
            item.recommendation === "combine" ||
            item.recommendation === "skip"
              ? item.recommendation
              : "full_story",
          priority: item.priority === "low" || item.priority === "medium" ? item.priority : "high",
          reason: localiseSpelling(typeof item.reason === "string" ? item.reason.trim() : ""),
          suggestedTitle: localiseSpelling(
            typeof item.suggestedTitle === "string" ? item.suggestedTitle.trim() : ""
          ),
          storySeed: localiseSpelling(typeof item.storySeed === "string" ? item.storySeed.trim() : ""),
          frameworkHint: localiseSpelling(
            typeof item.frameworkHint === "string" ? item.frameworkHint.trim() : ""
          ),
        }))
      : [],
  };
}
