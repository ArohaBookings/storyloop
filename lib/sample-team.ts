import type { EvidenceChild, EvidenceStory } from "@/lib/evidence-pack";
import type { TeamQueueItem } from "@/lib/team-queue";

/**
 * The sample team (18 Nov 2026): what a leader sees before she has invited
 * anyone, so an empty centre is not an empty screen.
 *
 * Everything here is invented: the educators, the children, the notes and the
 * stories. It lives in code and nowhere else. Nothing is written to a table,
 * so it can never be counted in a story total, a child count, an event or a
 * report, and it can never mix with a real team: every view that shows it
 * shows only it, labelled "Sample" on every card, and it is gone the moment
 * anyone joins the centre (lib/centre-team.ts sampleTeamState).
 *
 * Ids start with "sample-" and are never UUIDs, so no server route will ever
 * accept one.
 */

export const SAMPLE_PREFIX = "sample-";

export function isSampleId(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(SAMPLE_PREFIX);
}

/**
 * Which curriculum the sample speaks (19 Nov 2026): the EYLF for a leader who
 * writes to it, Te Whāriki otherwise, so an Australian leader is not shown
 * New Zealand strands. Read from the profile's default framework.
 */
export type SampleCountry = "NZ" | "AU";

export function sampleCountryFor(defaultFramework: unknown): SampleCountry {
  return defaultFramework === "AU" ? "AU" : "NZ";
}

const EYLF = {
  identity: "Outcome 1: Children have a strong sense of identity",
  community: "Outcome 2: Children are connected with and contribute to their world",
  wellbeing: "Outcome 3: Children have a strong sense of wellbeing",
  learning: "Outcome 4: Children are confident and involved learners",
  communication: "Outcome 5: Children are effective communicators",
} as const;

/** Invented educators. Priya keeps her stories private, to show what that looks like. */
export const SAMPLE_EDUCATORS = [
  { id: "sample-edu-aroha", firstName: "Aroha", shares: true },
  { id: "sample-edu-sam", firstName: "Sam", shares: true },
  { id: "sample-edu-priya", firstName: "Priya", shares: false },
] as const;

/** Stories Priya wrote in the sample: a number, never a story. */
export const SAMPLE_PRIVATE_STORIES = 4;

/** Invented children. Mia is in both Aroha's and Sam's lists and counted once. */
export const SAMPLE_CHILDREN: EvidenceChild[] = [
  { id: "sample-child-mia", name: "Mia" },
  { id: "sample-child-theo", name: "Theo" },
  { id: "sample-child-ana", name: "Ana" },
  { id: "sample-child-kai", name: "Kai" },
  { id: "sample-child-isla", name: "Isla" },
  { id: "sample-child-sione", name: "Sione" },
];

type SampleStory = {
  id: string;
  educator: string;
  childId: string;
  childName: string;
  daysAgo: number;
  note: string;
  story: string;
  outcomes: string[];
  /** The same moment against the EYLF. */
  outcomesAU: string[];
  /** Words that only fit New Zealand, said the Australian way. */
  au?: { note: string; story: string };
  nextStep: { text: string; status: "planned" | "tried" | "continue" } | null;
  reflection: string | null;
  familyVoice: string | null;
  reviewed: boolean;
};

const STORIES: SampleStory[] = [
  {
    id: "sample-story-1",
    educator: "Aroha",
    childId: "sample-child-mia",
    childName: "Mia",
    daysAgo: 1,
    note: "Mia at the water trough. Filled big bucket, tipped it down the guttering. \"It's going fast!\" Tried the small bucket next.",
    story:
      "Mia, today you turned the long guttering by the water trough into a river. You filled the big bucket, tipped it in and watched the water race away. \"It's going fast!\" you called, and then you tried the small bucket to see what would change. You were testing an idea, again and again, until you knew.",
    outcomes: ["Exploration | Mana aotūroa", "Communication | Mana reo"],
    outcomesAU: [EYLF.learning, EYLF.communication],
    nextStep: { text: "Add a second length of guttering and a funnel", status: "planned" },
    reflection: "I waited before offering the small bucket, and Mia got there first.",
    familyVoice: null,
    reviewed: false,
  },
  {
    id: "sample-story-2",
    educator: "Sam",
    childId: "sample-child-theo",
    childName: "Theo",
    daysAgo: 2,
    note: "Theo and Kai building a tower with the big blocks. Theo: \"My turn, then your turn.\" Counted to 8 blocks.",
    story:
      "Theo, you and Kai built a tower almost as tall as you. When you both reached for the same block you said, \"My turn, then your turn,\" and Kai waited. Together you counted eight blocks before it wobbled. Taking turns kept the tower and the friendship standing.",
    outcomes: ["Contribution | Mana tangata", "Exploration | Mana aotūroa"],
    outcomesAU: [EYLF.community, EYLF.learning],
    nextStep: { text: "Offer the long planks for a bridge between two towers", status: "tried" },
    reflection: null,
    familyVoice: "Mum says Theo now asks for turns with his sister at home.",
    reviewed: true,
  },
  {
    id: "sample-story-3",
    educator: "Aroha",
    childId: "sample-child-ana",
    childName: "Ana",
    daysAgo: 4,
    note: "Ana helped a younger child find their shoes. Held their hand to the mat.",
    story:
      "Ana, after lunch you noticed a younger friend looking everywhere for their shoes. You found them under the bench, held out your hand and walked them to the mat. You did not wait to be asked. That is what looking after each other looks like here.",
    outcomes: ["Belonging | Mana whenua", "Wellbeing | Mana atua"],
    outcomesAU: [EYLF.community, EYLF.wellbeing],
    nextStep: null,
    reflection: null,
    familyVoice: null,
    reviewed: false,
  },
  {
    id: "sample-story-4",
    educator: "Sam",
    childId: "sample-child-mia",
    childName: "Mia",
    daysAgo: 6,
    note: "Mia painting with two colours, mixing on the page. \"Look, it's green now.\"",
    story:
      "Mia, you painted with blue and yellow side by side, then swirled them together. \"Look, it's green now,\" you said, and went straight back to try it with red. You were finding out what colours do when they meet.",
    outcomes: ["Exploration | Mana aotūroa"],
    outcomesAU: [EYLF.learning],
    nextStep: { text: "Put out a third colour and a mixing palette", status: "continue" },
    reflection: null,
    familyVoice: null,
    reviewed: false,
  },
  {
    id: "sample-story-5",
    educator: "Aroha",
    childId: "sample-child-kai",
    childName: "Kai",
    daysAgo: 9,
    note: "Kai sang the whole waiata at mat time for the first time.",
    story:
      "Kai, at mat time today you sang every word of our waiata, from the first line to the last. Your voice was strong and you smiled at the end. Learning the words has taken weeks of listening, and today it was all there.",
    outcomes: ["Communication | Mana reo", "Belonging | Mana whenua"],
    outcomesAU: [EYLF.communication, EYLF.identity],
    au: {
      note: "Kai sang the whole song at mat time for the first time.",
      story:
        "Kai, at mat time today you sang every word of our song, from the first line to the last. Your voice was strong and you smiled at the end. Learning the words has taken weeks of listening, and today it was all there.",
    },
    nextStep: { text: "Ask Kai to lead the first line next week", status: "planned" },
    reflection: null,
    familyVoice: "Kai's dad says he sings it in the car every morning.",
    reviewed: false,
  },
  {
    id: "sample-story-6",
    educator: "Sam",
    childId: "sample-child-isla",
    childName: "Isla",
    daysAgo: 12,
    note: "Isla climbing the frame, tried the high bar three times, made it on the third.",
    story:
      "Isla, you climbed to the high bar on the frame and reached for it three times. The first two times you came back down. The third time you held on and pulled yourself up. You kept going until your body did what you asked of it.",
    outcomes: ["Wellbeing | Mana atua"],
    outcomesAU: [EYLF.wellbeing],
    nextStep: null,
    reflection: "Worth noticing how Isla rests between tries.",
    familyVoice: null,
    reviewed: false,
  },
];

function daysBefore(now: Date, days: number) {
  return new Date(now.getTime() - days * 86_400_000);
}

/** One sample story in the leader's own curriculum. */
function localised(story: SampleStory, country: SampleCountry) {
  if (country !== "AU") return { note: story.note, story: story.story, outcomes: story.outcomes };
  return { note: story.au?.note ?? story.note, story: story.au?.story ?? story.story, outcomes: story.outcomesAU };
}

/** The sample review queue, newest first, dated from today. */
export function sampleQueue(now = new Date(), country: SampleCountry = "NZ"): TeamQueueItem[] {
  return STORIES.map((story) => ({
    id: story.id,
    author: story.educator,
    childName: story.childName,
    createdAt: daysBefore(now, story.daysAgo).toISOString(),
    storyText: localised(story, country).story,
    note: localised(story, country).note,
    outcomes: localised(story, country).outcomes,
    review: story.reviewed ? { status: "looks_good" as const, note: null, reviewer: "You", at: daysBefore(now, story.daysAgo - 1).toISOString() } : null,
  })).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** The sample team's evidence: the same input the real evidence pack takes. */
export function sampleEvidence(
  now = new Date(),
  localDate: (value: Date) => string = (value) => value.toISOString().slice(0, 10),
  country: SampleCountry = "NZ",
): {
  children: EvidenceChild[];
  stories: EvidenceStory[];
} {
  return {
    children: SAMPLE_CHILDREN.map((child) => ({ ...child })),
    stories: STORIES.map((story) => ({
      id: story.id,
      childId: story.childId,
      date: localDate(daysBefore(now, story.daysAgo)),
      title: null,
      summary: localised(story, country).story.split(". ")[0] ?? null,
      outcomes: localised(story, country).outcomes,
      dispositions: [],
      nextSteps: story.nextStep ? [story.nextStep] : [],
      reflection: story.reflection,
      familyVoice: story.familyVoice,
    })),
  };
}
