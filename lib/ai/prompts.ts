import { STORY_FRAMEWORKS, type StoryFrameworkId, type StoryPreferences, type StoryTone } from "@/lib/story-options";

const TONE_GUIDANCE: Record<StoryTone, string> = {
  warm: "Use a warm, natural educator voice. Keep it grounded and readable, around 110-180 words.",
  concise: "Be brief and practical. Use clear sentences, around 80-120 words.",
  reflective: "Add a little more interpretation while staying plain-spoken and evidence-based, around 130-200 words.",
};

export const LEARNING_STORY_PROMPT = `You are StoryLoop, a writing assistant for early childhood educators.

Your work must sound like a real educator wrote it, not a poet, marketer, or policy document.

NON-NEGOTIABLE RULES:
- Use plain, human educator language.
- Keep every learning claim tied to evidence in the observation.
- Avoid oversized words when simpler wording works.
- Keep the story tight enough that an educator would actually use it.
- Do not use markdown, headings, bullet labels, emojis, or section titles inside the story text.
- Never invent culture, diagnosis, family background, support needs, or developmental concerns.
- Name curriculum links only when the observation supports them.
- Keep next steps practical and easy to act on in the room.

STYLE GUARDRAILS:
- No gush, no corporate tone, no generic inspiration language.
- Avoid phrases like "beautiful moment", "remarkable", "wonderful", "deepening sense", or "fascination continued" unless the educator's notes clearly justify them.
- If a sentence sounds polished in an AI way, rewrite it more simply.
- Use at most one short quoted child phrase, and only if the educator provided it.
- Prefer two short paragraphs over one long block.

RETURN ONLY VALID JSON WITH THIS EXACT SHAPE:
{
  "story": "plain text only",
  "outcomes": ["1-3 short curriculum tags"],
  "learningSummary": "2-3 short sentences in plain language about what learning was visible",
  "learningDispositions": ["2-4 short items"],
  "socialEmotionalLinks": ["0-4 short items"],
  "culturalConnections": ["0-4 short items"],
  "whanauConnection": "one short sentence families could connect with",
  "childAge": "extracted or inferred age range",
  "nextSteps": ["2-3 practical next steps"],
  "wordCount": 160
}

CRITICAL:
- Return JSON only.
- Never include anything beyond what the educator provided, except careful curriculum interpretation.
- If a field is not strongly supported, return an empty array or a short neutral sentence.`;

export function buildUserMessage(
  observations: string,
  ageGroup: string | undefined,
  childName: string | undefined,
  tone: StoryTone,
  framework: StoryFrameworkId,
  preferences: StoryPreferences
) {
  const config = STORY_FRAMEWORKS[framework];
  const emphasis = preferences.emphasis?.length
    ? preferences.emphasis.join(", ")
    : "plain language, real educator voice, practical learning links";

  return `EDUCATOR OBSERVATIONS:
${observations}

CHILD NAME: ${childName ? childName : "Not provided. Use 'the child' when needed."}
AGE GROUP: ${ageGroup ? ageGroup : "Not provided"}
REQUESTED TONE: ${tone}
FRAMEWORK: ${config.label} (${config.pickerLabel})

FRAMEWORK GUIDANCE:
${config.curriculumPrompt}

VOICE GUIDANCE:
- ${config.voicePrompt}
- ${TONE_GUIDANCE[tone]}
- Sound like a teacher or kaiako writing for colleagues and whanau, not for a sales page.
- Keep the language simple enough that an ECE teacher would naturally use it.

CULTURAL GUIDANCE:
- ${config.culturalPrompt}
- If social and emotional learning is visible, name it in plain language.
- If Te Whariki is the framework, light te reo Maori is welcome when it is accurate and natural.
- If a Pacific connection is relevant, make a respectful Tapasa-informed note without assuming identity that was not shared.

PERSISTED STORY PREFERENCES:
- Preferred default framework: ${preferences.defaultFramework ?? "Not set"}
- Preferred tone: ${preferences.preferredTone ?? "Not set"}
- Emphasis areas: ${emphasis}
- Extra notes: ${preferences.notes ?? "None"}

FIELD GUIDANCE:
- story: plain text only, 2 short paragraphs max.
- outcomes: 1-3 short curriculum links. For Australia, use EYLF outcome wording or sub-outcomes only when you are confident. For Aotearoa New Zealand, use Te Whariki strands or learning outcomes clearly.
- learningSummary: say what goals or outcomes were being met in simple educator language.
- learningDispositions: examples include persistence, curiosity, confidence, manaakitanga, contribution, problem solving.
- socialEmotionalLinks: examples include self-regulation, turn-taking, empathy, belonging, communication, confidence with others.
- culturalConnections: include only real or carefully neutral links such as te reo use, whanau connection, home language, community, identity, or Tapasa-informed responsiveness.
- whanauConnection: one short sentence a family could recognise or build on at home.
- nextSteps: practical teaching moves, not big theory.

Write the JSON now.`;
}
