import {
  STORY_FRAMEWORKS,
  type StoryDepth,
  type StoryFrameworkId,
  type PedagogyFocus,
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
  concise:
    "Write a compact but complete learning story: about 180-260 words in the story field, plus short metadata fields. It should still include observation, learning meaning, curriculum fit, and a practical response.",
  balanced:
    "Write a strong everyday learning story: about 300-450 words in the story field, plus useful metadata fields. Use 3-5 short paragraphs with evidence, interpretation, educator response, and family connection.",
  detailed:
    "Write a fuller educator-ready learning story: about 500-700 words in the story field, plus metadata fields. Add careful interpretation, pedagogy, continuity, and next steps without inventing extra events.",
};

const PEDAGOGY_GUIDANCE: Record<PedagogyFocus, string> = {
  balanced:
    "Balance observation, interpretation, curriculum, child voice, and a practical response without forcing every lens.",
  intentional_teaching:
    "Make the educator's possible intentional response concrete, proportionate, and connected to what the child already showed.",
  child_voice:
    "Prioritise the child's words, gesture, choices, agency, and interpretation. Do not invent a quote.",
  family_partnership:
    "Identify a respectful question or connection that invites family knowledge without assuming home practice.",
  working_theories:
    "Notice the child's emerging idea about how something works and suggest a way to revisit or test that theory.",
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
- Avoid vague filler such as "spent time", "kept trying", "enjoyed exploring", "was engaged", or "participated well" unless the sentence immediately names the exact action the educator saw.
- Prefer evidence-first verbs: built, moved, tested, paused, asked, returned, balanced, sorted, negotiated, explained, listened, copied, adjusted, noticed.
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
  "evidenceAnchors": ["2-4 short exact or closely paraphrased observation details that support the interpretation"],
  "educatorChecks": ["2-3 short questions the educator should confirm before sharing"],
  "pedagogyLinks": ["1-3 plain-language links to a relevant principle, practice, or teaching response"],
  "frameworkEvidence": ["1-3 short educator-friendly explanations of why the selected curriculum links fit"],
  "familyQuestion": "one optional open question that invites family knowledge without assumption",
  "followUpPrompt": "one specific thing to notice next time so learning can be followed over time",
  "childAge": "extracted or inferred age range",
  "nextSteps": ["2-3 practical next steps"],
  "wordCount": 360
}

CRITICAL:
- Return JSON only.
- Never include anything beyond what the educator provided, except careful curriculum interpretation.
- If a field is not strongly supported, return an empty array or a short neutral sentence.
- A brief educator note still deserves a useful draft. Do not respond with a tiny generic paragraph; make the limits of the evidence visible in assumptions and educator checks.`;

function countObservationWords(observations: string) {
  return observations.trim().split(/\s+/).filter(Boolean).length;
}

function getObservationDetailGuidance(observations: string) {
  const words = countObservationWords(observations);
  const lines = observations.split(/\n+/).map((line) => line.trim()).filter(Boolean).length;
  const hasQuote = /["“”']/.test(observations);
  const hasRelationshipEvidence = /\b(with|asked|helped|shared|turn|friend|child|teacher|educator|family|parent|mum|dad)\b/i.test(observations);
  const hasSequence = /\b(first|then|after|again|when|because|until|next|later|twice|three|four|\d)\b/i.test(observations);

  if (words < 25 || lines < 3) {
    return [
      "OBSERVATION DETAIL LEVEL: Sparse note.",
      "- The draft must be useful and educator-ready, but it must not pretend the educator supplied details that are missing.",
      "- Use careful phrasing such as \"the note suggests\", \"this may show\", or \"from this brief observation\" where interpretation is thin.",
      "- Build the story around the exact action supplied, then add practical educator response, family question, and next noticing prompts.",
      "- Put missing details in assumptions and educatorChecks, especially child voice, peer interaction, materials, context, and educator response.",
      "- Do not add specific objects, dialogue, emotions, sequence, or other children unless the notes say so.",
    ].join("\n");
  }

  if (words < 70 || !hasQuote || !hasRelationshipEvidence || !hasSequence) {
    return [
      "OBSERVATION DETAIL LEVEL: Moderate note.",
      "- Write a complete draft, but keep interpretation proportionate to the evidence.",
      "- Strengthen the story by naming the visible learning process, possible educator response, and what to notice next.",
      "- If child voice, sequence, relationships, or context are missing, ask for those in educatorChecks instead of inventing them.",
    ].join("\n");
  }

  return [
    "OBSERVATION DETAIL LEVEL: Rich note.",
    "- Use the supplied sequence, child voice, relationships, and context to make the story specific.",
    "- Keep the draft readable and evidence-led rather than turning every detail into a curriculum label.",
  ].join("\n");
}

function getAgeGroupGuidance(ageGroup: string | undefined) {
  if (!ageGroup) {
    return "AGE-GROUP CALIBRATION: Age not supplied. Avoid age-specific developmental claims and keep interpretation observation-led.";
  }

  const normalized = ageGroup.toLowerCase();
  if (/0|baby|infant|month/.test(normalized)) {
    return [
      "AGE-GROUP CALIBRATION: Infant or very young toddler age selected.",
      "- Keep claims developmentally modest and grounded in observable sensory, movement, communication, relationship, or exploration evidence.",
      "- If the observation sounds like complex pretend play, describe the action carefully and add an educator check to confirm the age/context rather than overstating symbolic role play.",
    ].join("\n");
  }

  if (/1|2|toddler/.test(normalized)) {
    return [
      "AGE-GROUP CALIBRATION: Toddler age selected.",
      "- Focus on agency, language attempts, imitation, exploration, relationships, and emerging independence.",
      "- Keep next steps practical and concrete, with short prompts and accessible materials.",
    ].join("\n");
  }

  return [
    "AGE-GROUP CALIBRATION: Preschool/older early childhood age selected or broad age group supplied.",
    "- It is appropriate to name working theories, symbolic play, collaboration, persistence, communication, and planning when the observation supports them.",
    "- Still keep every claim tied to what the educator actually saw or heard.",
  ].join("\n");
}

export function buildUserMessage(
  observations: string,
  ageGroup: string | undefined,
  childName: string | undefined,
  tone: StoryTone,
  framework: StoryFrameworkId,
  preferences: StoryPreferences,
  childContext?: string
) {
  const config = STORY_FRAMEWORKS[framework];
  const depth = preferences.depthPreference ?? "balanced";
  const preferredStoryLength = preferences.preferredStoryLength ?? depth;
  const teReoLevel = preferences.includeTeReoLevel ?? "low";
  const pedagogyFocus = preferences.pedagogyFocus ?? "balanced";
  const emphasis = preferences.emphasis?.length
    ? preferences.emphasis.join(", ")
    : "plain language, real educator voice, practical learning links";
  const kowhitiGuidance = framework === "NZ" && preferences.includeKowhitiWhakapae
    ? [
        "KŌWHITI WHAKAPAE GUIDANCE:",
        "- Include a Kōwhiti Whakapae-informed link only when it genuinely helps the observation.",
        "- Use it as notice/recognise/respond thinking for social & emotional, oral language & literacy, or maths learning.",
        "- For social and emotional competence, focus on visible capabilities such as connected relationships, caring for others, emotional awareness, agency, adaptability, or social inclusion.",
        "- Do not present Kōwhiti Whakapae as a Te Whāriki strand or as a compulsory checklist.",
      ].join("\n")
    : framework === "NZ"
      ? "KŌWHITI WHAKAPAE GUIDANCE: Not requested. Do not include a Kōwhiti Whakapae reference unless the educator's observation directly requires it."
      : "KŌWHITI WHAKAPAE GUIDANCE: Australian EYLF mode. Do not include Kōwhiti Whakapae references.";
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
      : "Australian EYLF mode. Do not add te reo Māori, Māori glossary terms, whānau/kaiako/tamariki wording, or Kōwhiti Whakapae references.";
  const audienceGuidance =
    framework === "NZ"
      ? "Sound like a teacher or kaiako writing for colleagues and whānau, not for a sales page."
      : "Sound like an Australian early childhood teacher writing for colleagues and families, not for a sales page.";
  const familyWord = framework === "NZ" ? "whānau" : "family";
  const observationDetailGuidance = getObservationDetailGuidance(observations);
  const ageGroupGuidance = getAgeGroupGuidance(ageGroup);

  return `EDUCATOR OBSERVATIONS:
${observations}

CHILD NAME: ${childName ? childName : "Not provided. Use 'the child' when needed."}
AGE GROUP: ${ageGroup ? ageGroup : "Not provided"}
SAVED CONTINUITY CONTEXT:
${childContext || "No saved child profile or earlier learning context was selected."}

${observationDetailGuidance}

${ageGroupGuidance}

CONTEXT BOUNDARY:
- Saved continuity context may inform respectful wording and possible connections.
- It is not evidence from today's observation.
- Never state a saved interest, aspiration, language, or earlier pattern as if it happened today.
- If today's observation does not support a connection, leave it out.

REQUESTED TONE: ${tone}
REQUESTED DEPTH: ${depth}
PEDAGOGY FOCUS: ${pedagogyFocus}
FRAMEWORK: ${config.label} (${config.pickerLabel})

SETTINGS MUST BE VISIBLE IN THE DRAFT:
- Tone must noticeably shape the writing style: natural is everyday educator language, warm is reflective but still grounded, professional is suitable for leadership/review, simple is short and plain.
- Depth must noticeably change story length and development. Do not give a one-paragraph answer for balanced or detailed.
- Pedagogy focus must influence the story, pedagogyLinks, familyQuestion, followUpPrompt, and nextSteps without forcing unsupported claims.
- Framework must control all curriculum wording. EYLF means Australian EYLF only. Te Whāriki means Aotearoa New Zealand Te Whāriki only.

FRAMEWORK GUIDANCE:
${config.curriculumPrompt}

VOICE GUIDANCE:
- ${config.voicePrompt}
- ${TONE_GUIDANCE[tone]}
- ${DEPTH_GUIDANCE[depth]}
- ${PEDAGOGY_GUIDANCE[pedagogyFocus]}
- ${audienceGuidance}
- If FRAMEWORK is EYLF, write for Australian educators and families. Do not use te reo Māori terms or Aotearoa-only framework language.
- Keep the language simple enough that an ECE teacher would naturally use it.
- Use local Australia/Aotearoa spelling such as colour, behaviour, centre, organise, and recognise.
- Avoid long, fancy phrases an educator would not naturally write.

CULTURAL GUIDANCE:
- ${config.culturalPrompt}
- If social and emotional learning is visible, name it in plain language.
- Te reo Māori level: ${framework === "NZ" ? teReoLevel : "not used in EYLF mode"}. ${teReoGuidance}
- ${kowhitiGuidance}
- ${tapasaGuidance}

PERSISTED STORY PREFERENCES:
- Preferred default framework: ${preferences.defaultFramework ?? "Not set"}
- Preferred tone: ${preferences.preferredTone ?? "Not set"}
- Preferred depth: ${preferences.depthPreference ?? "Not set"}
- Preferred story length: ${preferredStoryLength}
- Centre philosophy or room voice: ${preferences.centrePhilosophy ?? "Not set"}
- Words or phrases they like: ${preferences.likedPhrases?.length ? preferences.likedPhrases.join(", ") : "Not set"}
- Words or phrases they avoid: ${preferences.avoidedPhrases?.length ? preferences.avoidedPhrases.join(", ") : "Not set"}
- Approved story example: ${preferences.approvedStoryExample ?? "Not set"}
- Centre quality notes: ${preferences.qualityNotes ?? "Not set"}
- Centre privacy rules: ${preferences.privacyRules?.length ? preferences.privacyRules.join("; ") : "Not set"}
- Preferred export style: ${preferences.exportStyle ?? "balanced"}
- Te reo Māori level: ${framework === "NZ" ? preferences.includeTeReoLevel ?? "low" : "not used in EYLF mode"}
- Include Kōwhiti Whakapae: ${framework === "NZ" && preferences.includeKowhitiWhakapae ? "yes" : "no"}
- Include Tapasā: ${preferences.includeTapasa ? "yes" : "no"}
- Pedagogy focus: ${pedagogyFocus}
- Emphasis areas: ${emphasis}
- Extra notes: ${preferences.notes ?? "None"}

CENTRE VOICE MEMORY:
- If a centre philosophy or preferred phrase list is present, use it to shape tone, priorities, and wording.
- Do not quote the philosophy as if it happened in today's observation.
- Do not force liked phrases into the story if they sound unnatural.
- Avoid the avoided phrases unless the educator's observation explicitly requires them.
- Centre voice memory changes style and emphasis only. Evidence still comes from today's observation.
- Centre quality notes and approved examples are calibration references only. Do not copy the example child, event, wording, or facts into today's story.
- If centre privacy rules are present, follow them conservatively and add an educator check when a rule may apply.

FIELD GUIDANCE:
- storyTitle: a short human title, not cute or poetic.
- story: plain text only. Start from the clearest observable action, then explain what learning was noticed. Include the educator's likely response or a review-ready next response, and end with how the learning can be followed. Do not make it a rigid checklist unless the observation needs structure.
- story: for sparse notes, write a worthwhile draft while making evidence limits clear. A good sparse-note story can say "From this brief note..." or "The observation gives a starting point..." but must not invent materials, dialogue, reactions, duration, other children, or educator actions.
- Never write "spent time building/playing/exploring" when the notes show a more precise action. Write what the child actually did, changed, said, asked, tried, or noticed.
- outcomes: 1-3 concise curriculum tags. For Australia, use "EYLF Outcome ..." wording only. Never use Mana, Te Whāriki, whānau, kaiako, tamariki, Kōwhiti, or Aotearoa-only language in EYLF output. For Aotearoa New Zealand, do not write "Te Whāriki: Exploration"; write strand plus relevant outcome idea.
- curriculumLinks: 1-3 natural curriculum links with why-it-links wording. NZ example: "This links with Mana aotūroa | Exploration, particularly children using strategies for reasoning and problem solving, as Cooper tested an idea, adjusted it, and noticed what changed."
- learningSummary: say what learning was visible in simple educator language.
- childVoice: include an exact supplied phrase only if the educator gave quoted wording. If there is no direct quote, summarise plainly, for example "Cooper called it his stopper." If unsure, return an empty string.
- learningDispositions: examples include curiosity, perseverance, inventiveness, problem solving, confidence, resilience, working theories, communication, collaboration, independence, leadership, empathy, safe risk-taking, creativity.
- If the observation shows trying again, testing, adjusting, or returning to an idea after it does not work straight away, include perseverance or persistence when that is genuinely supported.
- If the child repurposes an everyday object, creates an original tool, or finds an unexpected way to solve a practical problem, include inventiveness when that is genuinely supported.
- socialEmotionalLinks: examples include self-regulation, turn-taking, empathy, belonging, communication, confidence with others.
- culturalConnections: include only real or carefully neutral links such as ${framework === "NZ" ? "te reo use, whānau connection," : "family connection,"} home language, community, identity, or Tapasā-informed responsiveness.
- whanauConnection: one short sentence a ${familyWord} could recognise or build on at home.
- assumptions: if detail is missing, name the gap gently rather than inventing it.
- evidenceAnchors: use only details found in the educator's observation. Keep each anchor short enough to scan.
- educatorChecks: ask the educator to confirm accuracy, local context, or interpretation. Never claim the AI has signed off the story.
- pedagogyLinks: for EYLF, consider relevant V2.0 principles or practices such as partnerships, respect for diversity, Aboriginal and Torres Strait Islander perspectives, equity/inclusion, sustainability, critical reflection, collaborative leadership, play-based learning, intentionality, responsiveness, or continuity when evidence supports it. For Te Whāriki, consider empowerment, holistic development, family and community, relationships, local curriculum, responsive and reciprocal practice, working theories, or assessment-for-learning. Do not paste a framework checklist.
- frameworkEvidence: briefly explain why each selected EYLF outcome or Te Whāriki strand/outcome fits the observation. Keep it simple, for example: "This links with Exploration because the child was testing an idea, problem-solving, and changing the plan through play."
- familyQuestion: ask one open, family-friendly question only when it could deepen understanding. Do not ask families to validate a developmental judgement.
- followUpPrompt: identify one observable action, strategy, relationship, phrase, or working theory to notice next time.
- nextSteps: practical teaching moves, not big theory.

Write the JSON now.`;
}
