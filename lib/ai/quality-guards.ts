import type { StoryDepth, StoryFrameworkId } from "@/lib/story-options";
export { hasPhysicalSafetyIncident } from "@/lib/safety-incident";

export type FrameworkGuardStoryResult = {
  storyTitle?: string;
  story: string;
  outcomes: string[];
  curriculumLinks: string[];
  learningSummary: string;
  childVoice: string;
  learningDispositions: string[];
  socialEmotionalLinks: string[];
  culturalConnections: string[];
  whanauConnection: string;
  assumptions: string[];
  evidenceAnchors: string[];
  educatorChecks: string[];
  pedagogyLinks: string[];
  frameworkEvidence: string[];
  parentFriendlyVersion?: string;
  familyQuestion: string;
  followUpPrompt: string;
  childAge?: string;
  nextSteps: string[];
  wordCount: number;
};

export function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function getMinimumStoryWords(depth: StoryDepth) {
  if (depth === "detailed") return 430;
  if (depth === "concise") return 160;
  return 280;
}

function normaliseEvidenceText(text: string) {
  return text
    .toLowerCase()
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9āēīōū'\" ]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceTokens(text: string) {
  return normaliseEvidenceText(text)
    .replace(/['"]/g, "")
    .split(" ")
    .filter(Boolean);
}

// Small edit-distance check so a quote still counts as supported when the
// model has normalised spelling ("watta" -> "water", "whos" -> "whose").
// Bounded early exit keeps it cheap; quotes are short.
function withinEditDistance(a: string, b: string, max: number) {
  if (Math.abs(a.length - b.length) > max) return false;
  const previous = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
      diagonal = previous[j];
      previous[j] = next;
      if (next < rowMin) rowMin = next;
    }
    if (rowMin > max) return false;
  }
  return previous[b.length] <= max;
}

// A quote is "supported" when nearly all of its words trace back to the
// observation. Exact substring matching punished the model for fixing the
// educator's typos inside a real quote ("whos" -> "whose"), which flagged
// genuinely supplied quotes as fabricated. Word-overlap with light per-token
// fuzziness survives spelling cleanup ("watta" -> "water", "bigga" ->
// "bigger") while whole invented sentences, full of words the educator never
// wrote, still fail the threshold.
function tokenIsSupported(observationTokens: Set<string>, token: string) {
  if (observationTokens.has(token)) return true;
  if (token.length < 4) return false;
  for (const candidate of observationTokens) {
    if (candidate.length < 4 || candidate[0] !== token[0]) continue;
    if (withinEditDistance(token, candidate, 2)) return true;
  }
  return false;
}

function quoteIsSupported(observationTokens: Set<string>, quote: string) {
  const tokens = evidenceTokens(quote);
  if (tokens.length === 0) return true;
  const matched = tokens.filter((token) => tokenIsSupported(observationTokens, token)).length;
  return matched / tokens.length >= 0.8;
}

// Quotes introduced as suggested or interpretive language are pedagogy advice,
// not reported speech: "we can model, 'your turn, my turn'", "ways of saying,
// 'I am here'". Flagging those as fabrication was failing the week's best
// stories, so anything framed this way in the preceding clause is exempt.
const SUGGESTED_QUOTE_FRAMING =
  /\b(such as|for example|for instance|might say|could say|ways? of saying|as if to say|as if|beginning to (?:know|understand|learn)|naming|we (?:can|could|will|might) (?:model|say|use|offer|try|name|practise|practice|ask)|model(?:ling|ing)?|practis(?:e|ing)|practic(?:e|ing)|prompts? (?:like|such as)|questions? (?:like|such as)|language (?:like|such as)|words (?:like|such as)|phrases? (?:like|such as))\b[^.!?]{0,60}$/i;

// The one reliable fabrication signal worth rejecting a draft over: an exact,
// multi-word quote the educator never wrote (an invented child sentence).
//
// We deliberately do NOT flag interpretive vocabulary ("customer", "cashier",
// "asked", "smiled", "upset", "frustrated", "friend"). A frontier writer using
// that language on a short note is interpreting, not fabricating — and flagging
// it was silently rejecting genuinely strong drafts and replacing them with a
// rigid template (the real "not good enough" problem). Junk input is already
// stopped upstream by the clarification gate, and the prompt forbids invention.
//
// Short quoted words (1-3 words) are usually educator-suggested phrases ("stop",
// "I need space") or framework labels, so only quotes of 4+ words are checked.
export function getUnsupportedStoryDetails(result: FrameworkGuardStoryResult, observations: string) {
  const observationTokens = new Set(evidenceTokens(observations));
  const issues: string[] = [];
  let previousExemptEnd = -1;

  for (const match of result.story.matchAll(/[“"]([^"”]{2,160})[”"]/g)) {
    const quote = match[1]?.trim();
    if (!quote) continue;
    const start = match.index ?? 0;
    const leadIn = result.story.slice(Math.max(0, start - 140), start);
    // Suggested phrases often come as a list: such as "Q1?" "Q2?" and "Q3?".
    // A quote joined to an exempt one by a bare connector shares its framing.
    const connector = previousExemptEnd >= 0 ? result.story.slice(previousExemptEnd, start) : null;
    const chained = connector !== null && /^[\s,;]*(?:and|or)?[\s,;]*$/i.test(connector) && connector.length <= 20;
    const framedAsSuggestion = SUGGESTED_QUOTE_FRAMING.test(leadIn) || chained;
    if (framedAsSuggestion) {
      previousExemptEnd = start + match[0].length;
      continue;
    }
    previousExemptEnd = -1;
    if (quote.split(/\s+/).filter(Boolean).length < 4) continue;
    if (!quoteIsSupported(observationTokens, quote)) {
      issues.push(`Unsupported child quote or exact wording: "${quote}"`);
    }
  }

  return Array.from(new Set(issues)).slice(0, 12);
}

const QUALITY_NOTE_LABELS: Record<string, string> = {
  naturalEducatorTone: "The draft uses a natural educator tone.",
  childVoiceSupported: "Child voice is only used when the observation supports it.",
  learningDispositionsVisible: "Learning dispositions are visible and evidence-led.",
  workingTheoriesWhenRelevant: "Working theories are used only when relevant.",
  frameworkLinksFit: "Curriculum links fit the selected framework and the evidence.",
  respondingNextStepsPractical: "Responding and next steps are practical.",
  notGeneric: "The wording is specific rather than generic.",
  notPoetic: "The tone avoids poetic or sentimental language.",
  notAISounding: "The draft does not read like generic AI copy.",
  noMetaCommentary: "The story avoids draft-review commentary.",
  educatorVoice: "The story uses educator or centre voice.",
  preciseObservedActions: "Observed actions are described precisely.",
  noInventedDetails: "The draft avoids invented details.",
  noUnsupportedSpecifics: "The draft avoids unsupported exact quotes or specific details.",
  evidenceToLearningClear: "The link between evidence and learning is clear.",
  familyReadable: "The story is readable for families.",
  usefulForDepth: "The story has enough substance for the selected depth.",
};

export function humaniseQualityNote(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (QUALITY_NOTE_LABELS[trimmed]) return QUALITY_NOTE_LABELS[trimmed];
  const spaced = trimmed
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  if (!spaced) return "";
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
}

export const NZ_FRAMEWORK_PATTERN =
  /\b(Te Wh[aā]riki|Mana atua|Mana whenua|Mana tangata|Mana reo|Mana aot[uū]roa|K[ōo]whiti|wh[aā]nau|kaiako|tamariki|mokopuna|Aotearoa)\b/i;
export const AU_FRAMEWORK_PATTERN =
  /\b(EYLF|Early Years Learning Framework|Outcome [1-5]: Children|Outcome [1-5] — Children|Outcome [1-5] - Children)\b/i;

export function resultHasFrameworkLeak(result: FrameworkGuardStoryResult, framework: StoryFrameworkId) {
  const text = [
    result.story,
    result.outcomes.join("\n"),
    result.curriculumLinks.join("\n"),
    result.learningSummary,
    result.childVoice,
    result.learningDispositions.join("\n"),
    result.socialEmotionalLinks.join("\n"),
    result.culturalConnections.join("\n"),
    result.whanauConnection,
    result.assumptions.join("\n"),
    result.evidenceAnchors.join("\n"),
    result.educatorChecks.join("\n"),
    result.pedagogyLinks.join("\n"),
    result.frameworkEvidence.join("\n"),
    result.familyQuestion,
    result.followUpPrompt,
    result.nextSteps.join("\n"),
  ].join("\n");
  return framework === "AU" ? NZ_FRAMEWORK_PATTERN.test(text) : AU_FRAMEWORK_PATTERN.test(text);
}

function preserveInitialCase(source: string, replacement: string) {
  return source[0] === source[0]?.toUpperCase()
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

function localiseSpelling(text: string) {
  return text
    // Em dashes read as AI-written; swap for a comma so stories look human.
    .replace(/\s*—\s*/g, ", ")
    .replace(/,\s*,/g, ",")
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

function replaceNzOnlyLanguage(text: string) {
  return text
    .replace(/\bTe Wh[aā]riki\b/gi, "EYLF")
    .replace(/\bMana aot[uū]roa\s*\|\s*Exploration\b/gi, "EYLF Outcome 4")
    .replace(/\bMana reo\s*\|\s*Communication\b/gi, "EYLF Outcome 5")
    .replace(/\bMana tangata\s*\|\s*Contribution\b/gi, "EYLF Outcome 2")
    .replace(/\bMana whenua\s*\|\s*Belonging\b/gi, "EYLF Outcome 1")
    .replace(/\bMana atua\s*\|\s*Wellbeing\b/gi, "EYLF Outcome 3")
    .replace(/\bK[ōo]whiti Whakapae\b/gi, "the selected pedagogy focus")
    .replace(/\bwh[aā]nau\b/gi, "family")
    .replace(/\bkaiako\b/gi, "educator")
    .replace(/\btamariki\b/gi, "children")
    .replace(/\bmokopuna\b/gi, "child")
    .replace(/\bte reo M[aā]ori\b/gi, "home language")
    .replace(/\bAotearoa New Zealand\b/gi, "Australia")
    .replace(/\bAotearoa\b/gi, "Australia");
}

function replaceAuOnlyLanguage(text: string) {
  return text
    .replace(/\bEarly Years Learning Framework\b/gi, "Te Whāriki")
    .replace(/\bEYLF V?2\.0\b/gi, "Te Whāriki")
    .replace(/\bEYLF\b/gi, "Te Whāriki")
    .replace(/\bOutcome 4: Children are confident and involved learners\b/gi, "Mana aotūroa | Exploration")
    .replace(/\bOutcome 5: Children are effective communicators\b/gi, "Mana reo | Communication")
    .replace(/\bOutcome 2: Children are connected with and contribute to their world\b/gi, "Mana tangata | Contribution")
    .replace(/\bOutcome 1: Children have a strong sense of identity\b/gi, "Mana whenua | Belonging")
    .replace(/\bOutcome 3: Children have a strong sense of wellbeing\b/gi, "Mana atua | Wellbeing");
}

function cleanFrameworkArray(values: string[], framework: StoryFrameworkId) {
  const replace = framework === "AU" ? replaceNzOnlyLanguage : replaceAuOnlyLanguage;
  const leakPattern = framework === "AU" ? NZ_FRAMEWORK_PATTERN : AU_FRAMEWORK_PATTERN;
  return localiseStringArray(
    values
      .map((item) => replace(item).trim())
      .filter((item) => item && !leakPattern.test(item))
  );
}

function normaliseAuOutcomeLabel(value: string) {
  return value.replace(/^Outcome ([1-5])\b/i, "EYLF Outcome $1");
}

function getFallbackOutcomes(framework: StoryFrameworkId) {
  return framework === "NZ"
    ? ["Mana aotūroa | Exploration", "Mana reo | Communication"]
    : [
        "EYLF Outcome 4: Children are confident and involved learners",
        "EYLF Outcome 5: Children are effective communicators",
      ];
}

function getFallbackCurriculumLinks(framework: StoryFrameworkId) {
  return framework === "NZ"
    ? [
        "This links with Mana aotūroa | Exploration because the child was using play to explore an idea, make choices, and build understanding from the moment observed.",
        "This links with Mana reo | Communication when the observation includes sounds, gestures, words, pretend roles, or shared meaning.",
      ]
    : [
        "This links with EYLF Outcome 4 because the child was using play to explore an idea, make choices, and build understanding from the moment observed.",
        "This links with EYLF Outcome 5 when the observation includes sounds, gestures, words, pretend roles, or shared meaning.",
      ];
}

function getFallbackFrameworkEvidence(framework: StoryFrameworkId) {
  return framework === "NZ"
    ? [
        "The selected Te Whāriki links are based on the visible play, exploration, communication, and choices in the observation.",
      ]
    : [
        "The selected EYLF links are based on the visible play, exploration, communication, and choices in the observation.",
      ];
}

export function enforceFrameworkForResult<T extends FrameworkGuardStoryResult>(
  result: T,
  framework: StoryFrameworkId
): T {
  const hadLeak = resultHasFrameworkLeak(result, framework);
  const replace = framework === "AU" ? replaceNzOnlyLanguage : replaceAuOnlyLanguage;
  const frameworkPattern = framework === "AU" ? NZ_FRAMEWORK_PATTERN : AU_FRAMEWORK_PATTERN;
  const cleanedOutcomes = cleanFrameworkArray(result.outcomes, framework).map((item) =>
    framework === "AU" ? normaliseAuOutcomeLabel(item) : item
  );
  const cleanedCurriculumLinks = cleanFrameworkArray(result.curriculumLinks, framework);
  const cleanedFrameworkEvidence = cleanFrameworkArray(result.frameworkEvidence, framework);
  const story = localiseSpelling(replace(result.story));
  const nextSteps = cleanFrameworkArray(result.nextSteps, framework);
  const educatorChecks = cleanFrameworkArray(result.educatorChecks, framework);
  const frameworkCheck =
    framework === "NZ"
      ? "Confirm the Te Whāriki links match the local curriculum and the details you observed."
      : "Confirm the EYLF links match the observation and your service context before sharing.";
  const needsFallbackOutcomes =
    cleanedOutcomes.length === 0 ||
    (framework === "AU" && cleanedOutcomes.some((item) => !/\bEYLF Outcome\b/i.test(item))) ||
    cleanedOutcomes.some((item) => frameworkPattern.test(item));
  const needsFallbackLinks =
    cleanedCurriculumLinks.length === 0 || cleanedCurriculumLinks.some((item) => frameworkPattern.test(item));
  const needsFallbackEvidence =
    cleanedFrameworkEvidence.length === 0 || cleanedFrameworkEvidence.some((item) => frameworkPattern.test(item));

  return {
    ...result,
    story,
    outcomes: needsFallbackOutcomes ? getFallbackOutcomes(framework) : cleanedOutcomes,
    curriculumLinks: needsFallbackLinks ? getFallbackCurriculumLinks(framework) : cleanedCurriculumLinks,
    learningSummary: localiseSpelling(replace(result.learningSummary)),
    childVoice: localiseSpelling(replace(result.childVoice)),
    learningDispositions: cleanFrameworkArray(result.learningDispositions, framework),
    socialEmotionalLinks: cleanFrameworkArray(result.socialEmotionalLinks, framework),
    culturalConnections: cleanFrameworkArray(result.culturalConnections, framework),
    whanauConnection: localiseSpelling(replace(result.whanauConnection)),
    assumptions: cleanFrameworkArray(result.assumptions, framework),
    evidenceAnchors: cleanFrameworkArray(result.evidenceAnchors, framework),
    educatorChecks: Array.from(new Set([...educatorChecks, ...(hadLeak ? [frameworkCheck] : [])])).slice(0, 4),
    pedagogyLinks: cleanFrameworkArray(result.pedagogyLinks, framework),
    frameworkEvidence: needsFallbackEvidence ? getFallbackFrameworkEvidence(framework) : cleanedFrameworkEvidence,
    parentFriendlyVersion:
      typeof result.parentFriendlyVersion === "string" ? localiseSpelling(replace(result.parentFriendlyVersion)) : undefined,
    familyQuestion: localiseSpelling(replace(result.familyQuestion)),
    followUpPrompt: localiseSpelling(replace(result.followUpPrompt)),
    nextSteps: nextSteps.length > 0 ? nextSteps : result.nextSteps,
    wordCount: countWords(story),
  };
}
