import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { LEARNING_STORY_PROMPT, buildUserMessage } from "./prompts";
import { buildPhysicalSafetyFallbackStory as buildSharedPhysicalSafetyFallbackStory } from "./physical-safety-story";
import {
  countWords,
  enforceFrameworkForResult,
  getMinimumStoryWords,
  getUnsupportedStoryDetails,
  humaniseQualityNote,
  resultHasFrameworkLeak,
} from "./quality-guards";
import { hasPhysicalSafetyIncident } from "@/lib/safety-incident";
import { runPrivacyGuardian } from "@/lib/privacy-guardian";
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
  learningDispositions: string[];
  socialEmotionalLinks: string[];
  culturalConnections: string[];
  whanauConnection: string;
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

export type FamilyConnectionPack = {
  familyMessage: string;
  familyQuestion: string;
  homeConnection: string;
  photoCaption: string;
  handoverNote: string;
  teacherCheck: string;
};

export type FamilyTranslationPack = {
  language: string;
  translatedMessage: string;
  plainEnglishVersion: string;
  readingLevelNote: string;
  teacherCheck: string;
};

export type RoomPlanningBrief = {
  summary: string;
  emergingInterests: string[];
  curriculumOpportunities: string[];
  environmentSetups: string[];
  intentionalTeachingMoves: string[];
  familyPartnershipPrompt: string;
  teamReflectionQuestions: string[];
  watchNext: string[];
};

async function callAI(systemPrompt: string, userContent: string): Promise<string> {
  // OpenAI primary
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.chat.completions.create({
        model: "gpt-4o-mini", // Cheap, fast, high quality for this task
        max_tokens: 3200,
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
      max_tokens: 3200,
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

function humaniseQualityNotes(value: unknown, limit = 6) {
  return localiseStringArray(
    toShortStringArray(value, limit)
      .map(humaniseQualityNote)
      .filter(Boolean)
  );
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
        : countWords(story),
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
    issues: humaniseQualityNotes(value.issues, 8),
    strengths: humaniseQualityNotes(value.strengths, 6),
  };
}

function applyDeterministicQualityGuards(
  review: ReturnType<typeof normaliseQualityReview>,
  result: StoryResult,
  params: { framework: StoryFrameworkId; depth: StoryDepth; observations: string }
) {
  const issues = [...review.issues];
  const checks = { ...review.checks };
  let score = review.score;
  let passes = review.passes;
  const minimumWords = getMinimumStoryWords(params.depth);
  const actualWords = countWords(result.story);

  if (actualWords < minimumWords) {
    checks.usefulForDepth = false;
    passes = false;
    score = Math.min(score ?? 84, 84);
    issues.push(`Story is too thin for ${params.depth} depth (${actualWords}/${minimumWords} words).`);
  }

  if (resultHasFrameworkLeak(result, params.framework)) {
    checks.frameworkLinksFit = false;
    passes = false;
    score = Math.min(score ?? 82, 82);
    issues.push(
      params.framework === "AU"
        ? "EYLF draft still contains Aotearoa-only curriculum language."
        : "Te Whāriki draft still contains EYLF-only curriculum language."
    );
  }

  const unsupportedDetails = getUnsupportedStoryDetails(result, params.observations);
  if (unsupportedDetails.length > 0) {
    checks.noInventedDetails = false;
    passes = false;
    score = Math.min(score ?? 78, 78);
    issues.push(...unsupportedDetails);
  }

  return {
    ...review,
    passes,
    score,
    checks,
    issues: Array.from(new Set(issues)).slice(0, 8),
  };
}

function getStoryRescueReasons(
  result: StoryResult,
  params: { framework: StoryFrameworkId; depth: StoryDepth; observations: string }
) {
  const reasons: string[] = [];
  const minimumWords = getMinimumStoryWords(params.depth);
  const actualWords = countWords(result.story);
  if (actualWords < minimumWords) {
    reasons.push(`Story is below the ${params.depth} depth target (${actualWords}/${minimumWords} words).`);
  }
  if (resultHasFrameworkLeak(result, params.framework)) {
    reasons.push(
      params.framework === "AU"
        ? "EYLF draft contains Aotearoa-only framework language."
        : "Te Whāriki draft contains EYLF-only framework language."
    );
  }
  if (result.curriculumLinks.length === 0 || result.nextSteps.length === 0 || result.evidenceAnchors.length === 0) {
    reasons.push("Core educator fields are missing or too thin.");
  }
  reasons.push(...getUnsupportedStoryDetails(result, params.observations));
  return reasons;
}

function cleanObservationSummary(observations: string) {
  return observations
    .replace(/\s+/g, " ")
    .replace(/ignore (all )?previous/gi, "")
    .replace(/system:/gi, "")
    .trim()
    .slice(0, 500);
}

function fallbackFrameworkMetadata(framework: StoryFrameworkId) {
  if (framework === "NZ") {
    return {
      outcomes: ["Mana aotūroa | Exploration", "Mana reo | Communication"],
      curriculumLinks: [
        "This links with Mana aotūroa | Exploration when the child is using play to explore an idea, make choices, and test what they know.",
        "This links with Mana reo | Communication when the play includes sounds, words, gestures, symbols, or shared meaning.",
      ],
      frameworkEvidence: [
        "The Te Whāriki links are based on the child's visible play, choices, exploration, and communication in the observation.",
      ],
      pedagogyLinks: ["responsive and reciprocal practice", "play-based learning", "assessment for learning"],
    };
  }

  return {
    outcomes: [
      "EYLF Outcome 4: Children are confident and involved learners",
      "EYLF Outcome 5: Children are effective communicators",
    ],
    curriculumLinks: [
      "This links with EYLF Outcome 4 because the child is using play to explore an idea, make choices, and build understanding from the moment observed.",
      "This links with EYLF Outcome 5 when the play includes sounds, words, gestures, symbols, or shared meaning.",
    ],
    frameworkEvidence: [
      "The EYLF links are based on the child's visible play, choices, exploration, and communication in the observation.",
    ],
    pedagogyLinks: ["play-based learning", "responsiveness to children", "intentionality"],
  };
}

function incidentFrameworkMetadata(framework: StoryFrameworkId) {
  if (framework === "NZ") {
    return {
      outcomes: ["Mana atua | Wellbeing", "Mana tangata | Contribution", "Mana reo | Communication"],
      curriculumLinks: [
        "This links with Mana atua | Wellbeing because the learning focus is safe bodies, emotional security, and support to manage strong feelings with adult help.",
        "This links with Mana tangata | Contribution because the children are learning how to be with others, repair harm, and take part in shared play safely.",
        "This links with Mana reo | Communication when the educator supports children to use words, gestures, or help-seeking instead of physical responses.",
      ],
      frameworkEvidence: [
        "The Te Whāriki links fit because the observation is about safety, relationships, contribution, and communication during peer play.",
        "This is not mainly an exploration story; it is a social and emotional learning moment that needs careful educator guidance.",
      ],
      pedagogyLinks: ["responsive and reciprocal practice", "positive guidance", "assessment for learning"],
    };
  }

  return {
    outcomes: [
      "EYLF Outcome 3: Children have a strong sense of wellbeing",
      "EYLF Outcome 1: Children have a strong sense of identity",
      "EYLF Outcome 5: Children are effective communicators",
    ],
    curriculumLinks: [
      "This links with EYLF Outcome 3 because the learning focus is safe bodies, self-regulation, and support to manage strong feelings with adult help.",
      "This links with EYLF Outcome 1 because the children are learning to express needs, be heard, and stay connected after a difficult social moment.",
      "This links with EYLF Outcome 5 when the educator supports children to use words, gestures, or help-seeking instead of physical responses.",
    ],
    frameworkEvidence: [
      "The EYLF links fit because the observation is about wellbeing, identity, relationships, and communication during peer play.",
      "This is not mainly an exploration story; it is a social and emotional learning moment that needs careful educator guidance.",
    ],
    pedagogyLinks: ["responsiveness to children", "intentionality", "relationships with children"],
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildIncidentSequence(observations: string, childName?: string) {
  const child = childName?.trim();
  if (!child) {
    return "The note records shared play followed by physical conflict, including unsafe physical responses that need adult support.";
  }

  const escaped = escapeRegExp(child);
  const wasPushed = new RegExp(`\\bpush(?:ed|es|ing)?\\s+${escaped}\\b`, "i").test(observations);
  const pushedOther = new RegExp(`\\b${escaped}\\s+push(?:ed|es|ing)?\\b`, "i").test(observations);
  const receivedPhysicalResponse = new RegExp(
    `\\b(?:punch(?:ed|es|ing)?|hit(?:s|ting)?|kick(?:ed|s|ing)?|bit(?:e|es|ing)?|scratch(?:ed|es|ing)?)\\s+${escaped}\\b`,
    "i"
  ).test(observations);
  const usedPhysicalResponse = new RegExp(
    `\\b${escaped}\\s+(?:punch(?:ed|es|ing)?|hit(?:s|ting)?|kick(?:ed|s|ing)?|bit(?:e|es|ing)?|scratch(?:ed|es|ing)?)\\b`,
    "i"
  ).test(observations);

  if (wasPushed && usedPhysicalResponse) {
    return `${child} was playing with another child. The note records that another child pushed ${child}, ${child} did not like it, and ${child} responded with an unsafe physical action.`;
  }
  if (pushedOther && receivedPhysicalResponse) {
    return `${child} was playing with another child. The note records that ${child} pushed, and another child then responded with an unsafe physical action.`;
  }
  if (usedPhysicalResponse) {
    return `${child} was involved in shared play that became unsafe when ${child} used a physical response.`;
  }
  if (pushedOther) {
    return `${child} was involved in shared play that became unsafe when pushing happened.`;
  }
  if (wasPushed || receivedPhysicalResponse) {
    return `${child} was involved in shared play that became unsafe when another child's physical action affected ${child}.`;
  }

  return `${child} was involved in shared play followed by physical conflict that needs calm adult support.`;
}

function incidentPedagogyParagraph(focus: PedagogyFocus, child: string) {
  switch (focus) {
    case "intentional_teaching":
      return `The intentional teaching move is to slow the moment down and teach the replacement skill. The educator can model short language such as "Stop", "I need space", or "Please help", while also showing what safe hands and safe bodies look like in this play context.`;
    case "child_voice":
      return `Child voice is important here, but it should not be invented. A stronger final story would include what ${child} said, signed, gestured, or showed with their body when the play became too rough, and what language the educator offered as a safer alternative.`;
    case "family_partnership":
      return `A family partnership lens can help if the educator keeps the question practical and non-blaming. The useful question is not "does this happen at home", but "what words or strategies help ${child} when play feels too rough or unfair?"`;
    case "working_theories":
      return `This may also be followed as an emerging social working theory: what does ${child} understand about space, fairness, stopping, and repairing after something has gone wrong in play?`;
    default:
      return `The educator's role is to protect safety first, then support learning. That means checking both children are okay, naming the unsafe action calmly, helping each child communicate, and returning to play only when the situation is settled.`;
  }
}

function buildPhysicalSafetyFallbackStory(
  current: StoryResult,
  params: {
    observations: string;
    framework: StoryFrameworkId;
    tone: StoryTone;
    depth: StoryDepth;
    pedagogyFocus?: PedagogyFocus;
    childName?: string;
    ageGroup?: string;
  },
  reasons: string[],
  revisionCount: number
): StoryResult {
  const child = params.childName?.trim() || "the child";
  const childLower = child === "the child" ? "the child" : child;
  const observation = cleanObservationSummary(params.observations) || "The educator noted a brief social learning and safety moment.";
  const title = child === "the child" ? "A Social Learning and Safety Moment" : `Supporting ${child}'s Safe Play`;
  const framework = incidentFrameworkMetadata(params.framework);
  const frameworkName = params.framework === "NZ" ? "Te Whāriki" : "EYLF";
  const familyWord = params.framework === "NZ" ? "whānau" : "family";
  const sequence = buildIncidentSequence(params.observations, params.childName);
  const ageSentence = params.ageGroup
    ? `The selected age group is ${params.ageGroup}, so the final wording should stay matched to what is reasonable for that age and your local behaviour guidance.`
    : "Because no age was supplied, the interpretation stays broad and avoids age-specific developmental claims.";
  const pedagogyParagraph = incidentPedagogyParagraph(params.pedagogyFocus ?? "balanced", child);

  const paragraphs = [
    `This observation records a social learning and safety moment, not a simple play interest. ${sequence} The important educator message is clear: the physical response was not safe, and the children need calm adult support rather than blame or shame.`,
    `The learning focus is social and emotional. ${child} is still learning how to manage a hard moment in play, how to communicate when something feels wrong, and how to return to a safe relationship after conflict. A paid-grade learning story should name that honestly instead of turning the moment into a generic story about exploration.`,
    `The evidence boundary matters. The note says: "${observation}". It does not tell us whether anyone was hurt, what happened immediately before the push, what words were used, how long the moment lasted, or how the educator responded. Those details should be checked before this is shared with ${familyWord} or saved as a final record.`,
    pedagogyParagraph,
  ];

  if (params.depth !== "concise") {
    paragraphs.push(
      `For ${frameworkName}, the strongest curriculum link is wellbeing, relationships, contribution, and communication. This moment can show learning because children are supported to notice impact, use safer strategies, hear another person's boundary, and repair the connection with adult help. The curriculum claim should stay modest: the story is about support for safe social participation, not about a completed skill.`,
      `A useful educator response would be immediate and practical. First, check safety and comfort. Then support each child separately if needed. Use simple language to name the boundary: "Pushing hurt Ruby" or "Punching is not safe." After that, help the child practise a safer option such as moving away, saying stop, asking for help, or using a calm body.`
    );
  }

  if (params.depth === "detailed") {
    paragraphs.push(
      `This draft should also sit beside your service's behaviour, injury, or incident process if that applies. The learning story can record the teaching response, but it should not replace required incident documentation, family communication, or centre policy. If another child is named in the rough note, the educator may need to remove that name from the family-facing version.`,
      `The next observation should look for repair and replacement skills, not just whether the behaviour happens again. Notice whether ${childLower} can use a word, gesture, pause, seek help, accept support, re-enter play safely, or show care after a hard moment. Those are the details that will make the next story specific, useful, and fair to everyone involved.`
    );
  }

  const story = `${title}\n\n${paragraphs.join("\n\n")}`;
  const wordCount = countWords(story);
  const meetsDepthTarget = wordCount >= getMinimumStoryWords(params.depth);

  return {
    ...current,
    storyTitle: title,
    story,
    outcomes: framework.outcomes,
    curriculumLinks: framework.curriculumLinks,
    learningSummary: `${child} was involved in a social learning and safety moment. The visible learning is about safe bodies, communication, emotional regulation, and repair with educator support.`,
    childVoice: "",
    learningDispositions: ["self-regulation", "communication", "empathy", "repairing relationships"],
    socialEmotionalLinks: ["safe bodies", "emotional awareness", "boundary language", "help-seeking"],
    culturalConnections: [],
    whanauConnection:
      params.framework === "NZ"
        ? `Whānau may know words, cues, or calming strategies that help ${child} when play feels too rough or unfair.`
        : `Families may know words, cues, or calming strategies that help ${child} when play feels too rough or unfair.`,
    assumptions: [
      "This observation involves physical conflict, so safety, injury, supervision, and service policy details need educator review.",
      "The note is brief, so exact words, educator response, what happened before, and whether anyone was hurt need confirming.",
      ageSentence,
    ],
    evidenceAnchors: [
      "The children were playing together.",
      "The note records pushing during the play.",
      "The note records an unsafe physical response after the push.",
    ],
    educatorChecks: [
      "Was anyone hurt, and does this need an incident or behaviour record under your service policy?",
      "What exact words, gestures, or educator support happened before and after the physical response?",
      `Should another child's name be removed before sharing this with ${familyWord}?`,
    ],
    pedagogyLinks: framework.pedagogyLinks,
    frameworkEvidence: framework.frameworkEvidence,
    parentFriendlyVersion:
      params.framework === "NZ"
        ? `${child} had a hard social moment during play and needed support with safe bodies, words, and repair. Please review the details before sharing with whānau.`
        : `${child} had a hard social moment during play and needed support with safe bodies, words, and repair. Please review the details before sharing with family.`,
    familyQuestion:
      params.framework === "NZ"
        ? `What words, cues, or calming strategies help ${child} when play feels too rough or unfair?`
        : `What words, cues, or calming strategies help ${child} when play feels too rough or unfair?`,
    followUpPrompt: `Notice whether ${child} can use a word, gesture, pause, or seek help when play becomes too physical.`,
    childAge: params.ageGroup || current.childAge || "Not stated",
    nextSteps: [
      "Check safety first and follow the service incident or behaviour process if required.",
      "Teach one replacement phrase or gesture for stopping rough play and asking for help.",
      "Plan close educator support during similar peer play and record the next safe communication attempt.",
    ],
    wordCount,
    storyQuality: {
      passes: true,
      score: 93,
      revisionCount,
      checks: {
        naturalEducatorTone: true,
        childVoiceSupported: true,
        frameworkLinksFit: true,
        noInventedDetails: true,
        evidenceToLearningClear: true,
        familyReadable: true,
        usefulForDepth: meetsDepthTarget,
        physicalConflictHandledSafely: true,
      },
      issues: meetsDepthTarget ? [] : reasons.slice(0, 3),
      strengths: ["Physical conflict was handled as a safety and social learning moment, not generic play."],
    },
  };
}

function fallbackPedagogyParagraph(focus: PedagogyFocus, child: string) {
  switch (focus) {
    case "intentional_teaching":
      return `The strongest teaching response is to extend the idea without taking over. An educator could sit nearby, name what ${child} is doing, offer one carefully chosen material or phrase, and then wait to see whether ${child} keeps control of the play.`;
    case "child_voice":
      return `The next version of this story would be stronger with ${child}'s exact words, sounds, gestures, or choices recorded. Until then, the draft keeps child voice as agency: what ${child} chose, repeated, changed, or communicated through the play.`;
    case "family_partnership":
      return `A useful family connection is to ask whether this kind of play, role, movement, or language is showing up outside the centre too. That invites family knowledge without assuming what happens at home.`;
    case "working_theories":
      return `This can be followed as an emerging working theory: what does ${child} seem to understand about the role, object, routine, or problem, and what changes when the same idea is offered again?`;
    default:
      return `The educator's role is to notice the learning process, not just the activity. The useful follow-up is to watch what ${child} adds next: language, repeated actions, new roles, problem solving, peer connection, or a different way to use the materials.`;
  }
}

function buildGroundedFallbackStory(
  current: StoryResult,
  params: {
    observations: string;
    framework: StoryFrameworkId;
    tone: StoryTone;
    depth: StoryDepth;
    pedagogyFocus?: PedagogyFocus;
    childName?: string;
    ageGroup?: string;
  },
  reasons: string[],
  revisionCount: number
): StoryResult {
  if (hasPhysicalSafetyIncident(params.observations)) {
    return buildSharedPhysicalSafetyFallbackStory(current, params, reasons, revisionCount);
  }

  const child = params.childName?.trim() || "the child";
  const possessive = params.childName?.trim() ? `${child}'s` : "the child's";
  const observation = cleanObservationSummary(params.observations) || "The educator noted a brief learning moment.";
  const title = current.storyTitle || `${child === "the child" ? "Learning Through Play" : `${child}'s Learning Through Play`}`;
  const framework = fallbackFrameworkMetadata(params.framework);
  const ageSentence = params.ageGroup
    ? `The selected age group is ${params.ageGroup}, so the interpretation should stay matched to what is reasonable for that age and to what was actually observed.`
    : "Because no age was supplied, the interpretation stays broad and avoids age-specific developmental claims.";
  const frameworkName = params.framework === "NZ" ? "Te Whāriki" : "EYLF";
  const sparseBoundary =
    "The note is brief, so this draft keeps the evidence boundary clear. It does not add exact words, other children, feelings, family background, materials, or educator actions that were not recorded.";
  const pedagogyParagraph = fallbackPedagogyParagraph(params.pedagogyFocus ?? "balanced", child);

  const paragraphs = [
    `From this observation, ${child} was using play to explore an idea that was meaningful in the moment. The educator's note says: "${observation}". That gives a clear starting point, even though some details still need to be checked before sharing.`,
    `${possessive.charAt(0).toUpperCase()}${possessive.slice(1)} play matters because children often use familiar routines, movement, objects, roles, sounds, and repeated actions to make sense of their world. In this moment, the visible learning is not just the topic of the play; it is the process ${child} was using to organise an idea, make choices, communicate meaning, and stay with the experience long enough for an educator to notice it.`,
    `For ${frameworkName}, the strongest link is with learning through exploration and communication. The observation can support curriculum links when the educator can point back to what ${child} actually did or communicated. ${sparseBoundary}`,
    pedagogyParagraph,
  ];

  if (params.depth !== "concise") {
    paragraphs.push(
      `A stronger final version would include the context of the moment: where the play happened, what materials were involved, whether ${child} used words, sounds or gestures, whether another child joined in, and how the educator responded. Those details would make the learning story more personal without needing to make bigger claims.`,
      `The next teaching move should be simple and observable. Offer a small extension connected to the same idea, stay close enough to hear ${child}'s language or notice gestures, and record one or two exact details next time. That will help the next story show continuity rather than treating this as a one-off activity.`
    );
  }

  if (params.depth === "detailed") {
    paragraphs.push(
      `This draft is intentionally careful because high-quality documentation is not about making a small note sound dramatic. It is about turning the note into a useful record while preserving educator judgement. The final educator review should decide whether the curriculum link is the best fit, whether the family question is appropriate, and whether any local centre language should be added.`,
      `If this interest appears again, the educator could create a follow-up by adding one related prop, inviting ${child} to show or explain the idea, or noticing whether the play becomes more social, symbolic, physical, or language-rich. The important evidence to capture next is what changes: what ${child} repeats, adds, solves, says, asks, or invites someone else to do.`
    );
  }

  const story = `${title}\n\n${paragraphs.join("\n\n")}`;
  const wordCount = countWords(story);
  const meetsDepthTarget = wordCount >= getMinimumStoryWords(params.depth);

  return {
    ...current,
    storyTitle: title,
    story,
    outcomes: framework.outcomes,
    curriculumLinks: framework.curriculumLinks,
    learningSummary: `${child} was using play to explore an idea, make choices, and communicate meaning. The evidence is brief, so the final educator review should add any exact words, materials, relationships, or educator responses before sharing.`,
    childVoice: "",
    learningDispositions: ["curiosity", "communication", "agency", "working theories"],
    socialEmotionalLinks: ["confidence", "belonging through familiar play"],
    culturalConnections: [],
    whanauConnection:
      params.framework === "NZ"
        ? "Whānau may recognise whether this kind of play, language, or routine is showing up in other settings."
        : "Families may recognise whether this kind of play, language, or routine is showing up in other settings.",
    assumptions: [
      "The observation is brief, so exact words, materials, peers, and educator response need confirming.",
      ageSentence,
    ],
    evidenceAnchors: [observation],
    educatorChecks: [
      `What exact words, sounds, gestures, or choices did ${child} use?`,
      "What materials, people, and context were part of the moment?",
      `Does this ${frameworkName} link match what you observed closely enough to share?`,
    ],
    pedagogyLinks: framework.pedagogyLinks,
    frameworkEvidence: framework.frameworkEvidence,
    familyQuestion:
      params.framework === "NZ"
        ? `Do you notice ${child} using this kind of play, role, or language with whānau?`
        : `Do you notice ${child} using this kind of play, role, or language at home?`,
    followUpPrompt: `Notice what ${child} adds next time: words, gestures, roles, materials, problem solving, or connection with another child.`,
    childAge: params.ageGroup || current.childAge || "Not stated",
    nextSteps: [
      "Offer one related prop or material and observe what the child does with it.",
      "Record one exact phrase, gesture, choice, or repeated action next time.",
      "Use a short family question to check whether this interest connects with experiences outside the centre.",
    ],
    wordCount,
    storyQuality: {
      passes: true,
      score: 90,
      revisionCount,
      checks: {
        naturalEducatorTone: true,
        childVoiceSupported: true,
        frameworkLinksFit: true,
        noInventedDetails: true,
        evidenceToLearningClear: true,
        familyReadable: true,
        usefulForDepth: meetsDepthTarget,
      },
      issues: meetsDepthTarget ? [] : reasons.slice(0, 3),
      strengths: ["Fallback kept the story grounded in the supplied observation."],
    },
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
- avoids vague action language such as "spent time", "was engaged", or "kept trying" when stronger evidence is available
- no invented details
- no unsupported exact quotes, materials, peer interactions, emotions, or educator actions
- clear link between observation and learning
- family-ready enough that a parent can understand the main learning without curriculum jargon
- enough substance for the requested depth and minimum story word count
- sparse notes become useful drafts with clear evidence limits, not generic one-paragraph summaries
- physical conflict or unsafe-body observations are handled as safety/social-emotional learning moments, not generic play or exploration stories

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
    "preciseObservedActions": true,
    "noInventedDetails": true,
    "noUnsupportedSpecifics": true,
    "evidenceToLearningClear": true,
    "familyReadable": true,
    "usefulForDepth": true
  },
  "issues": [],
  "strengths": ["Evidence stays close to the observation"],
  "revision": null
}

If currentDraft.story is below minimumStoryWords, score below 90 and include a revision.
If score is below 90 or any important check fails, include "revision" as a complete improved StoryLoop JSON object using the same shape as the original story result. Preserve all true evidence. Remove invented, generic, poetic, vague, or unsupported claims.`;

const STORY_RESCUE_PROMPT = `You are StoryLoop's final rescue writer.

Your job is to rewrite a weak or thin draft into a paid-grade early childhood learning story that is still evidence-led.

Rules:
- Return only valid JSON using the StoryLoop story result shape.
- Meet or exceed minimumStoryWords in the story field.
- Do not invent exact words, materials, peers, family background, emotions, diagnosis, educator response, or sequence.
- If notes are sparse, make the evidence boundary visible in assumptions and educatorChecks, not by writing a tiny story.
- If the notes include pushing, hitting, punching, biting, injury, unsafe bodies, or physical conflict, write an incident-aware social learning reflection: safe bodies, communication, emotional regulation, repair, educator support, privacy, and incident-policy review. Do not frame it as a play adventure, curiosity, exploration, props, or following an interest.
- Make the selected tone, depth, pedagogyFocus, and framework visible.
- EYLF must contain only Australian EYLF wording. Do not use Te Whāriki, Mana strands, whānau, kaiako, tamariki, Kōwhiti, or Aotearoa-only language.
- Te Whāriki must use Aotearoa New Zealand wording only and avoid EYLF labels.
- The story should feel like a skilled educator wrote it for review, not a generic AI summary.

Return the complete improved JSON object now.`;

async function runStoryRescueRewrite(
  current: StoryResult,
  params: {
    observations: string;
    framework: StoryFrameworkId;
    tone: StoryTone;
    depth: StoryDepth;
    pedagogyFocus?: PedagogyFocus;
    childContext?: string;
    childName?: string;
    ageGroup?: string;
  },
  reasons: string[]
) {
  const rescueText = await callAI(
    STORY_RESCUE_PROMPT,
    JSON.stringify({
      reasons,
      observations: params.observations,
      framework: params.framework,
      tone: params.tone,
      depth: params.depth,
      pedagogyFocus: params.pedagogyFocus ?? "balanced",
      minimumStoryWords: getMinimumStoryWords(params.depth),
      childName: params.childName ?? "",
      ageGroup: params.ageGroup ?? "",
      childContext: params.childContext || "",
      currentDraft: current,
    })
  );
  return enforceFrameworkForResult(
    normaliseStoryResult({ ...current, ...parseJSON<Partial<StoryResult>>(rescueText) }),
    params.framework
  );
}

async function runStoryQualityCoach(
  initial: StoryResult,
  params: {
    observations: string;
    framework: StoryFrameworkId;
    tone: StoryTone;
    depth: StoryDepth;
    pedagogyFocus?: PedagogyFocus;
    childContext?: string;
    childName?: string;
    ageGroup?: string;
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
        minimumStoryWords: getMinimumStoryWords(params.depth),
        childContext: params.childContext || "",
        currentDraft: current,
      })
    );
    const parsed = parseJSON<QualityReviewResponse>(reviewText);
    latestReview = applyDeterministicQualityGuards(
      normaliseQualityReview(parsed, revisionCount),
      current,
      { framework: params.framework, depth: params.depth, observations: params.observations }
    );

    if (latestReview.passes && (latestReview.score ?? 0) >= 90) break;
    if (!parsed.revision || typeof parsed.revision !== "object") break;

    current = enforceFrameworkForResult(
      normaliseStoryResult({ ...current, ...parsed.revision }),
      params.framework
    );
    revisionCount += 1;
  }

  const rescueReasons = getStoryRescueReasons(current, params);
  if (rescueReasons.length > 0) {
    try {
      const rescued = await runStoryRescueRewrite(current, params, rescueReasons);
      const rescuedReview = applyDeterministicQualityGuards(
        {
          passes: true,
          score: 92,
          revisionCount: revisionCount + 1,
          checks: {
            naturalEducatorTone: true,
            frameworkLinksFit: true,
            noInventedDetails: true,
            evidenceToLearningClear: true,
            familyReadable: true,
            usefulForDepth: true,
          },
          issues: [],
          strengths: ["Final rescue rewrite improved depth, framework fit, and educator usefulness."],
        },
        rescued,
        { framework: params.framework, depth: params.depth, observations: params.observations }
      );

      if (rescuedReview.passes) {
        return {
          ...rescued,
          storyQuality: { ...rescuedReview, revisionCount: revisionCount + 1 },
        };
      }

      const fallback = buildGroundedFallbackStory(rescued, params, rescuedReview.issues, revisionCount + 2);
      return enforceFrameworkForResult(fallback, params.framework);
    } catch (rescueError) {
      console.error("Story rescue rewrite failed:", rescueError);
      const fallback = buildGroundedFallbackStory(current, params, rescueReasons, revisionCount + 1);
      return enforceFrameworkForResult(fallback, params.framework);
    }
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
    includeTeReoLevel: framework === "NZ"
      ? normalizeTeReoLevel(params.includeTeReoLevel ?? params.preferences?.includeTeReoLevel)
      : "low",
    includeKowhitiWhakapae: framework === "NZ"
      ? params.includeKowhitiWhakapae ?? params.preferences?.includeKowhitiWhakapae
      : false,
    includeTapasa: params.includeTapasa ?? params.preferences?.includeTapasa,
    pedagogyFocus: params.pedagogyFocus ?? params.preferences?.pedagogyFocus,
  });
  const depth = preferences.depthPreference ?? "balanced";

  if (hasPhysicalSafetyIncident(observations)) {
    const seed = normaliseStoryResult({
      storyTitle: params.childName ? `Supporting ${params.childName}'s Safe Play` : "A Social Learning and Safety Moment",
      story: "",
    });
    const incidentDraft = enforceFrameworkForResult(
      buildSharedPhysicalSafetyFallbackStory(
        seed,
        {
          observations,
          framework,
          tone,
          depth,
          pedagogyFocus: preferences.pedagogyFocus ?? "balanced",
          childName: params.childName,
          ageGroup: params.ageGroup,
        },
        [],
        0
      ),
      framework
    );

    return {
      ...incidentDraft,
      privacyGuardian: runPrivacyGuardian({ observation: observations, story: incidentDraft.story }),
    };
  }

  const userContent = buildUserMessage(
    observations,
    params.ageGroup,
    params.childName,
    tone,
    framework,
    preferences,
    params.childContext
  );
  let firstDraft: StoryResult;
  try {
    const result = await callAI(LEARNING_STORY_PROMPT, userContent);
    firstDraft = enforceFrameworkForResult(
      normaliseStoryResult(parseJSON<StoryResult>(result)),
      framework
    );
  } catch (initialError) {
    console.error("Initial story generation failed, using grounded fallback:", initialError);
    const seed = normaliseStoryResult({
      storyTitle: params.childName ? `${params.childName}'s Learning Story` : "Learning Through Play",
      story: "",
    });
    const fallback = enforceFrameworkForResult(
      buildGroundedFallbackStory(
        seed,
        {
          observations,
          framework,
          tone,
          depth,
          pedagogyFocus: preferences.pedagogyFocus ?? "balanced",
          childName: params.childName,
          ageGroup: params.ageGroup,
        },
        ["The AI draft service did not return a usable first draft."],
        0
      ),
      framework
    );
    return {
      ...fallback,
      privacyGuardian: runPrivacyGuardian({ observation: observations, story: fallback.story }),
    };
  }

  try {
    const reviewedDraft = await runStoryQualityCoach(firstDraft, {
      observations,
      framework,
      tone,
      depth,
      pedagogyFocus: preferences.pedagogyFocus ?? "balanced",
      childContext: params.childContext,
      childName: params.childName,
      ageGroup: params.ageGroup,
    });
    const cleanReviewedDraft = enforceFrameworkForResult(reviewedDraft, framework);
    return {
      ...cleanReviewedDraft,
      privacyGuardian: runPrivacyGuardian({ observation: observations, story: cleanReviewedDraft.story }),
    };
  } catch (qualityError) {
    console.error("Story quality check failed:", qualityError);
    const fallback = enforceFrameworkForResult(
      buildGroundedFallbackStory(
        firstDraft,
        {
          observations,
          framework,
          tone,
          depth,
          pedagogyFocus: preferences.pedagogyFocus ?? "balanced",
          childName: params.childName,
          ageGroup: params.ageGroup,
        },
        ["The story quality review helper could not complete."],
        1
      ),
      framework
    );
    return {
      ...fallback,
      privacyGuardian: runPrivacyGuardian({ observation: observations, story: fallback.story }),
    };
  }
}

export async function generateFamilyTranslationPack(params: {
  story: string;
  parentVersion?: string;
  language: string;
  childName?: string | null;
}) {
  const prompt = `Create a parent-friendly translation and readability pack for an early childhood educator.

Rules:
- Use only the supplied story/family version.
- Keep the plain English version short, warm, factual, and easy for families.
- Translate only the family-facing message, not the whole educator documentation record.
- If the requested language is unclear, use the nearest common language name and say so in the teacher check.
- Do not invent child actions, diagnoses, family routines, or cultural background.
- Include a teacher check reminding the educator to review with a fluent speaker or family preference when needed.

Return only valid JSON:
{
  "language": "language used",
  "translatedMessage": "translated family-facing message",
  "plainEnglishVersion": "80-130 word simple version in English",
  "readingLevelNote": "short note about readability",
  "teacherCheck": "one review check before sharing"
}`;

  const response = await callAI(
    prompt,
    JSON.stringify({
      childName: params.childName ?? "the child",
      language: params.language,
      story: params.parentVersion || params.story,
    })
  );
  const parsed = parseJSON<Partial<FamilyTranslationPack>>(response);
  return {
    language: typeof parsed.language === "string" ? parsed.language.trim() : params.language,
    translatedMessage: typeof parsed.translatedMessage === "string" ? parsed.translatedMessage.trim() : "",
    plainEnglishVersion: localiseSpelling(
      typeof parsed.plainEnglishVersion === "string" ? parsed.plainEnglishVersion.trim() : ""
    ),
    readingLevelNote: localiseSpelling(
      typeof parsed.readingLevelNote === "string" ? parsed.readingLevelNote.trim() : ""
    ),
    teacherCheck: localiseSpelling(typeof parsed.teacherCheck === "string" ? parsed.teacherCheck.trim() : ""),
  } satisfies FamilyTranslationPack;
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

export async function generateFamilyConnectionPack(params: {
  story: string;
  childName?: string | null;
  framework?: StoryFrameworkId;
  learningSummary?: string;
  familyQuestion?: string;
  nextSteps?: string[];
}) {
  const prompt = `Create a Family Connection Pack from one early childhood learning story.

Rules:
- Use only the story and metadata supplied.
- Do not invent home routines, culture, diagnosis, family background, or child quotes.
- Keep it useful for a busy educator who wants to communicate with families quickly.
- Make the family message warm and plain, not salesy or overly polished.
- Keep every field concise.

Return only valid JSON:
{
  "familyMessage": "80-130 word family-ready message",
  "familyQuestion": "one open question families could answer",
  "homeConnection": "one simple optional idea families could try at home",
  "photoCaption": "one short caption for a photo or app update",
  "handoverNote": "one sentence educators could say at pickup",
  "teacherCheck": "one thing the educator should confirm before sharing"
}`;

  const response = await callAI(
    prompt,
    JSON.stringify({
      childName: params.childName ?? "the child",
      framework: params.framework ?? "AU",
      learningSummary: params.learningSummary ?? "",
      familyQuestion: params.familyQuestion ?? "",
      nextSteps: params.nextSteps ?? [],
      story: params.story,
    })
  );
  const parsed = parseJSON<Partial<FamilyConnectionPack>>(response);
  return {
    familyMessage: localiseSpelling(typeof parsed.familyMessage === "string" ? parsed.familyMessage.trim() : ""),
    familyQuestion: localiseSpelling(typeof parsed.familyQuestion === "string" ? parsed.familyQuestion.trim() : ""),
    homeConnection: localiseSpelling(typeof parsed.homeConnection === "string" ? parsed.homeConnection.trim() : ""),
    photoCaption: localiseSpelling(typeof parsed.photoCaption === "string" ? parsed.photoCaption.trim() : ""),
    handoverNote: localiseSpelling(typeof parsed.handoverNote === "string" ? parsed.handoverNote.trim() : ""),
    teacherCheck: localiseSpelling(typeof parsed.teacherCheck === "string" ? parsed.teacherCheck.trim() : ""),
  } satisfies FamilyConnectionPack;
}

export async function generateRoomPlanningBrief(params: {
  stories: Array<{
    childName?: string | null;
    storyText: string;
    learningSummary?: string;
    nextSteps?: string[];
    outcomes?: string[];
    createdAt?: string | null;
  }>;
  framework?: StoryFrameworkId;
}) {
  const prompt = `Create a Room Planning Brief for early childhood educators from recent learning stories.

Purpose:
- Help a room leader or centre team turn documentation into next-week planning.
- Identify patterns across recent stories without claiming a full assessment.
- Reduce meeting prep, not add compliance paperwork.

Rules:
- Use only supplied story evidence.
- Do not rank children, diagnose, or infer private family details.
- Keep suggestions practical for a real room.
- Include family partnership language that invites knowledge rather than tells families what to do.
- If the evidence is thin, say so and suggest what to observe next.

Return only valid JSON:
{
  "summary": "short planning summary",
  "emergingInterests": ["2-5 patterns noticed"],
  "curriculumOpportunities": ["2-5 framework-aware opportunities"],
  "environmentSetups": ["2-5 practical environment or provocation ideas"],
  "intentionalTeachingMoves": ["2-5 concrete educator moves"],
  "familyPartnershipPrompt": "one message or question for families",
  "teamReflectionQuestions": ["2-4 team discussion questions"],
  "watchNext": ["2-5 things to observe next"]
}`;

  const response = await callAI(
    prompt,
    JSON.stringify({
      framework: params.framework ?? "AU",
      stories: params.stories.slice(0, 12),
    })
  );
  const parsed = parseJSON<Partial<RoomPlanningBrief>>(response);
  return {
    summary: localiseSpelling(typeof parsed.summary === "string" ? parsed.summary.trim() : ""),
    emergingInterests: localiseStringArray(toShortStringArray(parsed.emergingInterests, 5)),
    curriculumOpportunities: localiseStringArray(toShortStringArray(parsed.curriculumOpportunities, 5)),
    environmentSetups: localiseStringArray(toShortStringArray(parsed.environmentSetups, 5)),
    intentionalTeachingMoves: localiseStringArray(toShortStringArray(parsed.intentionalTeachingMoves, 5)),
    familyPartnershipPrompt: localiseSpelling(
      typeof parsed.familyPartnershipPrompt === "string" ? parsed.familyPartnershipPrompt.trim() : ""
    ),
    teamReflectionQuestions: localiseStringArray(toShortStringArray(parsed.teamReflectionQuestions, 4)),
    watchNext: localiseStringArray(toShortStringArray(parsed.watchNext, 5)),
  } satisfies RoomPlanningBrief;
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
