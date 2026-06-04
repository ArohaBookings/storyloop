import {
  STORY_FRAMEWORKS,
  type StoryDepth,
  type StoryFrameworkId,
  type StoryPreferences,
  type StoryTone,
} from "@/lib/story-options";

const TONE_GUIDANCE: Record<StoryTone, string> = {
  natural: "Use a natural educator voice: warm, direct, reflective, and not over-written.",
  warm: "Use a warm reflective voice without sounding poetic or sentimental.",
  professional: "Use a clear professional voice suitable for a room leader, educational leader, or ERO/assessment audience.",
  simple: "Use simple everyday ECE language with shorter sentences and no jargon.",
};

const DEPTH_GUIDANCE: Record<StoryDepth, string> = {
  concise: "Keep the story concise: about 90-140 words plus short metadata fields.",
  balanced: "Keep the story balanced: about 140-220 words plus useful metadata fields.",
  detailed: "Add a little more educator interpretation and responding detail: about 220-320 words plus metadata fields.",
};

export const LEARNING_STORY_PROMPT = `You are StoryLoop, a writing assistant for early childhood educators.

Your work must sound like a real educator wrote it, not a poet, marketer, or policy document.

NON-NEGOTIABLE RULES:
- Use plain, human educator language.
- Keep every learning claim tied to evidence in the observation.
- Avoid oversized words when simpler wording works.
- Keep the story tight enough that an educator would actually use it.
- Do not use markdown, emojis, policy-speak, or fake certainty inside the story text.
- A short title is required, but the main story should still read naturally.
- Never invent culture, diagnosis, family background, support needs, or developmental concerns.
- Name curriculum links only when the observation supports them.
- Keep next steps practical and easy to act on in the room.
- Put assumptions in the assumptions field, not as facts in the story.

STYLE GUARDRAILS:
- No gush, no corporate tone, no generic inspiration language.
- Avoid phrases like "beautiful moment", "remarkable", "wonderful", "deepening sense", or "fascination continued" unless the educator's notes clearly justify them.
- Avoid academic filler such as "demonstrated", "illustrates", "overall", "critical thinking", "important part", "significant learning", or "holistic development". Prefer "showed", "I noticed", "this links with", and direct explanation.
- If a sentence sounds polished in an AI way, rewrite it more simply.
- Use at most one short quoted child phrase, and only if the educator provided it.
- Write the story as short usable paragraphs unless the requested depth calls for more detail.

RETURN ONLY VALID JSON WITH THIS EXACT SHAPE:
{
  "storyTitle": "short natural title",
  "story": "plain text only",
  "outcomes": ["1-3 short curriculum tags"],
  "curriculumLinks": ["1-3 short natural links with a why-it-links explanation"],
  "learningSummary": "2-3 short sentences in plain language about what learning was visible",
  "childVoice": "one short child voice sentence or empty string",
  "learningDispositions": ["2-4 short items"],
  "socialEmotionalLinks": ["0-4 short items"],
  "culturalConnections": ["0-4 short items"],
  "whanauConnection": "one short sentence families could connect with",
  "assumptions": ["0-3 short assumptions or gaps"],
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
  const depth = preferences.depthPreference ?? "balanced";
  const teReoLevel = preferences.includeTeReoLevel ?? "low";
  const emphasis = preferences.emphasis?.length
    ? preferences.emphasis.join(", ")
    : "plain language, real educator voice, practical learning links";
  const kowhitiGuidance = preferences.includeKowhitiWhakapae
    ? [
        "KŌWHITI WHAKAPAE GUIDANCE:",
        "- Include a Kōwhiti Whakapae-informed link only when it genuinely helps the observation.",
        "- Use it as notice/recognise/respond thinking for social & emotional, oral language & literacy, or maths learning.",
        "- For social and emotional competence, focus on visible capabilities such as connected relationships, caring for others, emotional awareness, agency, adaptability, or social inclusion.",
        "- Do not present Kōwhiti Whakapae as a Te Whāriki strand or as a compulsory checklist.",
      ].join("\n")
    : "KŌWHITI WHAKAPAE GUIDANCE: Not requested. Do not include a Kōwhiti Whakapae reference unless the educator's observation directly requires it.";
  const tapasaGuidance = preferences.includeTapasa
    ? [
        "TAPASĀ GUIDANCE:",
        "- Include a Tapasā lens only when Pacific identity, language, family, community, belonging, or relationship evidence is present or the educator explicitly asks for it.",
        "- Focus on respectful relationships, learner identity, family/community connection, and cultural responsiveness.",
        "- Do not guess that a child or family is Pacific.",
      ].join("\n")
    : "TAPASĀ GUIDANCE: Not requested. Do not mention Tapasā unless the educator explicitly supplied a relevant Pacific connection.";
  const teReoGuidance =
    framework === "NZ"
      ? {
          low: "Use only natural core terms where helpful, such as kaiako, tamariki, mokopuna, whānau, or ako. Do not sprinkle random te reo Māori.",
          medium: "Use a little more te reo Māori when accurate and natural, including strand names and common terms such as kaiako, tamariki, mokopuna, whānau, ako, manaakitanga, or mahi.",
          high: "Use te reo Māori more visibly while staying readable for families. Keep it accurate, relevant, and avoid token phrases.",
        }[teReoLevel]
      : "Do not add te reo Māori to Australian EYLF stories unless the observation includes it.";

  return `EDUCATOR OBSERVATIONS:
${observations}

CHILD NAME: ${childName ? childName : "Not provided. Use 'the child' when needed."}
AGE GROUP: ${ageGroup ? ageGroup : "Not provided"}
REQUESTED TONE: ${tone}
REQUESTED DEPTH: ${depth}
FRAMEWORK: ${config.label} (${config.pickerLabel})

FRAMEWORK GUIDANCE:
${config.curriculumPrompt}

VOICE GUIDANCE:
- ${config.voicePrompt}
- ${TONE_GUIDANCE[tone]}
- ${DEPTH_GUIDANCE[depth]}
- Sound like a teacher or kaiako writing for colleagues and whanau, not for a sales page.
- Keep the language simple enough that an ECE teacher would naturally use it.
- Use local Australia/Aotearoa spelling such as colour, behaviour, centre, organise, and recognise.
- Avoid long, fancy phrases an educator would not naturally write.

CULTURAL GUIDANCE:
- ${config.culturalPrompt}
- If social and emotional learning is visible, name it in plain language.
- Te reo Māori level: ${teReoLevel}. ${teReoGuidance}
- ${kowhitiGuidance}
- ${tapasaGuidance}

PERSISTED STORY PREFERENCES:
- Preferred default framework: ${preferences.defaultFramework ?? "Not set"}
- Preferred tone: ${preferences.preferredTone ?? "Not set"}
- Preferred depth: ${preferences.depthPreference ?? "Not set"}
- Te reo Māori level: ${preferences.includeTeReoLevel ?? "low"}
- Include Kōwhiti Whakapae: ${preferences.includeKowhitiWhakapae ? "yes" : "no"}
- Include Tapasā: ${preferences.includeTapasa ? "yes" : "no"}
- Emphasis areas: ${emphasis}
- Extra notes: ${preferences.notes ?? "None"}

FIELD GUIDANCE:
- storyTitle: a short human title, not cute or poetic.
- story: plain text only. Start from what happened, then explain what learning was noticed. Do not make it a rigid checklist unless the observation needs structure.
- outcomes: 1-3 concise curriculum tags. For Australia, use EYLF outcome wording or sub-outcomes only when you are confident. For Aotearoa New Zealand, do not write "Te Whāriki: Exploration"; write strand plus relevant outcome idea.
- curriculumLinks: 1-3 natural curriculum links with why-it-links wording. NZ example: "This links with Mana aotūroa | Exploration, particularly children using strategies for reasoning and problem solving, as Cooper tested an idea, adjusted it, and noticed what changed."
- learningSummary: say what learning was visible in simple educator language.
- childVoice: include an exact supplied phrase only if the educator gave quoted wording. If there is no direct quote, summarise plainly, for example "Cooper called it his stopper." If unsure, return an empty string.
- learningDispositions: examples include curiosity, perseverance, inventiveness, problem solving, confidence, resilience, working theories, communication, collaboration, independence, leadership, empathy, safe risk-taking, creativity.
- If the observation shows trying again, testing, adjusting, or returning to an idea after it does not work straight away, include perseverance or persistence when that is genuinely supported.
- socialEmotionalLinks: examples include self-regulation, turn-taking, empathy, belonging, communication, confidence with others.
- culturalConnections: include only real or carefully neutral links such as te reo use, whānau connection, home language, community, identity, or Tapasā-informed responsiveness.
- whanauConnection: one short sentence a family could recognise or build on at home.
- assumptions: if detail is missing, name the gap gently rather than inventing it.
- nextSteps: practical teaching moves, not big theory.

Write the JSON now.`;
}
