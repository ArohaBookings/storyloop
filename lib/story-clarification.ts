import { getObservationReadiness } from "@/lib/observation-coach";
import { hasPhysicalSafetyIncident } from "@/lib/safety-incident";

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

const PRETEND_CONTEXT = /\b(pretend|role[- ]?play|make[- ]?believe|acting|game|imaginary|not real|dramatic play)\b/i;
const EDUCATOR_RESPONSE = /\b(educator|teacher|kaiako|we|i)\s+(supported|helped|moved|separated|checked|comforted|named|guided|sat|talked|asked|modelled|modeled|reminded|responded|stayed)\b/i;
const SAFETY_CONTEXT = /\b(hurt|upset|cried|crying|unsafe|not safe|unacceptable|incident|injury|rough|angry|scared|stop|no\b|didn'?t like|did not like)\b/i;
const VAGUE_PLAY = /\b(played|had fun|did activity|was good|enjoyed|spent time|joined in|was engaged)\b/i;

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function childLabel(childName?: string | null) {
  const clean = childName?.trim();
  return clean || "the child";
}

function uniqueQuestions(questions: string[]) {
  return Array.from(new Set(questions.map((question) => question.trim()).filter(Boolean))).slice(0, 3);
}

export function getStoryClarification(input: ClarificationInput): StoryClarificationResult {
  const observations = input.observations.replace(/\s+/g, " ").trim();
  const child = childLabel(input.childName);

  if (!observations || observations.length < 10) {
    return {
      needsClarification: true,
      kind: "thin_observation",
      reason: "The observation is too short to create a useful learning story.",
      questions: uniqueQuestions([
        `What exactly did ${child} do, say, choose, or change?`,
        "Where did it happen, and what materials or people were involved?",
        "What did you or another educator do to support the moment?",
      ]),
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
        "Was this pretend play or a real incident/conflict?",
        "Was anyone hurt or upset, and what did the educator do immediately?",
        "What exact words or actions were observed before and after the unsafe behaviour?",
      ]),
    };
  }

  const readiness = getObservationReadiness(observations);
  const words = wordCount(observations);
  const vague = VAGUE_PLAY.test(observations) && readiness.found <= 2;

  if ((words < 18 && readiness.found <= 2) || vague) {
    return {
      needsClarification: true,
      kind: "thin_observation",
      reason: "The note has a starting point, but it needs one or two real details before StoryLoop can write a useful educator-ready story.",
      questions: uniqueQuestions([
        `What exactly did ${child} do, say, choose, test, or change?`,
        "Where did this happen, and what materials or people were involved?",
        "What learning or response do you want the story to focus on?",
      ]),
    };
  }

  return {
    needsClarification: false,
    kind: "ready",
    reason: "",
    questions: [],
  };
}
