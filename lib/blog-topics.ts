/**
 * Guide backlog, ordered by search intent rather than by what is fun to write.
 *
 * Each entry targets a question educators actually type. `intent` records why
 * it is worth writing: "informational" pulls people who do not know we exist,
 * "commercial" catches people already comparing tools, "problem" catches the
 * 9pm search that our product is the answer to.
 *
 * The auto writer works through this list oldest-unwritten first, so the
 * calendar takes care of itself.
 */

export type GuideTopic = {
  slug: string;
  title: string;
  angle: string;
  intent: "informational" | "problem" | "commercial";
  region: "NZ" | "AU" | "both";
  category: "guide" | "article" | "template";
  keywords: string[];
};

export const GUIDE_TOPICS: GuideTopic[] = [
  // --- Highest intent: people searching at the exact moment of pain ---
  {
    slug: "learning-story-examples-templates",
    title: "Learning story examples and templates you can actually use",
    angle: "Show three complete worked examples at different ages, with the rough note beside each finished story, then a reusable structure. High volume search, and the page can carry the examples library.",
    intent: "problem", region: "both", category: "template",
    keywords: ["learning story examples", "learning story template", "learning story format"],
  },
  {
    slug: "how-long-should-a-learning-story-be",
    title: "How long should a learning story be?",
    angle: "The honest answer is that length is the wrong measure, and three tight paragraphs that answer four questions beat a page that does not. Very common search, almost nobody answers it directly.",
    intent: "informational", region: "both", category: "guide",
    keywords: ["how long learning story", "learning story word count"],
  },
  {
    slug: "writing-learning-stories-faster",
    title: "How to write learning stories faster without making them worse",
    angle: "Capture in the moment, write later. Batch by child not by day. Stop starting from blank. Aimed squarely at the educator searching at 8pm on a Sunday.",
    intent: "problem", region: "both", category: "guide",
    keywords: ["write learning stories faster", "documentation time saving ece"],
  },
  {
    slug: "learning-story-writers-block",
    title: "What to do when you cannot think of anything to write",
    angle: "A practical sequence of prompts for when the moment was real but the words will not come. Turns a feeling of failure into a method.",
    intent: "problem", region: "both", category: "guide",
    keywords: ["learning story writers block", "cant think what to write observation"],
  },

  // --- Curriculum: steady evergreen traffic, establishes authority ---
  {
    slug: "te-whariki-strands-explained",
    title: "The five Te Whāriki strands explained with real examples",
    angle: "One concrete example per strand from ordinary play, plus the common mistake of linking to the equipment rather than the thinking.",
    intent: "informational", region: "NZ", category: "guide",
    keywords: ["te whariki strands", "mana atua mana reo", "te whariki explained"],
  },
  {
    slug: "eylf-outcomes-explained",
    title: "The five EYLF outcomes in plain English",
    angle: "Australian mirror of the Te Whāriki guide. Each outcome with what it actually looks like on the floor.",
    intent: "informational", region: "AU", category: "guide",
    keywords: ["eylf outcomes", "eylf learning outcomes explained", "eylf 2.0"],
  },
  {
    slug: "linking-observations-to-curriculum",
    title: "How to link an observation to the curriculum without forcing it",
    angle: "The single most common weakness in documentation. Teaches naming the thinking rather than the activity, with weak and strong versions side by side.",
    intent: "informational", region: "both", category: "guide",
    keywords: ["link observation to curriculum", "curriculum links learning story"],
  },
  {
    slug: "learning-dispositions-guide",
    title: "Learning dispositions: what they are and how to spot them",
    angle: "Courage, trust, perseverance, confidence, responsibility. What each looks like in a two year old versus a four year old.",
    intent: "informational", region: "both", category: "guide",
    keywords: ["learning dispositions", "dispositions early childhood"],
  },
  {
    slug: "working-theories-early-childhood",
    title: "Working theories: the most misunderstood idea in Te Whāriki",
    angle: "Most educators tag it and few explain it. A child repeating an action twenty times is testing a theory, not being repetitive.",
    intent: "informational", region: "NZ", category: "guide",
    keywords: ["working theories te whariki", "working theories examples"],
  },
  {
    slug: "kowhiti-whakapae-explained",
    title: "Kōwhiti Whakapae in practice, without the jargon",
    angle: "Newer framework, growing search, almost no plain-English explanation exists. Strong chance to own the term early.",
    intent: "informational", region: "NZ", category: "guide",
    keywords: ["kowhiti whakapae", "kowhiti whakapae examples"],
  },

  // --- Observation craft ---
  {
    slug: "how-to-write-an-observation",
    title: "How to write an observation that is worth turning into a story",
    angle: "Evidence before interpretation. What to write down in the ten seconds you actually have. The details that matter and the ones that do not.",
    intent: "informational", region: "both", category: "guide",
    keywords: ["how to write observation early childhood", "anecdotal observation example"],
  },
  {
    slug: "recording-child-voice",
    title: "Recording child voice: why you should not fix their grammar",
    angle: "A child's exact phrasing is the evidence and the thing whānau treasure. Directly reflects a product principle, so it is honest content marketing.",
    intent: "informational", region: "both", category: "guide",
    keywords: ["child voice learning story", "recording childrens voices documentation"],
  },
  {
    slug: "documenting-difficult-moments",
    title: "How to document a difficult moment fairly",
    angle: "Biting, conflict, big feelings. How to record it factually without labelling a child, and where the incident process sits alongside documentation.",
    intent: "problem", region: "both", category: "guide",
    keywords: ["documenting behaviour early childhood", "writing about conflict learning story"],
  },
  {
    slug: "photos-in-learning-stories",
    title: "Using photos in learning stories: consent, privacy and what to avoid",
    angle: "Practical privacy guidance including other children in frame. High anxiety topic, so high trust payoff.",
    intent: "informational", region: "both", category: "guide",
    keywords: ["photo consent early childhood", "photos learning stories privacy"],
  },

  // --- Assessment and compliance: director-level, highest value reader ---
  {
    slug: "ero-documentation-evidence",
    title: "What ERO actually looks for in documentation",
    angle: "Coverage, responsiveness and the link from assessment to planning. Read by directors, who buy centre plans.",
    intent: "problem", region: "NZ", category: "guide",
    keywords: ["ero documentation requirements", "ero evidence learning stories"],
  },
  {
    slug: "acecqa-documentation-requirements",
    title: "ACECQA documentation: what is actually required, and what is habit",
    angle: "Australian equivalent. Separates genuine requirement from things centres do because they always have.",
    intent: "problem", region: "AU", category: "guide",
    keywords: ["acecqa documentation requirements", "nqs documentation"],
  },
  {
    slug: "assessment-for-learning-cycle",
    title: "Notice, recognise, respond: closing the loop",
    angle: "Most documentation stops at notice. The respond step is what turns a folder of stories into planning.",
    intent: "informational", region: "both", category: "guide",
    keywords: ["notice recognise respond", "assessment for learning early childhood"],
  },
  {
    slug: "transition-to-school-report",
    title: "Writing a transition to school summary from a year of stories",
    angle: "Dreaded end-of-year task, seasonal search spike, and only doable well if the stories exist. Strong tie to longitudinal features.",
    intent: "problem", region: "both", category: "guide",
    keywords: ["transition to school report", "school transition summary ece"],
  },

  // --- Commercial: people already comparing ---
  {
    slug: "ai-in-early-childhood-documentation",
    title: "Should AI write learning stories? An honest look",
    angle: "Argue both sides properly, including where AI should not be trusted. Credibility content, and it is the question the whole sector is asking.",
    intent: "commercial", region: "both", category: "article",
    keywords: ["ai learning stories", "ai early childhood documentation", "is ai ethical education"],
  },
  {
    slug: "storypark-alternatives-comparison",
    title: "Storypark, Educa and Kinderloop: what each is actually for",
    angle: "A genuinely fair comparison including where each competitor is stronger. Fairness is what makes it rank and what makes it trusted.",
    intent: "commercial", region: "both", category: "article",
    keywords: ["storypark alternative", "educa vs storypark", "kinderloop comparison"],
  },
];

/** Topics that have not been published yet. */
export function unwrittenTopics(publishedSlugs: string[]) {
  const taken = new Set(publishedSlugs);
  return GUIDE_TOPICS.filter((topic) => !taken.has(topic.slug));
}
