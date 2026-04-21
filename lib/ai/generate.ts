import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { LEARNING_STORY_PROMPT, buildUserMessage } from "./prompts";

export interface StoryResult {
  story: string;
  outcomes: string[];
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

export async function generateLearningStory(params: {
  observations: string;
  ageGroup?: string;
  childName?: string;
  tone?: "warm" | "concise" | "reflective";
  location?: "AU" | "NZ";
}): Promise<StoryResult> {
  // Sanitise against prompt injection
  const observations = params.observations.slice(0, 3000).replace(/ignore (all )?previous/gi, "").replace(/system:/gi, "");

  const userContent = buildUserMessage(observations, params.ageGroup, params.childName, params.tone, params.location);
  const result = await callAI(LEARNING_STORY_PROMPT, userContent);
  return parseJSON<StoryResult>(result);
}
