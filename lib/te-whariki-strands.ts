import { REAL_EXAMPLES, type RealExample } from "./real-examples";

/**
 * The five strands of Te Whāriki (2017) with their goals and learning outcomes.
 *
 * Every string in `statementEn`, `statementMi`, `aim`, `goalsLead`, `goals` and
 * `outcomes` is copied from Te Whāriki: He whāriki mātauranga mō ngā mokopuna o
 * Aotearoa Early childhood curriculum (Ministry of Education, 2017), pages 24–25
 * (the overview table) and the first page of each strand. 18 goals, 20 learning
 * outcomes. `plain` and `looks` are StoryLoop's own words, and the pages say so.
 */
export type TeWharikiStrand = {
  n: 1 | 2 | 3 | 4 | 5;
  /** Top-level path, e.g. /mana-atua-wellbeing */
  slug: string;
  maori: string;
  english: string;
  statementEn: string;
  statementMi: string;
  aim: string;
  goalsLead: string;
  goals: string[];
  outcomes: { en: string; mi: string }[];
  plain: string;
  looks: string;
};

export const OUTCOMES_LEAD = "Over time and with guidance and encouragement, children become increasingly capable of:";

export const TE_WHARIKI_SOURCES = [
  {
    label: "Te Whāriki: He whāriki mātauranga mō ngā mokopuna o Aotearoa Early childhood curriculum (Ministry of Education, 2017), on Te Whāriki Online",
    url: "https://tewhariki.tahurangi.education.govt.nz/te-wh-riki-early-childhood-curriculum-document/5637184332.p",
  },
  {
    label: "Te Whāriki Online: Strands, goals and learning outcomes",
    url: "https://tewhariki.tahurangi.education.govt.nz/te-whariki/our-curriculum/strands/5637145233.c",
  },
];

export const TE_WHARIKI_STRANDS: TeWharikiStrand[] = [
  {
    n: 1,
    slug: "mana-atua-wellbeing",
    maori: "Mana atua",
    english: "Wellbeing",
    statementEn: "Children have a sense of wellbeing and resilience",
    statementMi: "Children understand their own mana atuatanga – uniqueness and spiritual connectedness",
    aim: "The health and wellbeing of the child are protected and nurtured.",
    goalsLead: "Children experience an environment where:",
    goals: [
      "Their health is promoted",
      "Their emotional wellbeing is nurtured",
      "They are kept safe from harm",
    ],
    outcomes: [
      { en: "Keeping themselves healthy and caring for themselves", mi: "te oranga nui" },
      { en: "Managing themselves and expressing their feelings and needs", mi: "te whakahua whakaaro" },
      { en: "Keeping themselves and others safe from harm", mi: "te noho haumaru" },
    ],
    plain: "Children feel safe, cared for and healthy, and are learning to look after themselves, manage their feelings and keep themselves and others safe.",
    looks: "Washing hands before kai, telling a kaiako they are tired or hungry, settling with comfort after a big feeling, checking a friend who has fallen over.",
  },
  {
    n: 2,
    slug: "mana-whenua-belonging",
    maori: "Mana whenua",
    english: "Belonging",
    statementEn: "Children know they belong and have a sense of connection to others and the environment",
    statementMi: "Children’s relationship to Papatūānuku is based on whakapapa, respect and aroha",
    aim: "Children and their families feel a sense of belonging.",
    goalsLead: "Children and their families experience an environment where:",
    goals: [
      "Connecting links with the family and the wider world are affirmed and extended",
      "They know that they have a place",
      "They feel comfortable with the routines, customs and regular events",
      "They know the limits and boundaries of acceptable behaviour",
    ],
    outcomes: [
      { en: "Making connections between people, places and things in their world", mi: "te waihanga hononga" },
      { en: "Taking part in caring for this place", mi: "te manaaki i te taiao" },
      { en: "Understanding how things work here and adapting to change", mi: "te mārama ki te āhua o ngā whakahaere me te mōhio ki te panoni" },
      { en: "Showing respect for kaupapa, rules and the rights of others", mi: "te mahi whakaute" },
    ],
    plain: "Children and their whānau feel at home here: connected to people, places and the land, comfortable with the routines, and clear about how things work.",
    looks: "Sharing news from home, joining a familiar waiata, knowing where the hats go, helping care for the garden, settling into a new routine after a change.",
  },
  {
    n: 3,
    slug: "mana-tangata-contribution",
    maori: "Mana tangata",
    english: "Contribution",
    statementEn: "Children learn with and alongside others",
    statementMi: "Children have a strong sense of themselves as a link between past, present and future",
    aim: "Opportunities for learning are equitable, and each child’s contribution is valued.",
    goalsLead: "Children experience an environment where:",
    goals: [
      "There are equitable opportunities for learning, irrespective of gender, ability, age, ethnicity or background",
      "They are affirmed as individuals",
      "They are encouraged to learn with and alongside others",
    ],
    outcomes: [
      { en: "Treating others fairly and including them in play", mi: "te ngākau makuru" },
      { en: "Recognising and appreciating their own ability to learn", mi: "te rangatiratanga" },
      { en: "Using a range of strategies and skills to play and learn with others", mi: "te ngākau aroha" },
    ],
    plain: "Every child has a fair chance to learn, is valued for who they are, and learns with and alongside others.",
    looks: "Including a friend in a game, taking turns at the swing, being proud of something new they can do, working with others on a shared hut or project.",
  },
  {
    n: 4,
    slug: "mana-reo-communication",
    maori: "Mana reo",
    english: "Communication",
    statementEn: "Children are strong and effective communicators",
    statementMi: "Through te reo Māori children’s identity, belonging and wellbeing are enhanced",
    aim: "The languages and symbols of children’s own and other cultures are promoted and protected.",
    goalsLead: "Children experience an environment where:",
    goals: [
      "They develop non-verbal communication skills for a range of purposes",
      "They develop verbal communication skills for a range of purposes",
      "They experience the stories and symbols of their own and other cultures",
      "They discover different ways to be creative and expressive",
    ],
    outcomes: [
      { en: "Using gesture and movement to express themselves", mi: "he kōrero ā-tinana" },
      { en: "Understanding oral language and using it for a range of purposes", mi: "he kōrero ā-waha" },
      { en: "Enjoying hearing stories and retelling and creating them", mi: "he kōrero paki" },
      { en: "Recognising print symbols and concepts and using them with enjoyment, meaning and purpose", mi: "he kōrero tuhituhi" },
      { en: "Recognising mathematical symbols and concepts and using them with enjoyment, meaning and purpose", mi: "he kōrero pāngarau" },
      { en: "Expressing their feelings and ideas using a wide range of materials and modes", mi: "he kōrero auaha" },
    ],
    plain: "Children communicate in many ways, through gesture, words, stories, marks, numbers and art, in their own languages and others.",
    looks: "Babbling and pointing, first words and short phrases, retelling a favourite story, making marks and early letters, counting during play, painting or dancing an idea.",
  },
  {
    n: 5,
    slug: "mana-aoturoa-exploration",
    maori: "Mana aotūroa",
    english: "Exploration",
    statementEn: "Children are critical thinkers, problem solvers and explorers",
    statementMi: "Children see themselves as explorers, able to connect with and care for their own and wider worlds",
    aim: "The child learns through active exploration of the environment.",
    goalsLead: "Children experience an environment where:",
    goals: [
      "Their play is valued as meaningful learning and the importance of spontaneous play is recognised",
      "They gain confidence in and control of their bodies",
      "They learn strategies for active exploration, thinking and reasoning",
      "They develop working theories for making sense of the natural, social, physical and material worlds",
    ],
    outcomes: [
      { en: "Playing, imagining, inventing and experimenting", mi: "te whakaaro me te tūhurahura i te pūtaiao" },
      { en: "Moving confidently and challenging themselves physically", mi: "te wero ā-tinana" },
      { en: "Using a range of strategies for reasoning and problem solving", mi: "te hīraurau hopanga" },
      { en: "Making sense of their worlds by generating and refining working theories", mi: "te rangahau me te mātauranga" },
    ],
    plain: "Children learn by exploring: playing, moving, testing ideas and building working theories about how their world works.",
    looks: "Testing what sinks in the water trough, climbing a little higher than last time, repeating an action to see what happens, explaining why the worms come up after rain.",
  },
];

export function strandBySlug(slug: string) {
  return TE_WHARIKI_STRANDS.find((strand) => strand.slug === slug);
}

/**
 * A real New Zealand draft (lib/real-examples.ts) that links this strand, with
 * the paragraph it wrote. Null when no real draft links it.
 */
export function realExampleForStrand(strand: TeWharikiStrand): { example: RealExample; paragraph: string } | null {
  const marker = `${strand.maori} | ${strand.english}`;
  for (const example of REAL_EXAMPLES) {
    if (example.framework !== "NZ") continue;
    const paragraph = example.story.split("\n").find((text) => text.includes(marker));
    if (paragraph) return { example, paragraph: paragraph.trim() };
  }
  return null;
}
