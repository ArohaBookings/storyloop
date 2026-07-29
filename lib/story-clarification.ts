import { getObservationReadiness } from "@/lib/observation-coach";
import { hasPhysicalSafetyIncident } from "@/lib/safety-incident";
import { extractOtherChildNames } from "@/lib/story-context";

type ClarificationInput = {
  observations: string;
  childName?: string | null;
};

export type StoryClarificationResult = {
  needsClarification: boolean;
  reason: string;
  questions: string[];
  kind: "safety_review" | "thin_observation" | "ready";
};

export const MIN_STORY_OBSERVATION_CHARACTERS = 5;

const PRETEND_CONTEXT = /\b(pretend|role[- ]?play|make[- ]?believe|acting|game|imaginary|not real|dramatic play)\b/i;
const EDUCATOR_RESPONSE = /\b(educator|teacher|kaiako|we|i)\s+(supported|helped|moved|separated|checked|comforted|named|guided|sat|talked|asked|modelled|modeled|reminded|responded|stayed|stopped|intervened)\b/i;
const SAFETY_CONTEXT = /\b(hurt|upset|cried|crying|unsafe|not safe|unacceptable|incident|injury|rough|angry|scared|stop|no\b|didn'?t like|did not like)\b/i;
const VAGUE_PLAY = /\b(played|had fun|did activity|was good|enjoyed|spent time|joined in|was engaged)\b/i;
const OTHER_CHILDREN = /\b(kids|children|tamariki|friends?|peers?|group)\b/i;
const ACTIVITY_HINTS = [
  { pattern: /\bhide\s*(?:and|&)\s*seek\b/i, label: "hide and seek" },
  { pattern: /\bshop(?:ping|keeper|keepers)?\b/i, label: "shopping" },
  { pattern: /\bplayground\b/i, label: "playground play" },
  { pattern: /\b(outside|outdoor|park|garden)\b/i, label: "outdoor play" },
  { pattern: /\b(paint|painting|painted|draw|drawing|collage|art)\b/i, label: "the art experience" },
  { pattern: /\b(blocks?|tower|construction|built|building)\b/i, label: "the building" },
  { pattern: /\b(water|float|sink|pour|splash)\b/i, label: "the water play" },
  { pattern: /\b(sand|sandpit|bucket|spade)\b/i, label: "the sand play" },
  { pattern: /\b(book|story|read|reading)\b/i, label: "the book or story" },
  { pattern: /\b(music|song|sing|dance|dancing)\b/i, label: "the music experience" },
  { pattern: /\b(pretend|role[- ]?play|make[- ]?believe|dramatic play)\b/i, label: "the pretend play" },
  { pattern: /\b(climb|climbing|jump|jumping|bike|trike|scooter|swing|slide)\b/i, label: "the physical play" },
] as const;

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function childLabel(observations: string, childName?: string | null) {
  const clean = childName?.trim();
  if (clean) return clean;
  return OTHER_CHILDREN.test(observations) ? "the children" : "the child";
}

function uniqueQuestions(questions: string[]) {
  return Array.from(new Set(questions.map((question) => question.trim()).filter(Boolean))).slice(0, 3);
}

function readableList(values: string[]) {
  if (values.length <= 1) return values[0] ?? "the moment";
  if (values.length === 2) return `${values[0]} or ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, or ${values.at(-1)}`;
}

function thinObservationQuestions(observations: string, child: string, hasEducatorResponse: boolean) {
  const readiness = getObservationReadiness(observations);
  const activities = ACTIVITY_HINTS
    .filter((hint) => hint.pattern.test(observations))
    .map((hint) => hint.label)
    .slice(0, 3);
  const peers = extractOtherChildNames(observations, child, 2);
  const questions = [
    activities.length
      ? `What did ${child} do, say, choose, or notice during ${readableList(activities)}?`
      : `What did ${child} do, say, choose, try, or notice that stood out?`,
  ];

  if (peers.length > 0) {
    questions.push(`What happened between ${child} and ${readableList(peers)} during that moment?`);
  } else if (OTHER_CHILDREN.test(observations)) {
    questions.push(`How did ${child} join or respond to the other children?`);
  } else if (!readiness.signals.some((signal) => signal.id === "context" && signal.found)) {
    questions.push(`Where did this happen, and what was ${child} using or exploring?`);
  }

  if (!hasEducatorResponse) {
    questions.push("What, if anything, did an educator notice, say, or do next?");
  }

  return uniqueQuestions(questions);
}

export function getStoryClarification(input: ClarificationInput): StoryClarificationResult {
  const observations = input.observations.replace(/\s+/g, " ").trim();
  const child = childLabel(observations, input.childName);

  if (!observations || observations.length < MIN_STORY_OBSERVATION_CHARACTERS) {
    return {
      needsClarification: true,
      kind: "thin_observation",
      reason: "There is not yet a complete moment to anchor the draft. Add anything you remember, or write with what you have and StoryLoop will name the gaps honestly.",
      questions: thinObservationQuestions(observations, child, false),
    };
  }

  const safetyIncident = hasPhysicalSafetyIncident(observations);
  const hasPretendSignal = PRETEND_CONTEXT.test(observations);
  const hasEducatorResponse = EDUCATOR_RESPONSE.test(observations);
  const hasSafetyContext = SAFETY_CONTEXT.test(observations);

  if (safetyIncident && (!hasPretendSignal || hasSafetyContext) && !hasEducatorResponse) {
    return {
      needsClarification: true,
      kind: "safety_review",
      reason: "This may be pretend play, social conflict, behaviour documentation, or an incident depending on what actually happened.",
      questions: uniqueQuestions([
        "Was this pretend play or a real conflict/incident?",
        "Was anyone hurt or upset, and what did you or another educator do immediately?",
        "What words, gestures, or actions happened before and after the unsafe behaviour?",
      ]),
    };
  }

  const readiness = getObservationReadiness(observations);
  const words = wordCount(observations);
  // Keep friction low: the frontier writer + evidence-honest prompt handle
  // moderate and brief notes well. Only offer clarification when there is
  // almost no observable evidence; educators can still choose to draft from
  // exactly what they have.
  const vague = VAGUE_PLAY.test(observations) && readiness.found <= 1;
  const veryShort = words < 7 && readiness.found <= 1;
  const unsupportedVague = vague && words < 10;
  const noEvidence = readiness.found === 0 && words < 10;

  if (veryShort || unsupportedVague || noEvidence) {
    return {
      needsClarification: true,
      kind: "thin_observation",
      reason: "This is a brief starting note. One optional detail could make the draft more specific, or StoryLoop can write carefully from exactly what is here.",
      questions: thinObservationQuestions(observations, child, hasEducatorResponse),
    };
  }

  return {
    needsClarification: false,
    kind: "ready",
    reason: "",
    questions: [],
  };
}
