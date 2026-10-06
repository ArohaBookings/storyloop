import { REAL_EXAMPLES, type RealExample } from "./real-examples";

/**
 * The five EYLF V2.0 learning outcomes and their 20 sub-outcomes (the
 * framework calls them key components: 4, 4, 3, 4 and 5; outcome 3 grew from
 * two to three in V2.0, per ACECQA's EYLF V2.0 summary of updates).
 *
 * `title` and every sub-outcome `text` are the wording published in Belonging,
 * Being and Becoming: The Early Years Learning Framework for Australia (V2.0),
 * 2022. Everything else (`plain`, `looks`, `ages`) is StoryLoop's own
 * plain-English example, not framework text, and the pages say so.
 */
export type EylfSubOutcome = { code: string; text: string; looks: string };

export type EylfOutcome = {
  n: 1 | 2 | 3 | 4 | 5;
  /** Path segment under /eylf-learning-outcomes/. */
  slug: string;
  title: string;
  /** The short name educators use for the outcome. */
  short: string;
  plain: string;
  subs: EylfSubOutcome[];
  ages: { babies: string; toddlers: string; preschoolers: string };
};

export const EYLF_SOURCE = {
  label: "Belonging, Being and Becoming: The Early Years Learning Framework for Australia (V2.0), 2022. Australian Government Department of Education, via ACECQA",
  url: "https://www.acecqa.gov.au/sites/default/files/2023-01/Belonging_Being_And_Becoming_V2.0.pdf",
};

export const EYLF_OUTCOMES: EylfOutcome[] = [
  {
    n: 1,
    slug: "outcome-1",
    title: "Children have a strong sense of identity",
    short: "Identity",
    plain: "Children feel secure, know who they are, and are learning to get along with others.",
    subs: [
      { code: "1.1", text: "Children feel safe, secure and supported", looks: "Settles with a familiar educator, asks for help or comfort, joins play with confidence." },
      { code: "1.2", text: "Children develop their emerging autonomy, inter-dependence, resilience and agency", looks: "Puts on their own shoes, makes a choice and sticks with it, bounces back after a tumble." },
      { code: "1.3", text: "Children develop knowledgeable, confident self-identities and a positive sense of self-worth", looks: "Talks about their family or culture, shares a home language, is proud of what they made." },
      { code: "1.4", text: "Children learn to interact in relation to others with care, empathy and respect", looks: "Notices a friend is upset and brings their comforter, waits for a turn." },
    ],
    ages: {
      babies: "Settles when a familiar educator comes back, reaches for comfort when unsure, and lights up at a familiar face or voice.",
      toddlers: "Says \"me do it\", chooses where to sit at morning tea, and brings a comfort toy along to something new.",
      preschoolers: "Talks about their family, culture or home language, takes pride in finishing something hard, and comforts a friend who is upset.",
    },
  },
  {
    n: 2,
    slug: "outcome-2",
    title: "Children are connected with and contribute to their world",
    short: "Community",
    plain: "Children belong to groups and communities, respect difference, notice fairness, and care for the environment.",
    subs: [
      { code: "2.1", text: "Children develop a sense of connectedness to groups and communities and an understanding of their reciprocal rights and responsibilities as active and informed citizens", looks: "Helps set up for morning tea, knows the group's routines, contributes to a group decision." },
      { code: "2.2", text: "Children respond to diversity with respect", looks: "Is curious about a friend's language or food, includes a child who plays differently." },
      { code: "2.3", text: "Children become aware of fairness", looks: "Says “that's not fair” and suggests a way to share, notices someone is left out." },
      { code: "2.4", text: "Children become socially responsible and show respect for the environment", looks: "Waters the garden, puts a slater back under its log, sorts the compost." },
    ],
    ages: {
      babies: "Watches other children with interest and joins a familiar group song with movement or sounds.",
      toddlers: "Helps pack away, notices when a friend is missing, and waters the plants alongside an educator.",
      preschoolers: "Takes part in a group decision, speaks up when something seems unfair, and looks after living things and the environment.",
    },
  },
  {
    n: 3,
    slug: "outcome-3",
    title: "Children have a strong sense of wellbeing",
    short: "Wellbeing",
    plain: "Children are growing strong emotionally and physically, and learning to look after themselves.",
    subs: [
      { code: "3.1", text: "Children become strong in their social, emotional and mental wellbeing", looks: "Names a feeling, takes on a challenge, shares a joke, copes when a plan changes." },
      { code: "3.2", text: "Children become strong in their physical learning and wellbeing", looks: "Climbs to a new branch, practises balancing, uses scissors or a spoon with more control." },
      { code: "3.3", text: "Children are aware of and develop strategies to support their own mental and physical health and personal safety", looks: "Washes hands before eating, asks for a rest, checks the ground before jumping." },
    ],
    ages: {
      babies: "Shows when they are tired or hungry, tries new movements like rolling and crawling, and settles with familiar routines.",
      toddlers: "Washes hands with support, tries a new climbing challenge, and begins to name a big feeling with help.",
      preschoolers: "Manages a disappointment, serves their own food, and explains how to stay safe on the climbing frame.",
    },
  },
  {
    n: 4,
    slug: "outcome-4",
    title: "Children are confident and involved learners",
    short: "Learning",
    plain: "Children are curious, try things out, stick with problems, and use what they learn somewhere new.",
    subs: [
      { code: "4.1", text: "Children develop a growth mindset and learning dispositions such as curiosity, cooperation, confidence, creativity, commitment, enthusiasm, persistence, imagination and reflexivity", looks: "Rebuilds a tower that fell, keeps going with a tricky puzzle, tries a new idea." },
      { code: "4.2", text: "Children develop a range of learning and thinking skills and processes such as problem-solving, inquiry, experimentation, hypothesising, researching and investigating", looks: "Tests which ramp is fastest, asks “why?”, looks up a bug in a book." },
      { code: "4.3", text: "Children transfer and adapt what they have learned from one context to another", looks: "Uses counting from mat time to share out the playdough." },
      { code: "4.4", text: "Children resource their own learning through connecting with people, places, technologies and natural and processed materials", looks: "Fetches the tape to fix their model, asks an older child how they did it." },
    ],
    ages: {
      babies: "Repeats an action to make something happen again and explores objects with their hands and mouth.",
      toddlers: "Fills and tips containers again and again, and tries another way when a puzzle piece will not fit.",
      preschoolers: "Tests ideas about ramps or floating, sticks with a hard task, and uses an idea from one game in another.",
    },
  },
  {
    n: 5,
    slug: "outcome-5",
    title: "Children are effective communicators",
    short: "Communication",
    plain: "Children express themselves in words, gestures, marks, art and technology, and are beginning to read symbols.",
    subs: [
      { code: "5.1", text: "Children interact verbally and non-verbally with others for a range of purposes", looks: "Babbles back in a turn-taking “conversation”, points to ask, negotiates a role in play." },
      { code: "5.2", text: "Children engage with a range of texts and gain meaning from these texts", looks: "Joins in a repeated line of a picture book, retells a story." },
      { code: "5.3", text: "Children express ideas and make meaning using a range of media", looks: "Paints what happened at the beach, builds a “castle for the dragon”, dances a song." },
      { code: "5.4", text: "Children begin to understand how symbols and pattern systems work", looks: "Writes the first letter of their name, makes a colour pattern, recognises a sign." },
      { code: "5.5", text: "Children use digital technologies and media to access information, investigate ideas and represent their thinking", looks: "Takes a photo of their block building, looks at a video to find out how a bird flies." },
    ],
    ages: {
      babies: "Babbles back and forth, points, and uses gestures and facial expressions to share what they notice.",
      toddlers: "Uses first words and short phrases, and joins in songs and the repeated lines of a favourite book.",
      preschoolers: "Tells a story, makes marks and early letters, recognises their name and familiar signs, and photographs their own work.",
    },
  },
];

export function eylfOutcomeBySlug(slug: string) {
  return EYLF_OUTCOMES.find((outcome) => outcome.slug === slug);
}

/**
 * A real Australian draft (lib/real-examples.ts) that links this outcome, with
 * the exact curriculum-link line it wrote. Null when no real draft links it.
 */
export function realExampleForOutcome(n: number): { example: RealExample; line: string } | null {
  for (const example of REAL_EXAMPLES) {
    if (example.framework !== "AU") continue;
    const line = example.story.split("\n").find((text) => text.startsWith(`EYLF Outcome ${n}:`));
    if (line) return { example, line };
  }
  return null;
}
