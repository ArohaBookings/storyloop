import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { StoryFrameworkId } from "@/lib/story-options";

// Quill runs on a fast model — small, interactive turns, not full stories.
const ASSISTANT_MODEL = process.env.OPENAI_ASSISTANT_MODEL?.trim() || "gpt-5.4-mini";

function usesReasoningContract(model: string) {
  return /^(gpt-5|o\d)/i.test(model);
}

// Em dashes are a well-known "written by AI" tell. Quill never uses them, and
// we strip any that slip through so everything reads human-written.
export function stripEmDashes(text: string) {
  return text
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s*,\s*,\s*/g, ", ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

// What Quill knows. Kept tight so it steers without bloating latency.
const QUILL_KNOWLEDGE = `You are an experienced early childhood teaching colleague in Australia and Aotearoa New Zealand.

You know the frameworks deeply:
- Te Whāriki (NZ): principles (whakamana/empowerment, kotahitanga/holistic, whānau tangata/family and community, ngā hononga/relationships); strands Mana atua | Wellbeing, Mana whenua | Belonging, Mana tangata | Contribution, Mana reo | Communication, Mana aotūroa | Exploration; learning outcomes, working theories, learning dispositions; kaiako, tamariki, whānau.
- EYLF (Australia, V2.0): outcomes 1 identity, 2 connected and contribute, 3 wellbeing, 4 confident and involved learners, 5 effective communicators; principles and practices; Belonging, Being, Becoming.
- Good learning stories are strengths-based, grounded in what was actually observed, in the child's and educator's real voice, with curriculum links only where the evidence supports them, plus a practical next step and a family connection.

You write and speak like a warm, plain-spoken educator. Never gushy, never academic, never corporate. Never use em dashes.`;

function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function callModel(systemPrompt: string, userContent: string, maxTokens = 3200): Promise<string> {
  if (hasOpenAIKey()) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 40_000, maxRetries: 1 });
      const messages = [
        { role: "system" as const, content: systemPrompt },
        { role: "user" as const, content: userContent },
      ];
      const params = usesReasoningContract(ASSISTANT_MODEL)
        ? { model: ASSISTANT_MODEL, max_completion_tokens: maxTokens, reasoning_effort: "low", response_format: { type: "json_object" as const }, messages }
        : { model: ASSISTANT_MODEL, max_tokens: maxTokens, temperature: 0.4, response_format: { type: "json_object" as const }, messages };
      const res = await client.chat.completions.create(params as Parameters<typeof client.chat.completions.create>[0]);
      const content = "choices" in res ? res.choices[0]?.message?.content ?? "" : "";
      if (content.trim()) return content;
    } catch (e) {
      console.error("Quill OpenAI call failed, falling back:", e);
    }
  }
  if (process.env.ANTHROPIC_API_KEY) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 40_000, maxRetries: 1 });
    const msg = await client.messages.create({
      model: process.env.ANTHROPIC_STORY_MODEL?.trim() || "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt + "\n\nReturn ONLY valid JSON. No markdown or code fences.",
      messages: [{ role: "user", content: userContent }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text : "";
    return text.replace(/```json\n?|```/g, "").trim();
  }
  throw new Error("No AI API key configured for Quill.");
}

function parseJson<T>(raw: string): T {
  const clean = raw.replace(/```json\n?|```/g, "").trim();
  const match = clean.match(/\{[\s\S]*\}/);
  return JSON.parse(match ? match[0] : clean) as T;
}

// ---- Inline edit (highlight a passage, say what to change) -------------------

const EDIT_PROMPT = `${QUILL_KNOWLEDGE}

You are Quill, helping the educator polish their own learning story. You receive the FULL story, a SELECTED passage they highlighted, and their instruction.

Rules:
- Change ONLY what the instruction asks, within the selected passage (extend a little into the surrounding sentence only if needed to read naturally).
- Keep the rest of the story EXACTLY as written. Do not rewrite, reorder, re-title, summarise, or delete any other part.
- Do the educator's request faithfully: add detail, expand, shorten, soften, reword, or fix the selection. If they ask to add something specific, add exactly that and nothing more.
- Do not invent new facts about the child beyond what the educator asked for.
- Keep the educator's voice and the story's framework. Match the tone of the sentences around the selection.
- Re-read the whole story and make sure the edited passage flows with the sentence before and after it, and nothing now repeats or contradicts.
- Write plainly and human. No em dashes.

Return ONLY valid JSON: { "story": "the complete story with only the requested change applied", "summary": "one short plain sentence describing what you changed" }`;

export type QuillRefinement = { story: string; summary: string };

export async function refineStorySection(params: {
  story: string;
  selection: string;
  instruction: string;
  framework?: StoryFrameworkId;
  childName?: string | null;
}): Promise<QuillRefinement> {
  const raw = await callModel(
    EDIT_PROMPT,
    JSON.stringify({
      framework: params.framework === "NZ" ? "Te Whāriki (NZ)" : "EYLF (Australia)",
      childName: params.childName ?? "",
      instruction: params.instruction.slice(0, 500),
      selection: params.selection.slice(0, 2000),
      fullStory: params.story.slice(0, 8000),
    }),
    4000
  );
  const parsed = parseJson<{ story?: string; summary?: string }>(raw);
  const story = typeof parsed.story === "string" ? stripEmDashes(parsed.story) : "";
  const summary = typeof parsed.summary === "string" ? stripEmDashes(parsed.summary) : "Updated the highlighted part.";
  if (!story || story.length < params.story.length * 0.5) {
    throw new Error("Quill did not return a valid edit.");
  }
  return { story, summary };
}

// ---- Conversation (ask Quill for advice or a change) ------------------------

const CHAT_PROMPT = `${QUILL_KNOWLEDGE}

You are Quill, a warm, expert teaching colleague chatting with the educator about their learning story. You can see the full story, the child, the framework, any passage they highlighted, and short context from the child's earlier stories.

How to reply:
- Talk in plain English, like a knowledgeable, friendly colleague. Keep replies short and useful. Only go longer when the question genuinely needs it.
- Understand what they mean even if phrased loosely, the way a good assistant would.
- If they ask for ADVICE, a QUESTION, or feedback, just answer helpfully in "reply" and set "edit" to null.
- If they ask you to CHANGE, add to, shorten, or fix the story, make the smallest change that does what they asked. Keep the rest of the story exactly the same. Put the complete updated story in "edit.story", a one-line plain description in "edit.summary", and a short friendly confirmation in "reply".
- If they highlighted a passage, focus your change there.
- Never invent facts about the child that the educator did not give you. Never use em dashes.

Return ONLY valid JSON: { "reply": "your short plain-English message", "edit": { "story": "full updated story", "summary": "what changed" } | null }`;

export type QuillChatTurn = { role: "user" | "assistant"; content: string };
export type QuillChatResult = { reply: string; edit: QuillRefinement | null };

export async function chatWithQuill(params: {
  story: string;
  message: string;
  history?: QuillChatTurn[];
  selection?: string;
  framework?: StoryFrameworkId;
  childName?: string | null;
  childContext?: string;
}): Promise<QuillChatResult> {
  const raw = await callModel(
    CHAT_PROMPT,
    JSON.stringify({
      framework: params.framework === "NZ" ? "Te Whāriki (NZ)" : "EYLF (Australia)",
      childName: params.childName ?? "",
      childContext: params.childContext?.slice(0, 1200) ?? "",
      highlightedSelection: params.selection?.slice(0, 1500) ?? "",
      recentMessages: (params.history ?? []).slice(-6),
      educatorMessage: params.message.slice(0, 1000),
      fullStory: params.story.slice(0, 8000),
    }),
    4000
  );
  const parsed = parseJson<{ reply?: string; edit?: { story?: string; summary?: string } | null }>(raw);
  const reply = stripEmDashes(typeof parsed.reply === "string" ? parsed.reply : "");
  let edit: QuillRefinement | null = null;
  if (parsed.edit && typeof parsed.edit.story === "string" && parsed.edit.story.length >= params.story.length * 0.5) {
    edit = {
      story: stripEmDashes(parsed.edit.story),
      summary: stripEmDashes(typeof parsed.edit.summary === "string" ? parsed.edit.summary : "Updated the story."),
    };
  }
  return { reply: reply || "I'm here. Tell me what you'd like to change or ask.", edit };
}
