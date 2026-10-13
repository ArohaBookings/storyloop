/**
 * England (EYFS) and Ireland (Aistear), added 13 Oct 2026.
 *
 * Australian (EYLF) and New Zealand (Te Whāriki) stories are written exactly as
 * before: nothing in lib/story-options.ts STORY_FRAMEWORKS, the system prompt
 * or the AU/NZ per-story prompt changed, and tests/au-nz-unchanged.test.ts
 * proves it against a snapshot recorded before this file existed. A UK or
 * Ireland story takes its own path (lib/ai/international-story.ts) from the
 * moment the request arrives.
 *
 * Curriculum facts checked on 13 Oct 2026 against the official documents:
 * - EYFS statutory framework for group and school-based providers (DfE,
 *   effective 1 September 2026; paragraphs 1.5, 1.6, 1.18, 1.20, 2.2, 2.5):
 *   three prime areas (communication and language; physical development;
 *   personal, social and emotional development), four specific areas
 *   (literacy; mathematics; understanding the world; expressive arts and
 *   design), three characteristics of effective teaching and learning
 *   (playing and exploring; active learning; creating and thinking
 *   critically). Development Matters is non-statutory. Ongoing assessment
 *   needs no written records or physical evidence. Applies in England.
 * - Aistear, the Early Childhood Curriculum Framework (NCCA; DCEDIY briefing
 *   December 2024): updated December 2024, in use from September 2025, birth
 *   to six in all settings other than primary and special schools. Four
 *   Themes kept: Wellbeing; Identity and Belonging; Communicating; Exploring
 *   and Thinking. Fewer learning goals, no longer numbered; principles cut
 *   from twelve to nine.
 */
import type { StoryFrameworkId } from "@/lib/story-options";

export type InternationalFrameworkId = "UK" | "IE";
export type AnyFrameworkId = StoryFrameworkId | InternationalFrameworkId;

export const INTERNATIONAL_FRAMEWORK_IDS: InternationalFrameworkId[] = ["UK", "IE"];

export function isInternationalFramework(value: unknown): value is InternationalFrameworkId {
  return value === "UK" || value === "IE";
}

/**
 * Like normalizeFramework, but keeps England and Ireland. AU and NZ resolve
 * exactly as normalizeFramework does (anything unknown is AU).
 */
export function normalizeAnyFramework(value?: string | null): AnyFrameworkId {
  if (value === "UK" || value === "IE" || value === "NZ") return value;
  return "AU";
}

/** The country a visitor's IP points to, as a framework, for the public demo only. */
export function frameworkForCountry(country: string | null | undefined): InternationalFrameworkId | null {
  const code = (country ?? "").toUpperCase();
  if (code === "GB") return "UK";
  if (code === "IE") return "IE";
  return null;
}

/**
 * The value an AI helper (Quill edits, parent version, family pack, backlog
 * rescue, room planning) is shown for the framework. AU and NZ come back
 * exactly as they were passed, so those prompts are byte-for-byte unchanged.
 */
export function frameworkPromptValue<T extends string>(framework: T): T | string {
  if (framework === "UK") return "EYFS (England)";
  if (framework === "IE") return "Aistear (Ireland)";
  return framework;
}

export const FRAMEWORK_LABELS: Record<AnyFrameworkId, { picker: string; curriculum: string; country: string }> = {
  AU: { picker: "EYLF · Australia", curriculum: "EYLF V2.0", country: "Australia" },
  NZ: { picker: "Te Whāriki · NZ", curriculum: "Te Whāriki", country: "Aotearoa New Zealand" },
  UK: { picker: "EYFS · England", curriculum: "EYFS", country: "England" },
  IE: { picker: "Aistear · Ireland", curriculum: "Aistear", country: "Ireland" },
};

type InternationalConfig = {
  id: InternationalFrameworkId;
  label: string;
  pickerLabel: string;
  curriculumPrompt: string;
  voicePrompt: string;
  culturalPrompt: string;
  audience: string;
  outcomesRule: string;
  linkExample: string;
  pedagogyRule: string;
  /** Words that belong to another country's framework and must never appear. */
  leakTerms: RegExp;
  /** At least one of these should appear when the draft links the curriculum. */
  ownTerms: RegExp;
  transcriptionPrompt: string;
};

const AU_NZ_TERMS = String.raw`EYLF|Early Years Learning Framework|Belonging, Being and Becoming|Te Wh(ā|a)riki|Mana (atua|whenua|tangata|reo|ao(tū|tu)roa)|wh(ā|a)nau|kaiako|tamariki|mokopuna|K(ō|o)whiti|Aotearoa|ACECQA|National Quality Standard|\bNQS\b|\bERO\b|Tapas(ā|a)|My Time,? Our Place`;

export const INTERNATIONAL_FRAMEWORKS: Record<InternationalFrameworkId, InternationalConfig> = {
  UK: {
    id: "UK",
    label: "England",
    pickerLabel: "EYFS",
    curriculumPrompt: [
      "England framework: the Early Years Foundation Stage (EYFS) statutory framework from the Department for Education.",
      "Link learning to the seven areas of learning and development only when the observation supports them, and name the area exactly:",
      "Prime areas: Communication and language; Physical development; Personal, social and emotional development.",
      "Specific areas: Literacy; Mathematics; Understanding the world; Expressive arts and design.",
      "Also name a characteristic of effective teaching and learning when it is visible: Playing and exploring; Active learning; Creating and thinking critically.",
      "For testing ideas, persisting, problem solving or making links, consider Creating and thinking critically and Active learning before other links.",
      "For talk, listening, questions, stories or explaining ideas, consider Communication and language if the observation includes communication evidence.",
      "Do not make Early Learning Goal judgements, give ages and stages scores, or assess the child against a checklist. Development Matters and Birth to 5 Matters are non-statutory guidance: mention them only if the educator does.",
      "Name the most relevant area clearly and include a short why-it-links explanation from the child's actual actions.",
    ].join("\n"),
    voicePrompt:
      "Write like an experienced early years practitioner in England using plain British English (colour, behaviour, nursery, practitioner, key person). Keep the tone warm, grounded and easy to share with parents and carers.",
    culturalPrompt:
      "If family, home language, culture or community are relevant, note them respectfully without making assumptions about background or values.",
    audience: "Sound like an early years practitioner in England writing for colleagues and parents, not for a sales page.",
    outcomesRule:
      'outcomes: 1-3 concise tags written as "EYFS: <area of learning>" or "EYFS characteristic: <characteristic of effective teaching and learning>". Never use EYLF, Te Whāriki, Mana, whānau, kaiako, tamariki, Aistear or Australian or New Zealand framework language.',
    linkExample:
      'England example: "This links with the EYFS area Understanding the world, as Cooper tested how the water moved through the funnel and changed what he did next. It also shows Creating and thinking critically, because he tried a new way when the first one did not work."',
    pedagogyRule:
      "pedagogyLinks: consider the key person approach, the balance of child-initiated and adult-led play, sustained shared thinking, the characteristics of effective teaching and learning, or partnership with parents and carers when the evidence supports it. Do not paste a framework checklist.",
    leakTerms: new RegExp(`${AU_NZ_TERMS}|Aistear|Síolta|Siolta|\\bNCCA\\b`, "i"),
    ownTerms: /EYFS|Early Years Foundation Stage|Communication and Language|Physical Development|Personal, Social and Emotional|Literacy|Mathematics|Understanding the World|Expressive Arts and Design|Playing and Exploring|Active Learning|Creating and Thinking Critically/i,
    transcriptionPrompt:
      "Transcribe an early years practitioner's voice note clearly. Preserve child names, everyday practitioner phrasing and any EYFS terms.",
  },
  IE: {
    id: "IE",
    label: "Ireland",
    pickerLabel: "Aistear",
    curriculumPrompt: [
      "Ireland framework: Aistear, the Early Childhood Curriculum Framework (NCCA, updated December 2024, in use from September 2025).",
      "Link learning to Aistear's four interconnected Themes only when the observation supports them, and name the Theme exactly:",
      "Wellbeing; Identity and Belonging; Communicating; Exploring and Thinking.",
      "Each Theme has aims and broad learning goals. Describe the learning in plain words rather than quoting or numbering learning goals; the updated framework does not number them.",
      "For testing ideas, investigating, problem solving or working theories, consider Exploring and Thinking before other Themes.",
      "For talk, gesture, stories, symbols or sharing ideas, consider Communicating if the observation includes communication evidence.",
      "For confidence, relationships, a sense of self or belonging to the group, consider Wellbeing or Identity and Belonging when the evidence supports it.",
      "Síolta is the national quality framework: mention it only if the educator does.",
      "Name the most relevant Theme clearly and include a short why-it-links explanation from the child's actual actions.",
    ].join("\n"),
    voicePrompt:
      "Write like an experienced early years educator in Ireland using plain Irish and British English spelling (colour, behaviour, preschool, educator, parents). Keep the tone warm, grounded and easy to share with families.",
    culturalPrompt:
      "If family, home language (including Irish or another language), culture or community are relevant, note them respectfully without making assumptions. Keep any Irish words the educator wrote exactly; do not add Irish words they did not use.",
    audience: "Sound like an early years educator in Ireland writing for colleagues and families, not for a sales page.",
    outcomesRule:
      'outcomes: 1-3 concise tags written as "Aistear: <Theme>". Never use EYLF, Te Whāriki, Mana, whānau, kaiako, tamariki, EYFS or Australian, New Zealand or English framework language.',
    linkExample:
      'Ireland example: "This links with the Aistear Theme Exploring and Thinking, as Cooper tested how the water moved through the funnel and changed what he did next."',
    pedagogyRule:
      "pedagogyLinks: consider relationships, play and hands-on experiences, the role of the educator, partnership with parents, or assessment through observation and learning stories when the evidence supports it. Do not paste a framework checklist.",
    leakTerms: new RegExp(`${AU_NZ_TERMS}|\\bEYFS\\b|Early Years Foundation Stage|Ofsted|Development Matters`, "i"),
    ownTerms: /Aistear|Wellbeing|Well-being|Identity and Belonging|Communicating|Exploring and Thinking/i,
    transcriptionPrompt:
      "Transcribe an early years educator's voice note clearly. Preserve child names, any Irish words, everyday educator phrasing and any Aistear terms.",
  },
};

/** Lines of a draft that name another country's framework. Pure. */
export function frameworkLeaks(framework: InternationalFrameworkId, texts: string[]): string[] {
  const pattern = INTERNATIONAL_FRAMEWORKS[framework].leakTerms;
  return texts.filter((text) => pattern.test(text));
}
