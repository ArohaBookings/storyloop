import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { LEARNING_STORY_PROMPT, buildUserMessage } from "./prompts";
import {
  mergeStoryPreferences,
  normalizeFramework,
  normalizeTone,
  type StoryFrameworkId,
  type StoryMetadata,
  type StoryPreferences,
  type StoryTone,
} from "@/lib/story-options";

export interface StoryResult extends StoryMetadata {
  story: string;
  outcomes: string[];
  learningSummary: string;
  childAge: string;
  nextSteps: string[];
  wordCount: number;
}

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

function normaliseStoryResult(result: Partial<StoryResult>): StoryResult {
  const story = typeof result.story === "string" ? result.story.trim() : "";
  const learningSummary =
    typeof result.learningSummary === "string" && result.learningSummary.trim()
      ? result.learningSummary.trim()
      : "Learning is visible through the child's actions, choices, and responses in this moment.";
  const whanauConnection =
    typeof result.whanauConnection === "string" && result.whanauConnection.trim()
      ? result.whanauConnection.trim()
      : "This is a moment families can build on by talking about the same ideas and interests together.";

  return {
    story,
    outcomes: toShortStringArray(result.outcomes, 4),
    learningSummary,
    learningDispositions: toShortStringArray(result.learningDispositions, 4),
    socialEmotionalLinks: toShortStringArray(result.socialEmotionalLinks, 4),
    culturalConnections: toShortStringArray(result.culturalConnections, 4),
    whanauConnection,
    childAge: typeof result.childAge === "string" && result.childAge.trim() ? result.childAge.trim() : "Not stated",
    nextSteps: toShortStringArray(result.nextSteps, 4),
    wordCount:
      typeof result.wordCount === "number" && Number.isFinite(result.wordCount)
        ? result.wordCount
        : story.split(/\s+/).filter(Boolean).length,
  };
}

export async function generateLearningStory(params: {
  observations: string;
  ageGroup?: string;
  childName?: string;
  tone?: StoryTone;
  framework?: StoryFrameworkId;
  preferences?: StoryPreferences;
}): Promise<StoryResult> {
  const observations = params.observations
    .slice(0, 3000)
    .replace(/ignore (all )?previous/gi, "")
    .replace(/system:/gi, "");

  const tone = normalizeTone(params.tone);
  const framework = normalizeFramework(params.framework);
  const preferences = mergeStoryPreferences(params.preferences);

  const userContent = buildUserMessage(
    observations,
    params.ageGroup,
    params.childName,
    tone,
    framework,
    preferences
  );
  const result = await callAI(LEARNING_STORY_PROMPT, userContent);
  return normaliseStoryResult(parseJSON<StoryResult>(result));
}
