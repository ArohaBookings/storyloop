/**
 * Learning stories for England (EYFS) and Ireland (Aistear).
 *
 * A separate path, so Australian and New Zealand stories cannot change: the
 * API sends only UK and IE requests here, and everything AU/NZ-specific
 * (prompts, framework guards, rescue rewrites, the offline writer) is left
 * exactly as it was. What is shared is unchanged and framework-neutral: the
 * system prompt (LEARNING_STORY_PROMPT), the AI call, JSON parsing and the
 * result clean-up (British spelling suits both countries).
 */
import { LEARNING_STORY_PROMPT, getAgeGroupGuidance, getObservationDetailGuidance } from "./prompts";
import {
  StoryWriterUnavailableError,
  callAI,
  normaliseStoryResult,
  offlineWriterAllowed,
  parseJSON,
  type StoryResult,
} from "./generate";
import { countWords, getMetaCommentaryIssues, getMinimumStoryWords } from "./quality-guards";
import { runPrivacyGuardian } from "@/lib/privacy-guardian";
import { aiFailureReason } from "@/lib/ai-health";
import {
  normalizeDepth,
  normalizeTone,
  type PedagogyFocus,
  type StoryDepth,
  type StoryPreferences,
  type StoryTone,
} from "@/lib/story-options";
import {
  INTERNATIONAL_FRAMEWORKS,
  frameworkLeaks,
  type InternationalFrameworkId,
} from "@/lib/international-frameworks";

const TONE_GUIDANCE: Record<StoryTone, string> = {
  natural: "Use a natural educator voice: warm, direct, reflective, and not over-written.",
  warm: "Use a warm reflective voice without sounding poetic or sentimental.",
  professional: "Use a clear professional voice suitable for a room leader, manager, or inspection audience.",
  simple: "Use simple everyday early years language with shorter sentences and no jargon.",
};

const DEPTH_GUIDANCE: Record<StoryDepth, string> = {
  concise:
    "Write a compact but complete learning story: about 180-260 words in the story field, plus short metadata fields. It should still include observation, learning meaning, curriculum fit, and a practical response.",
  balanced:
    "Write a strong everyday learning story: about 300-450 words in the story field, plus useful metadata fields. Use 3-5 short paragraphs with evidence, interpretation, educator response, and family connection.",
  detailed:
    "Write a fuller educator-ready learning story: about 500-700 words in the story field, plus metadata fields. Add careful interpretation, pedagogy, continuity, and next steps without inventing extra events.",
};

const PEDAGOGY_GUIDANCE: Record<PedagogyFocus, string> = {
  balanced: "Balance observation, interpretation, curriculum, child voice, and a practical response without forcing every lens.",
  intentional_teaching: "Make the educator's possible teaching response concrete, proportionate, and connected to what the child already showed.",
  child_voice: "Prioritise the child's words, gesture, choices, agency, and interpretation. Do not invent a quote.",
  family_partnership: "Identify a respectful question or connection that invites family knowledge without assuming home practice.",
  working_theories: "Notice the child's emerging idea about how something works and suggest a way to revisit or test that idea.",
};

export function buildInternationalUserMessage(input: {
  observations: string;
  ageGroup?: string;
  childName?: string;
  tone: StoryTone;
  framework: InternationalFrameworkId;
  preferences: StoryPreferences;
  childContext?: string;
  educatorNames?: string[];
}) {
  const config = INTERNATIONAL_FRAMEWORKS[input.framework];
  const preferences = input.preferences;
  const depth = preferences.depthPreference ?? "balanced";
  const pedagogyFocus = preferences.pedagogyFocus ?? "balanced";
  const educatorNames = Array.from(
    new Set((input.educatorNames ?? []).map((name) => name.trim().replace(/\s+/g, " ")).filter((name) => name.length > 1).slice(0, 4)),
  );
  const emphasis = preferences.emphasis?.length ? preferences.emphasis.join(", ") : "plain language, real educator voice, practical learning links";

  return `EDUCATOR OBSERVATIONS:
${input.observations}

CHILD NAME: ${input.childName ? `${input.childName}. Use this spelling exactly.` : "Not provided. Read the observation and work out the child's name yourself."}
IDENTIFYING THE CHILD:
- If a name is supplied above, use exactly that spelling and do not substitute a different name.
- If no name is supplied, take it from the observation. Educators type in a hurry, so it may be lower case ("bob played with his socks" is Bob), part-way through a sentence, a bare fragment ("billy playdough" is Billy), or more than one word. Capitalise it correctly and keep the whole name.
- Use the child's name naturally through the story instead of "the child".
- Only fall back to "the child" when the note genuinely names no individual, such as a whole-room or group observation.
- Never invent a name, and never promote another child mentioned in passing to be the subject.
- Return whatever name you used in childNameUsed, spelled exactly as it appears in the story, or an empty string if you used none.
AGE GROUP: ${input.ageGroup ? input.ageGroup : "Not provided"}
EDUCATOR/STAFF NAMES TO USE IN THE STORY: ${educatorNames.length ? educatorNames.join(", ") : "Not provided. Use we/us/our."}
SAVED CONTINUITY CONTEXT:
${input.childContext || "No saved child profile or earlier learning context was selected."}

${getObservationDetailGuidance(input.observations)}

${getAgeGroupGuidance(input.ageGroup)}

CONTEXT BOUNDARY:
- Saved continuity context may inform respectful wording and possible connections.
- It is not evidence from today's observation.
- Never state a saved interest, aspiration, language, or earlier pattern as if it happened today.

REQUESTED TONE: ${input.tone}
REQUESTED DEPTH: ${depth}
PEDAGOGY FOCUS: ${pedagogyFocus}
FRAMEWORK: ${config.label} (${config.pickerLabel})

SETTINGS MUST BE VISIBLE IN THE DRAFT:
- Tone must noticeably shape the writing style.
- Depth must noticeably change story length and development.
- Pedagogy focus must influence the story, pedagogyLinks, familyQuestion, followUpPrompt, and nextSteps without forcing unsupported claims.
- Framework must control all curriculum wording. ${config.pickerLabel} means ${config.label} only. Never use the curriculum or terms of Australia (EYLF), New Zealand (Te Whāriki), ${input.framework === "UK" ? "or Ireland (Aistear)" : "or England (EYFS)"}.

FRAMEWORK GUIDANCE:
${config.curriculumPrompt}

VOICE GUIDANCE:
- ${config.voicePrompt}
- ${TONE_GUIDANCE[input.tone]}
- ${DEPTH_GUIDANCE[depth]}
- ${PEDAGOGY_GUIDANCE[pedagogyFocus]}
- ${config.audience}
- Do not use te reo Māori, whānau, kaiako, tamariki, or any Australian or New Zealand framework language.
- Keep the language simple enough that an early years educator would naturally use it.
- Use British spelling such as colour, behaviour, centre, organise, and recognise.

CULTURAL GUIDANCE:
- ${config.culturalPrompt}
- If social and emotional learning is visible, name it in plain language.

PERSISTED STORY PREFERENCES:
- Preferred tone: ${preferences.preferredTone ?? "Not set"}
- Preferred depth: ${preferences.depthPreference ?? "Not set"}
- Centre philosophy or room voice: ${preferences.centrePhilosophy ?? "Not set"}
- Words or phrases they like: ${preferences.likedPhrases?.length ? preferences.likedPhrases.join(", ") : "Not set"}
- Words or phrases they avoid: ${preferences.avoidedPhrases?.length ? preferences.avoidedPhrases.join(", ") : "Not set"}
- Approved story example: ${preferences.approvedStoryExample ?? "Not set"}
- Setting quality notes: ${preferences.qualityNotes ?? "Not set"}
- Setting privacy rules: ${preferences.privacyRules?.length ? preferences.privacyRules.join("; ") : "Not set"}
- Pedagogy focus: ${pedagogyFocus}
- Emphasis areas: ${emphasis}
- Extra notes: ${preferences.notes ?? "None"}

SETTING VOICE MEMORY:
- A setting philosophy or phrase list shapes tone, priorities and wording only. Evidence still comes from today's observation.
- Do not copy an approved example's child, event, wording or facts into today's story.
- If privacy rules are present, follow them conservatively and add an educator check when a rule may apply.

FIELD GUIDANCE:
- storyTitle: a short human title, not cute or poetic.
- story: plain text only. Use clear plain-text sections: Learning Story; What learning we noticed; Curriculum links; Where to next / Responding; and an optional Family link only when useful. Start from the clearest observable action, then explain what learning was noticed. Include a review-ready next response, and end with how the learning can be followed.
- story: for sparse notes, write a shorter story rather than a padded one. Keep every sentence anchored to what the educator recorded. Evidence limits belong in assumptions and educatorChecks, never in the story body. Never invent materials, dialogue, reactions, duration, other children, or educator actions.
- story: if the note describes pushing, hitting, biting, injury, unsafe bodies, or physical conflict, write a careful social learning and safety reflection: no cute title, no praise of the conflict, focus on safe bodies, communication, emotional regulation, repair and educator support.
- Never write "spent time building/playing/exploring" when the notes show a more precise action.
- ${config.outcomesRule}
- curriculumLinks: 1-3 natural curriculum links with why-it-links wording. ${config.linkExample}
- learningSummary: say what learning was visible in simple educator language.
- childVoice: include an exact supplied phrase only if the educator gave quoted wording, otherwise an empty string.
- learningDispositions: examples include curiosity, perseverance, problem solving, confidence, resilience, communication, collaboration, independence, empathy, creativity.
- socialEmotionalLinks: examples include self-regulation, turn-taking, empathy, belonging, confidence with others.
- culturalConnections: include only real or carefully neutral links such as family connection, home language, community, or identity.
- whanauConnection: one short sentence a family could recognise or build on at home.
- assumptions: if detail is missing, name the gap gently rather than inventing it.
- evidenceAnchors: use only details found in the educator's observation.
- educatorChecks: ask the educator to confirm accuracy, local context, or interpretation. Never claim the AI has signed off the story.
- ${config.pedagogyRule}
- frameworkEvidence: briefly explain why each selected ${config.pickerLabel} link fits the observation.
- familyQuestion: ask one open, family-friendly question only when it could deepen understanding.
- followUpPrompt: identify one observable action, strategy, relationship, phrase, or idea to notice next time.
- nextSteps: practical teaching moves, not big theory.

Write the JSON now.`;
}

function storyTexts(result: StoryResult) {
  return [
    result.storyTitle,
    result.story,
    ...result.outcomes,
    ...result.curriculumLinks,
    ...result.frameworkEvidence,
    ...result.pedagogyLinks,
    result.learningSummary,
    result.whanauConnection,
  ];
}

/** Structural checks for a UK or Ireland draft. Pure. */
export function inspectInternationalStory(
  result: StoryResult,
  params: { framework: InternationalFrameworkId; depth: StoryDepth; observations: string },
) {
  const config = INTERNATIONAL_FRAMEWORKS[params.framework];
  const leaks = frameworkLeaks(params.framework, storyTexts(result));
  const quotes = Array.from(params.observations.matchAll(/["“]([^"”]{2,80})["”]/g)).map((m) => m[1].trim());
  const checks = {
    frameworkLinksFit: leaks.length === 0 && config.ownTerms.test([...result.outcomes, ...result.curriculumLinks, result.story].join(" ")),
    noMetaCommentary: getMetaCommentaryIssues(result.story).length === 0,
    noAiDashPunctuation: !result.story.includes("—"),
    requiredSectionsPresent: /What learning we noticed/i.test(result.story) && /Curriculum links/i.test(result.story),
    usefulForDepth: countWords(result.story) >= Math.round(getMinimumStoryWords(params.depth) * 0.6),
    childVoicePreserved: quotes.every((quote) => result.story.includes(quote)),
  };
  return { checks, leaks };
}

function qualityFor(result: StoryResult, params: { framework: InternationalFrameworkId; depth: StoryDepth; observations: string }, revised: boolean) {
  const { checks, leaks } = inspectInternationalStory(result, params);
  const weights: Record<keyof typeof checks, number> = {
    frameworkLinksFit: 30,
    noMetaCommentary: 20,
    noAiDashPunctuation: 10,
    requiredSectionsPresent: 15,
    usefulForDepth: 15,
    childVoicePreserved: 10,
  };
  const score = Math.min(
    (Object.keys(checks) as Array<keyof typeof checks>).reduce((sum, key) => sum + (checks[key] ? weights[key] : 0), 0),
    revised ? 98 : 100,
  );
  const curriculum = INTERNATIONAL_FRAMEWORKS[params.framework].pickerLabel;
  const issueText: Record<keyof typeof checks, string> = {
    frameworkLinksFit: `Check the curriculum links use ${curriculum} and fit what you saw.`,
    noMetaCommentary: "Check for any line that talks about the note instead of the child.",
    noAiDashPunctuation: "Remove any long dashes before sharing.",
    requiredSectionsPresent: "A section may be missing: check the learning, curriculum links and next steps are all there.",
    usefulForDepth: "The draft is short for the depth you chose. Add detail if you have it.",
    childVoicePreserved: "Check the child's words match your note exactly.",
  };
  const issues = [
    ...leaks.map(() => "Uses another country's framework language."),
    ...(Object.keys(checks) as Array<keyof typeof checks>).filter((key) => !checks[key]).map((key) => issueText[key]),
  ];
  return {
    passes: issues.length === 0,
    score,
    revisionCount: revised ? 1 : 0,
    checks,
    issues: Array.from(new Set(issues)).slice(0, 8),
    strengths: [
      checks.noMetaCommentary ? "Every claim stays anchored to what you actually recorded." : "",
      checks.frameworkLinksFit ? `Links to ${INTERNATIONAL_FRAMEWORKS[params.framework].pickerLabel} only where the moment shows it.` : "",
      checks.childVoicePreserved && /["“]/.test(params.observations) ? "The child's own words are kept exactly as you wrote them." : "",
    ].filter(Boolean),
  };
}

/** The local test stack only (no AI key, no spend): a plain, grounded draft. */
function offlineInternationalDraft(observations: string, framework: InternationalFrameworkId, childName?: string): StoryResult {
  const name = childName || "the child";
  const link = framework === "UK" ? "EYFS: Understanding the world" : "Aistear: Exploring and Thinking";
  const story = [
    `${name} at play`,
    "",
    "Learning Story",
    observations.trim(),
    "",
    "What learning we noticed",
    `${name} was investigating and trying out ideas in this moment.`,
    "",
    "Curriculum links",
    `This links with ${link}, as ${name} explored and tested what happened.`,
    "",
    "Where to next / Responding",
    `We will offer more time and materials so ${name} can keep exploring this idea.`,
  ].join("\n");
  return normaliseStoryResult({
    storyTitle: `${name} at play`,
    story,
    outcomes: [link],
    curriculumLinks: [`This links with ${link}.`],
    nextSteps: ["Offer more time and materials to revisit the idea."],
    educatorChecks: ["Check the details match what you saw."],
    evidenceAnchors: [observations.trim().slice(0, 80)],
  });
}

export async function generateInternationalStory(params: {
  observations: string;
  framework: InternationalFrameworkId;
  ageGroup?: string;
  childName?: string;
  tone?: StoryTone;
  depth?: StoryDepth;
  pedagogyFocus?: PedagogyFocus;
  childContext?: string;
  preferences?: StoryPreferences;
  educatorNames?: string[];
}): Promise<StoryResult> {
  const observations = params.observations
    .slice(0, 3000)
    .replace(/ignore (all )?previous/gi, "")
    .replace(/system:/gi, "");
  const tone = normalizeTone(params.tone);
  const depth = normalizeDepth(params.depth ?? params.preferences?.depthPreference);
  const preferences: StoryPreferences = {
    ...(params.preferences ?? {}),
    preferredTone: tone,
    depthPreference: depth,
    pedagogyFocus: params.pedagogyFocus ?? params.preferences?.pedagogyFocus ?? "balanced",
  };
  const userContent = buildInternationalUserMessage({
    observations,
    ageGroup: params.ageGroup,
    childName: params.childName,
    tone,
    framework: params.framework,
    preferences,
    childContext: params.childContext,
    educatorNames: params.educatorNames,
  });
  const qualityParams = { framework: params.framework, depth, observations };

  try {
    let draft = normaliseStoryResult(parseJSON<StoryResult>(await callAI(LEARNING_STORY_PROMPT, userContent)));
    let revised = false;
    const first = inspectInternationalStory(draft, qualityParams);
    // One rewrite, only when the draft named the wrong country's framework or
    // left out the required sections. Never more: an educator is waiting.
    if (first.leaks.length > 0 || !first.checks.requiredSectionsPresent) {
      const config = INTERNATIONAL_FRAMEWORKS[params.framework];
      const fix = `${userContent}\n\nREWRITE REQUIRED: the previous draft ${first.leaks.length ? "used another country's framework language" : "missed a required section"}. Use ${config.pickerLabel} (${config.label}) wording only, keep the same facts, and include every section.`;
      try {
        draft = normaliseStoryResult(parseJSON<StoryResult>(await callAI(LEARNING_STORY_PROMPT, fix, { timeoutMs: 30_000 })));
        revised = true;
      } catch {
        // Keep the first draft; its quality notes tell the educator what to check.
      }
    }
    return {
      ...draft,
      storyQuality: qualityFor(draft, qualityParams, revised),
      privacyGuardian: runPrivacyGuardian({ observation: observations, story: draft.story }),
    };
  } catch (error) {
    if (!offlineWriterAllowed()) {
      console.error("International story generation failed, AI unavailable:", error);
      throw new StoryWriterUnavailableError(aiFailureReason(error), error);
    }
    const fallback = offlineInternationalDraft(observations, params.framework, params.childName);
    return {
      ...fallback,
      storyQuality: qualityFor(fallback, qualityParams, false),
      privacyGuardian: runPrivacyGuardian({ observation: observations, story: fallback.story }),
      aiUnavailable: aiFailureReason(error),
    };
  }
}
