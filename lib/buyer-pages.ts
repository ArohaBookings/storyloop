import type { AnswerBlockId } from "@/lib/answer-blocks";
import { educatorOffer } from "@/lib/offer-wording";
import { heldPageOn } from "@/lib/held-pages";

/**
 * Pages for the people who buy (18 Nov 2026, the search re-aim).
 *
 * Why these exist. Search clicks were growing with people who want free
 * material: guides, examples and the blog turned 0.6% of visits into signups
 * and almost no payers, while product pages turned about 3.3%. Leo: "You need
 * to be attracting the right people, the people that actually buy." These
 * pages are for the three buyers the 18 Nov 2026 search research named, with
 * its independent check's corrections applied:
 *
 * - the educator who pays for herself, who types a tool search ("ai tools for
 *   early childhood educators", "ai observation writer for childcare"). Her
 *   first screen is the product: a real note, what StoryLoop wrote from it,
 *   and the note box.
 * - the centre decision-maker, who searches a job (an AI policy for an NZ
 *   service, the workload, the educational leader's checks, Exceeding). Her
 *   first screen says what StoryLoop does for that job and gives one action.
 * - the parent who asks her centre. Search will not bring her (parent searches
 *   about learning stories barely exist); the family link and shared stories
 *   will. Her page gives her a message to copy.
 *
 * The free pages stay as they are; no new free-material page is added here.
 * Every product claim is true in the code on 18 Nov 2026 (no team review
 * queue, no team-wide evidence: a leader sees who is writing and when, and
 * reads a story when an educator shares it or sends it to be checked). Copy
 * rules: teacher to teacher, NZ and Australian spelling, no rival named or
 * alluded to, nothing about pausing or cancelling, the centre's free period
 * only through the shared token ({centre_trial}), first names only.
 *
 * Each page also carries its answers to the audience test (`audience`):
 * who it is for, what she typed, and what the first phone screen lets her do.
 */

export type BuyerAudience = "educator" | "centre" | "parent";

export type BuyerAction =
  /** A real note, what StoryLoop wrote from it, and the note box (the public demo). */
  | { kind: "note"; proof: "visitor" | "AU" | "NZ"; framework?: "NZ" | "AU" }
  /** Start the centre's free period: one button, the shared offer line under it. */
  | { kind: "centre" }
  /** A message an educational leader copies to her team. */
  | { kind: "leader_ask" }
  /** A message a parent copies or emails to her centre. */
  | { kind: "parent_ask" }
  /** The AI policy generator (no model call, nothing leaves the browser). */
  | { kind: "policy" };

export type BuyerSection = {
  id: string;
  heading: string;
  /** May hold the {centre_trial} token. */
  paragraphs?: string[];
  list?: string[];
  /** A link under the section. */
  link?: { href: string; label: string };
};

export type BuyerPage = {
  slug: string;
  audience: {
    buyer: BuyerAudience;
    who: string;
    /** What she typed: phrases seen in Google or Bing suggestions on 18 Nov 2026 (none for the parent page). */
    typed: string[];
    /** What the first phone screen (393 by 673) lets her do with the product in 10 seconds. */
    firstScreen: string;
  };
  title: string;
  description: string;
  kicker: string;
  h1: string;
  /** One line under the H1. Optional: some first screens say it with the example instead. */
  lead?: string;
  action: BuyerAction;
  sections: BuyerSection[];
  /**
   * Parts of one real draft, word for word as StoryLoop wrote them
   * (lib/real-examples.ts), shown under the sections: proof of what a story
   * carries, never an invented example.
   */
  example?: { slug: string; headings: string[]; heading: string; caption: string };
  answers: AnswerBlockId[];
  faqs: Array<{ q: string; a: string }>;
  related: Array<{ href: string; title: string; body: string }>;
  sources?: Array<{ label: string; url: string }>;
  /**
   * Sections that print, with the H1, when someone prints the page (a print
   * stylesheet, never a download or a Print button on the first screen).
   * Without it nothing but the page's own action prints.
   */
  printSections?: string[];
  reviewedAt: string;
};

const REVIEWED = "2026-11-18";

// Prices and the trial from lib/plans.ts and lib/offer-wording.ts, never typed out.
const EDUCATOR_AU = educatorOffer("AUD");
const EDUCATOR_NZ = educatorOffer("NZD");

const NZEI_RELEASE = {
  label: "NZEI Te Riu Roa: largest ECE survey in years highlights teachers under pressure",
  url: "https://www.nzeiteriuroa.org.nz/mi/about-us/media-releases/largest-ece-survey-in-years-kōriporipo-highlights-teachers-under-pressure",
};
const OPC_AI = {
  label: "Office of the Privacy Commissioner: Artificial intelligence",
  url: "https://www.privacy.org.nz/resources-and-learning/a-z-topics/ai/",
};
const ERO_TRANSFER = {
  label: "ERO: the transfer of regulation to ERO",
  url: "https://www.ero.govt.nz/early-learning/understanding-our-regulatory-role-in-ece-and-kohungahunga/learn-about-the-transfer-of-regulations-to-ero",
};
const ACECQA_QA7 = {
  label: "ACECQA: Quality Area 7, Governance and leadership",
  url: "https://www.acecqa.gov.au/nqf/national-quality-standard/quality-area-7-governance-and-leadership",
};
const ACECQA_13 = {
  label: "ACECQA: Element 1.3.1 Assessment and planning cycle",
  url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning/element-131-assessment-and-planning-cycle",
};
const ACECQA_NQS = {
  label: "ACECQA: the National Quality Standard",
  url: "https://www.acecqa.gov.au/nqf/national-quality-standard",
};
const ACECQA_AR = {
  label: "ACECQA: the assessment and rating process",
  url: "https://www.acecqa.gov.au/assessment/assessment-and-rating-process",
};
const SECTOR_EXCEEDING = {
  label: "The Sector: Exceeding NQS in 2026, what the latest ACECQA data tells us",
  url: "https://thesector.com.au/article/exceeding-nqs-2026-acecqa-latest-data-quality-practice",
};

const PAGES = {
  "ai-for-early-childhood-educators": {
    slug: "ai-for-early-childhood-educators",
    audience: {
      buyer: "educator",
      who: "An educator or kaiako who writes her own learning stories and would pay for help with them",
      typed: ["ai tools for early childhood educators", "ai for early childhood educators", "ai for ece teachers", "free ai for early childhood education"],
      firstScreen: "See a real note and what StoryLoop wrote from it, then type her own note in the box and press Write my story (no signup).",
    },
    title: "AI for early childhood educators: what helps, what to avoid",
    description:
      "Where AI saves an educator real time (learning stories, observations, summaries), what never to put in, and how to keep your own voice. Free to try.",
    kicker: "AI for early childhood educators",
    h1: "The noticing is yours. The typing does not have to be.",
    action: { kind: "note", proof: "visitor" },
    sections: [
      {
        id: "where-it-helps",
        heading: "Where AI helps an educator",
        list: [
          "Learning stories: you jot a note after play, and StoryLoop drafts the story, the learning, the curriculum links and where to next.",
          "No typing: say the note out loud, or photograph the page you jotted it on.",
          "Child statements and end-of-year summaries, drafted from what you have already written.",
          "A family message and a question to ask at home, from the saved story, on the Educator plan and up.",
        ],
      },
      {
        id: "never-goes-in",
        heading: "What never goes in",
        paragraphs: [
          "Surnames, dates of birth, addresses and anything clinical. StoryLoop's privacy check flags details like these if they slip into a note.",
          "Photos of children. If you photograph anything, photograph your notes, never children.",
        ],
      },
      {
        id: "your-voice",
        heading: "Keeping your own voice",
        paragraphs: [
          "The child's words stay exactly as you wrote them, and every draft lists anything it had to assume. You choose the tone, change any line, and nothing is shared until you say so. The draft is where you start, and you sign it off.",
        ],
        link: { href: "/accuracy", label: "How every draft is tested" },
      },
      {
        id: "your-centre",
        heading: "What your centre may ask",
        paragraphs: [
          "Your service may have an AI policy that says which tools educators may use and what must never go into one. If it has not, the free generator writes one in ten minutes, for Australia or for Aotearoa.",
        ],
        link: { href: "/ai-policy-nz-early-childhood", label: "An AI policy for services in Aotearoa" },
      },
    ],
    answers: ["A", "B", "D"],
    faqs: [
      {
        q: "Do I need my centre's permission?",
        a: "Check your service's AI policy or ask your leader first. StoryLoop is built to fit one: first names only, a draft you check, and nothing shared until you choose.",
      },
      {
        q: "Can I use it on my phone?",
        a: "Yes. It works in the browser on any phone, tablet or computer, with nothing to install. Say your note out loud, or photograph the page you jotted it on.",
      },
    ],
    related: [
      { href: "/for-educators", title: "What StoryLoop does for you", body: "From a quick note after play to a finished story, before you leave." },
      { href: "/ai-childcare-observations", title: "AI childcare observations", body: "A jotting in, an EYLF V2.0 learning story out, with the reason for each outcome link." },
      { href: "/safety", title: "Children's information and AI", body: "Where a note goes, what the AI can and cannot do with it, and your choices." },
      { href: "/examples", title: "12 real notes and drafts", body: "Real notes and the drafts StoryLoop wrote from them, unedited." },
    ],
    reviewedAt: REVIEWED,
  },

  "ai-childcare-observations": {
    slug: "ai-childcare-observations",
    audience: {
      buyer: "educator",
      who: "An Australian educator who writes observations for her room and would pay to stop writing them at night",
      typed: ["ai observation writer for childcare", "childcare observation ai", "ai childcare observations", "childcare observation app"],
      firstScreen: "See a real jotting and the EYLF V2.0 outcome link StoryLoop wrote from it, with its reason, then type her own jotting and press Write my story (no signup).",
    },
    title: "AI observation writer for childcare, from your own notes",
    description:
      "Turn a quick note or voice memo into an EYLF V2.0 observation, written as a learning story in about a minute. You check every word. Free for 3 a month.",
    kicker: "AI childcare observations · EYLF V2.0",
    h1: "EYLF observations from your own note.",
    action: { kind: "note", proof: "AU", framework: "AU" },
    sections: [
      {
        id: "three-ways",
        heading: "The same moment, three ways",
        paragraphs: [
          "A jotting is what you write in the moment. An observation records what happened. A learning story tells it as a short narrative, with what it shows and what comes next. Start from the jotting: StoryLoop writes it up as a learning story, and the observation is in it.",
        ],
        link: { href: "/observation-methods-early-childhood", label: "Observation methods, side by side" },
      },
      {
        id: "reasons",
        heading: "Outcome links with a reason, not a code",
        paragraphs: [
          "Each EYLF V2.0 outcome comes with a sentence on why, pointing at what the child did or said. An outcome is linked only when your note gives evidence for it, and you can change any link.",
        ],
      },
      {
        id: "voice-photo",
        heading: "Say it, or photograph your notebook",
        paragraphs: [
          "Record a voice memo after play, or take a photo of the page you jotted on. The words land in the box for you to check. Photograph your notes only, never children.",
        ],
      },
      {
        id: "cost",
        heading: "What it costs",
        paragraphs: [
          `Free for 3 stories a month, no card. Educator is ${EDUCATOR_AU.perMonth} for unlimited stories (${EDUCATOR_NZ.priceLabel} in New Zealand), after a ${EDUCATOR_AU.trialLine}.`,
        ],
        link: { href: "/pricing", label: "Every plan and price" },
      },
    ],
    answers: ["E", "D"],
    faqs: [
      {
        q: "Is a learning story an observation?",
        a: "It is one way to write one. A learning story records what happened, then adds what it shows about the child's learning and what comes next. Many services use it as well as jottings and anecdotal records.",
      },
      {
        q: "Will it link to the right outcome?",
        a: "It links only the outcomes your note shows, each with the reason, and leaves out any your note gives no evidence for. You can change or remove any link before you use it.",
      },
    ],
    related: [
      { href: "/eylf-observation-examples", title: "EYLF observation examples", body: "Six notes, the observations written from them and the V2.0 link for each." },
      { href: "/eylf-learning-outcomes", title: "The 5 EYLF learning outcomes", body: "All 20 V2.0 sub-outcomes in plain English, with what each looks like in play." },
      { href: "/eylf-learning-stories", title: "EYLF learning stories", body: "Writing V2.0 learning stories that link outcomes to what actually happened." },
      { href: "/ai-for-early-childhood-educators", title: "AI for early childhood educators", body: "What helps, what never goes in, and how to keep your own voice." },
    ],
    reviewedAt: REVIEWED,
  },

  "educational-leader-checklist": {
    slug: "educational-leader-checklist",
    audience: {
      buyer: "centre",
      who: "An educational leader or head teacher who checks her team's documentation (the person who brings a tool into a centre)",
      // 25 Nov 2026 re-aim (analysis/search.json new_pages): leaders search the role, not the checklist.
      typed: ["educational leader", "educational leader role", "educational leader resources", "educational leader checklist", "educational leader responsibilities"],
      firstScreen: "Copy, in one tap, a message asking her team to write one story in StoryLoop and send it to her to check: the first real story check of her own team's work.",
    },
    title: "Educational Leader Role: What It Is and a Weekly Checklist",
    description:
      "What the educational leader role is under the National Regulations and the NQS, a weekly checklist, and how to check a learning story in two minutes.",
    kicker: "For educational leaders and head teachers",
    h1: "The educational leader role, and a checklist for the week.",
    lead: "The quickest check is one real story. Ask an educator to send you one.",
    action: { kind: "leader_ask" },
    sections: [
      {
        id: "the-role",
        heading: "What the educational leader role is",
        paragraphs: [
          "Every approved service in Australia must have one. Regulation 118 of the Education and Care Services National Regulations says the approved provider designates a suitably qualified and experienced educator, co-ordinator or other person as educational leader, to lead the development and implementation of educational programs.",
          "Element 7.2.2 of the National Quality Standard says the educational leader is supported and leads the development and implementation of the educational program and assessment and planning cycle. In a week, that mostly means reading the team's documentation, coaching, and keeping the cycle moving. In Aotearoa the head teacher or curriculum leader often does the same job.",
        ],
      },
      {
        id: "weekly",
        heading: "Every week",
        list: [
          "Read one learning story from each room, with the educator's note beside it.",
          "Check the story shows what the child did and said, not a summary of the day.",
          "Check each curriculum link points at something that happened.",
          "Check there is a next step the room can act on this week.",
          "Ask one educator what she noticed that she has not written up yet.",
        ],
      },
      {
        id: "monthly",
        heading: "Every month",
        list: [
          "Look for children with no story this month: count names, not pages.",
          "Read last month's next steps against the planning. Did they happen?",
          "Look for family voice: is what families told you showing up in stories?",
          "Talk through one story as a team: what we noticed, what we missed.",
          "Ask where stories get written: in the day, or taken home.",
        ],
      },
      {
        id: "each-term",
        heading: "Each room, each term",
        list: [
          "Every child has stories across the outcomes or strands, not just one.",
          "Statements and summaries due this term are planned, child by child.",
          "The room's documentation reads like your service's philosophy.",
          "Relievers and new staff know how the room documents.",
          "Any use of AI follows your service's AI policy.",
        ],
        link: { href: "/ai-policy", label: "Write an AI policy in ten minutes" },
      },
      {
        id: "one-story",
        heading: "Checking one story in two minutes",
        paragraphs: [
          "Five questions, in order. Is it true to the note? Are the child's words exactly theirs? Does each link point at something that happened? Is there a next step somebody could do next week? Would this family be glad to read it? Say one thing that is right and one thing to change, and let the educator change it.",
        ],
        link: { href: "/how-to-check-a-learning-story", label: "The two-minute check, in full" },
      },
      {
        id: "leader-check",
        heading: "Check a story with the educator's note beside it",
        paragraphs: [
          "In StoryLoop an educator taps Check with my leader on a story, and you get a private link, by email from StoryLoop or from her, that opens that one story with her note beside it. You need no account to read it. Tap Looks good, or Suggest a change and say what, and she sees your answer. The link lasts 14 days and she can stop it at any time.",
        ],
      },
      {
        id: "unnoticed",
        heading: "Seeing which children have gone unnoticed",
        paragraphs: [
          "In StoryLoop, each educator on Educator Pro or a centre plan sees which of her children have had no captured moment in 8 working days. As a leader on a centre plan you see who on the team is writing and when each educator last wrote. You read a story when an educator shares it or sends it to you to check.",
        ],
      },
      {
        id: "for-your-centre",
        heading: "For your centre",
        paragraphs: [
          "One flat price for the team, with unlimited children and no per-child fee. {Centre_trial}, no card.",
        ],
        link: { href: "/for-centres", label: "StoryLoop for a whole centre" },
      },
    ],
    answers: ["C"],
    faqs: [
      {
        q: "What is the educational leader's job?",
        a: "Element 7.2.2 of the National Quality Standard reads: \"The educational leader is supported and leads the development and implementation of the educational program and assessment and planning cycle.\" Reading the team's documentation is one of the plainest ways to lead that cycle.",
      },
      {
        q: "How many stories should I check?",
        a: "There is no number in the National Quality Standard. A few from each educator each month, and more for somebody new, is a sensible place to start.",
      },
      {
        q: "Do I need a StoryLoop account to check a story?",
        a: "No. The educator sends you a private link that opens one story with her note beside it. It lasts 14 days, and she can stop it at any time.",
      },
    ],
    related: [
      { href: "/how-to-check-a-learning-story", title: "How to check a learning story", body: "Five questions a leader can ask in two minutes, and feedback that helps." },
      { href: "/nqs-standard-1-3-assessment-and-planning", title: "NQS Standard 1.3", body: "What assessors look for in assessment and planning, element by element." },
      { href: "/exceeding-nqs-documentation", title: "Exceeding the NQS", body: "The three themes, and what your documentation has to show." },
      { href: "/critical-reflection-early-childhood", title: "Critical reflection", body: "Three examples, a filled-in template and the NQS 1.3.2 evidence list." },
    ],
    sources: [ACECQA_QA7, ACECQA_13],
    // Correction C19: no Print link on screen one; the print stylesheet stays, for the three lists.
    printSections: ["weekly", "monthly", "each-term"],
    reviewedAt: REVIEWED,
  },

  "documentation-workload-early-childhood": {
    slug: "documentation-workload-early-childhood",
    audience: {
      buyer: "centre",
      who: "A centre owner, manager or head teacher who wants her team's paperwork out of their evenings",
      typed: ["child care paperwork software", "documentation workload", "early childhood teacher workload"],
      firstScreen: "Read in one line what StoryLoop does for her team (a learning story drafted from a short note, in the day) and start her centre's free period with one button, no card.",
    },
    title: "Cutting documentation time in early childhood, not quality",
    description:
      "Why documentation spills into educators' evenings, what a centre can change this term, and how to see the hours it takes your own team.",
    kicker: "For owners, managers and head teachers",
    h1: "Get documentation out of your team's evenings.",
    lead: "Each educator jots a note after play. StoryLoop drafts the learning story with Te Whāriki or EYLF links, and she checks every word, in the day.",
    action: { kind: "centre" },
    sections: [
      {
        id: "survey",
        heading: "What the survey found",
        paragraphs: [
          "In NZEI Te Riu Roa's 2023 survey of early childhood teachers and staff, with more than 4,000 responses, 44% said they spend up to an hour or more each day on unpaid work. The survey does not split out documentation, so read it as the size of the problem, not the share that is stories.",
        ],
      },
      {
        id: "where-time-goes",
        heading: "Where the time goes",
        paragraphs: [
          "Not in the noticing. Educators know what they saw. The time goes on the blank page: remembering the detail hours later, deciding what the learning was, and finding curriculum wording that fits. A note taken in the moment does most of the remembering.",
        ],
      },
      {
        id: "five-changes",
        heading: "Five changes a centre can make this term",
        list: [
          "Use non-contact time for writing, not for catching up on everything else.",
          "Ask for shorter stories: three short paragraphs is enough for most moments.",
          "Jot two lines in the moment, so nobody writes from memory at night.",
          "Agree what a good story looks like, so nobody over-writes to be safe.",
          "Keep the leader's check to two minutes, with the note beside the story.",
        ],
      },
      {
        id: "your-numbers",
        heading: "See your own numbers",
        paragraphs: [
          "Put in your team, your children and how long a story takes now. The calculator shows the hours each month and what they cost, in NZD or AUD, from your figures only.",
        ],
        link: { href: "/documentation-time-calculator", label: "Work out your team's hours" },
      },
      {
        id: "where-storyloop-fits",
        heading: "Where StoryLoop fits",
        paragraphs: [
          "Your educators write each story from a short note, in the day, and check every word before anything is shared. On a centre plan every educator has unlimited stories and her own login. Nothing changes for families: stories go into the app your centre already uses.",
        ],
        link: { href: "/for-centres", label: "StoryLoop for a whole centre" },
      },
    ],
    answers: ["G", "C"],
    faqs: [
      {
        q: "Will StoryLoop cut our documentation time?",
        a: "It takes away the blank page: an educator starts from a draft of her own note instead of from nothing. How much time that gives back depends on your team, and the calculator shows the arithmetic for your own figures.",
      },
      {
        q: "Does anything change for families?",
        a: "No. Educators copy each finished story into the app your centre already uses for families.",
      },
    ],
    related: [
      { href: "/documentation-time-calculator", title: "Documentation time calculator", body: "Your team's hours on learning stories each month, and what they cost." },
      { href: "/how-long-should-a-learning-story-take", title: "How long should a story take?", body: "Why the blank page costs more than the writing, and what to do about it." },
      { href: "/educational-leader-checklist", title: "Educational leader checklist", body: "What to check each week, month and term, in two minutes a story." },
      { href: "/for-centres", title: "For centres", body: "One price for the whole team, and documentation done in the day." },
    ],
    sources: [NZEI_RELEASE],
    reviewedAt: REVIEWED,
  },

  "ask-your-centre": {
    slug: "ask-your-centre",
    audience: {
      buyer: "parent",
      who: "A parent or whānau member who would like more stories about her child's learning",
      typed: [],
      firstScreen: "Copy (or email) a short, friendly message to her child's centre in one tap. Nothing she types is stored.",
    },
    title: "Would you like more stories about your child's learning?",
    description:
      "A short message you can send your child's centre about StoryLoop, which helps teachers write learning stories from a quick note, during the day.",
    kicker: "For families",
    h1: "Want more stories about your child's learning? Ask your centre.",
    lead: "Learning stories take time to write. StoryLoop helps teachers write one from a quick note, during the day.",
    action: { kind: "parent_ask" },
    sections: [
      {
        id: "what-it-is",
        heading: "What a learning story is",
        paragraphs: [
          "A short story about something your child did, what it shows about their learning, and what the teachers will do next. Many end with an idea for home.",
        ],
        link: { href: "/what-is-a-learning-story", label: "What is a learning story?" },
      },
      {
        id: "information",
        heading: "What happens to your child's information",
        paragraphs: [
          "StoryLoop asks teachers to use your child's first name only. Notes are stored in Sydney, Australia. To write a draft, a note goes to an AI provider in the United States, under business terms that do not allow it to be used to train their models. A teacher checks every word, and nothing is shared until a teacher chooses.",
        ],
        link: { href: "/safety", label: "Children's information and AI, in plain words" },
      },
      {
        id: "enrolment-question",
        heading: "A question worth asking",
        paragraphs: [
          "Ask how often you will get a story about your child's learning, and how you can add what you see at home.",
        ],
      },
    ],
    answers: [],
    faqs: [
      {
        q: "Will my child's photo go into StoryLoop?",
        a: "No. StoryLoop has no photo or video sharing. Teachers write from their own notes.",
      },
      {
        q: "Would the centre have to change its app?",
        a: "No. Teachers copy each finished story into the app the centre already uses, so you keep getting stories the way you do now.",
      },
      {
        q: "Is anything I type here saved?",
        a: "No. The message is yours to copy or email. Nothing you type on this page is sent to StoryLoop.",
      },
    ],
    related: [
      { href: "/what-is-a-learning-story", title: "What is a learning story?", body: "Where they came from, the three parts, and how to read one." },
      { href: "/for-families", title: "For families", body: "What you will see, in plain words and your own language." },
      { href: "/learning-stories-in-family-languages", title: "Stories in your own language", body: "How teachers can share a story in the language your family reads." },
      { href: "/safety", title: "Children's information and AI", body: "Where a note goes, and what the AI can and cannot do with it." },
    ],
    reviewedAt: REVIEWED,
  },

  "ai-policy-nz-early-childhood": {
    slug: "ai-policy-nz-early-childhood",
    audience: {
      buyer: "centre",
      who: "A head teacher, manager or owner of an early learning service in Aotearoa who has been asked how the team uses AI",
      typed: ["ai policy template nz", "early years ai policy"],
      firstScreen: "Start her service's AI policy straight away: type the service's name and the policy writes itself below, in kaiako, tamariki and whānau terms, with StoryLoop already listed as an approved tool she can change.",
    },
    title: "AI policy template for NZ early childhood services",
    description:
      "A free AI policy for your early learning service in Aotearoa: what kaiako may use AI for, what never goes in, and how you tell whānau. Ten minutes.",
    kicker: "For services in Aotearoa New Zealand",
    h1: "A free AI policy for your service in Aotearoa, ready in ten minutes.",
    lead: "Answer a few questions and the policy is written as you go. Nothing you type leaves your browser.",
    action: { kind: "policy" },
    sections: [
      {
        id: "do-you-have-to",
        heading: "Do you have to have one?",
        paragraphs: [
          "We found no New Zealand rule that requires an early childhood service to have an AI policy (checked 18 November 2026). Having one is good practice. The Privacy Commissioner's starting point is that the Privacy Act 2020 applies to everyone using AI tools, so before your team uses one you need to understand how it handles tamariki's information. A short written policy is the plain way to show that you do.",
          "Since 1 September 2026, ERO regulates early childhood services as well as reviewing them.",
        ],
      },
      {
        id: "may-use",
        heading: "What kaiako may use AI for",
        paragraphs: [
          "Drafting from their own notes: learning stories, summaries and versions for whānau, which the kaiako then checks and signs off. Never for deciding what a tamaiti learned, and never in place of the kaiako's own noticing.",
        ],
      },
      {
        id: "never-in",
        heading: "What never goes in",
        paragraphs: [
          "Tamariki's names, photos, health or developmental information, whānau circumstances or any other identifying detail, in any general AI tool that is not on your approved list. That includes free chat assistants on a personal phone.",
        ],
      },
      {
        id: "whanau",
        heading: "Telling whānau",
        paragraphs: [
          "Pick one of three ways: tell whānau that kaiako may use approved tools, let any whānau say no for their tamaiti, or ask first. The generator writes the paragraph for the way you choose.",
        ],
      },
      {
        id: "who-checks",
        heading: "Who checks",
        paragraphs: [
          "The kaiako who saw the moment reviews every draft before it is shared or kept. Your policy can name a second reader, usually the head teacher or a senior kaiako.",
        ],
        link: { href: "/how-to-check-a-learning-story", label: "How to check a learning story in two minutes" },
      },
      {
        id: "learning-stories",
        heading: "Using AI for learning stories",
        paragraphs: [
          "A policy names the tools your team may use. StoryLoop is built for learning stories: first names only, notes stored in Sydney, drafts written by an AI provider in the United States under business terms that do not allow training on them, and the kaiako checks every line. A whole centre can start {centre_trial}, no card.",
        ],
        link: { href: "/for-centres", label: "StoryLoop for a whole centre" },
      },
    ],
    answers: ["F_NZ", "D"],
    faqs: [
      {
        q: "Is this legal advice?",
        a: "No. It is a practical starting point built from the Privacy Commissioner's guidance. Review it against your own service's governance and get your own advice where you need it.",
      },
      {
        q: "Is the policy written by AI?",
        a: "No. Every sentence is written in advance and put together from your answers, so it cannot invent a clause or a legal requirement.",
      },
    ],
    related: [
      { href: "/ai-policy", title: "The AI policy generator", body: "The same generator, for services in Australia or Aotearoa." },
      { href: "/safety", title: "Children's information and AI", body: "Where a note goes, what the AI can and cannot do with it, and your choices." },
      { href: "/te-whariki-learning-stories", title: "Te Whāriki learning stories", body: "How a story links to strands and outcomes honestly, with a real example." },
      { href: "/ero-early-childhood-regulation-2026", title: "ERO now regulates early childhood", body: "What changed on 1 September 2026, and what it means for you." },
    ],
    sources: [OPC_AI, ERO_TRANSFER],
    reviewedAt: REVIEWED,
  },

  // Held, and aimed back at Exceeding (builder X3, 25 Nov 2026). Lane C re-aimed this page at
  // "assessment and rating" that morning, but the live /assessment-and-rating-evidence already serves
  // that search and is re-aimed at it behind its own switch (lib/seo-pages-held.ts). Two of our pages
  // must not split one search, so this one keeps the Exceeding words it was built with on 19 Nov and
  // stays held (lib/held-pages.ts "exceeding-nqs-documentation": false). Its sections stay as built.
  "exceeding-nqs-documentation": {
    slug: "exceeding-nqs-documentation",
    audience: {
      buyer: "centre",
      who: "An Australian director or educational leader working towards an Exceeding rating",
      typed: ["exceeding nqs themes", "exceeding nqs meaning", "exceeding nqs theme guidance", "nqf exceeding themes"],
      firstScreen: "Read the three Exceeding themes in one sentence and start her centre's free period with one button, no card (or jump to a real story that shows them).",
    },
    title: "Exceeding NQS: what your documentation needs to show",
    description:
      "The three Exceeding themes in plain words, and what an assessor looks for in your learning stories, planning and reflection to see them.",
    kicker: "For directors and educational leaders · NQS",
    h1: "Exceeding the NQS: what your documentation has to show.",
    // The three themes, as ACECQA names them (checked against ACECQA's own documents, 19 Nov 2026).
    lead: "For a Standard to be rated Exceeding, an assessor must see three themes in practice: embedded in service operations, informed by critical reflection, and shaped by meaningful engagement with families and/or the community.",
    action: { kind: "centre" },
    sections: [
      {
        id: "visit",
        heading: "What happens at a visit",
        list: [
          "Your regulatory authority tells you the visit is coming and asks for your Quality Improvement Plan.",
          "An authorised officer spends time in the rooms: they observe, discuss and sight. Documentation is what they sight.",
          "You get a draft report and can give feedback on it before the final report.",
          "Each quality area gets a rating, and the service gets an overall rating: Significant Improvement Required, Working Towards, Meeting or Exceeding the NQS. Excellent is a separate application to ACECQA.",
        ],
        link: { href: "/assessment-and-rating-evidence", label: "The evidence to have ready" },
      },
      {
        id: "quality-area-1",
        heading: "Quality Area 1, the documentation an assessor reads",
        list: [
          "1.3.1 Assessment and planning cycle: each child's learning is assessed as part of an ongoing cycle of observation, analysis, documentation, planning, implementation and reflection. Show the cycle for one child, from a note to a next step that happened.",
          "1.3.2 Critical reflection: reflection on children's learning, as individuals and in groups, drives planning. Show a team conversation that changed what you offered.",
          "1.3.3 Information for families: families are told about the program and their child's progress. Show stories families have read, and what they said back.",
        ],
        link: { href: "/nqs-standard-1-3-assessment-and-planning", label: "Standard 1.3, element by element" },
      },
      {
        id: "themes",
        heading: "What Exceeding needs: three themes",
        list: [
          "Embedded in service operations: the practice is usual for that Standard, across the service, not a one-off.",
          "Informed by critical reflection: the team keeps questioning and re-evaluating its practice to make it better for children, families and educators.",
          "Shaped by meaningful engagement with families and/or the community: the practice is tailored to the families and community you have.",
        ],
        paragraphs: [
          "A Standard is rated Exceeding only when all three themes are shown in practice for that Standard.",
        ],
      },
      {
        id: "gaps",
        heading: "Where documentation usually falls short",
        list: [
          "Stories that describe the activity, not the child.",
          "Curriculum links with no reason.",
          "Next steps too vague to act on, that nobody comes back to.",
          "Family voice that never reaches the next story.",
          "Reflection written once a term, not part of the week.",
        ],
      },
      {
        id: "two-weeks",
        heading: "A two-week tidy-up plan for the leader",
        list: [
          "Week 1: count stories per child this term, not pages, and list the children with none.",
          "Week 1: read one story from each educator with the five questions: true to the note, the child's own words, a reason for each link, a next step, would the family be glad to read it.",
          "Week 1: check last month's next steps against the planning. Did they happen?",
          "Week 2: write up the children with no story, from notes the team already has.",
          "Week 2: talk one story through as a team, and write down what you would change.",
          "Week 2: check family voice is reaching the next story.",
        ],
      },
      {
        id: "how-storyloop-helps",
        heading: "How StoryLoop helps a team",
        paragraphs: [
          "Every draft keeps the child's words exactly, names the learning, links each outcome with a reason, suggests where to next and adds a line for the family. Educators check and sign off every line. On a centre plan you see who on the team is writing and when, and you read any story an educator sends you to check. It will not make you Exceeding: the practice is yours. It makes the writing quicker, and every story shows the same parts: the child's words, the learning, the reason for each link, where to next and the family.",
        ],
        link: { href: "/for-centres", label: "StoryLoop for a whole centre" },
      },
    ],
    example: {
      slug: "four-maths-au",
      headings: ["Where to next / Responding", "Family link"],
      heading: "What it looks like in a real story",
      caption: "The end of a real draft StoryLoop wrote from a short note about Jack, unedited: next steps the room can act on, and a line for the family. One story does not show a theme; a pattern across stories, planning and conversations does.",
    },
    answers: ["C"],
    faqs: [
      {
        q: "How many Exceeding themes does a Standard need?",
        a: "All three. A Standard is rated Exceeding only when all three themes are shown in practice for that Standard.",
      },
      {
        q: "What ratings can a service get?",
        a: "Significant Improvement Required, Working Towards NQS, Meeting NQS or Exceeding NQS, for each quality area and overall. A service rated Exceeding NQS overall can apply to ACECQA for the Excellent rating.",
      },
      {
        q: "Can software make a service Exceeding?",
        a: "No. Exceeding is about practice. Documentation is part of the evidence an assessor reads, not the practice itself.",
      },
    ],
    related: [
      { href: "/nqs-standards", title: "The NQS in plain words", body: "All 7 quality areas, 15 standards and 40 elements." },
      { href: "/nqs-standard-1-3-assessment-and-planning", title: "NQS Standard 1.3", body: "What assessors look for in assessment and planning, element by element." },
      { href: "/critical-reflection-early-childhood", title: "Critical reflection", body: "Three examples, a filled-in template and the NQS 1.3.2 evidence list." },
      { href: "/assessment-and-rating-evidence", title: "Assessment and rating", body: "The evidence to have ready in the few days' notice you get." },
      { href: "/educational-leader-checklist", title: "The educational leader role", body: "What the role is, and a checklist for the week." },
    ],
    sources: [ACECQA_AR, ACECQA_NQS, ACECQA_13, SECTOR_EXCEEDING],
    reviewedAt: REVIEWED,
  },
} satisfies Record<string, BuyerPage>;

export type BuyerSlug = keyof typeof PAGES;

export const BUYER_PAGES: Record<BuyerSlug, BuyerPage> = PAGES;

/** Every buyer page defined here, live or held (the tests check all of them). */
export const BUYER_PAGE_SLUGS = Object.keys(BUYER_PAGES) as BuyerSlug[];

/**
 * Held out of the December 2026 release (the conductor's scope decision of
 * 19 Nov 2026, after the meeting): the leader, workload, Exceeding and parent
 * pages wait for the Keyword Planner volumes and a first sign that leaders can
 * be reached. Their code stays here, switched off. While this is false each of
 * them answers 404 (page and share image), is left out of the sitemap, and no
 * page links to it: every link list goes through liveLinks() or relatedFor().
 * Switching it on puts all four back exactly as they were built. Each one also
 * has its own switch in lib/held-pages.ts (25 Nov 2026), to release them one by one.
 */
export const HELD_BUYER_PAGES_ON = false;

export const HELD_BUYER_SLUGS: readonly BuyerSlug[] = [
  "educational-leader-checklist",
  "documentation-workload-early-childhood",
  "exceeding-nqs-documentation",
  "ask-your-centre",
];

/** Whether a buyer page is served in this release. Pure. */
export function buyerPageLive(slug: BuyerSlug): boolean {
  return HELD_BUYER_PAGES_ON || !HELD_BUYER_SLUGS.includes(slug) || heldPageOn(slug);
}

/** The buyer pages this release serves: the sitemap lists these, and only these. */
export const LIVE_BUYER_PAGE_SLUGS: BuyerSlug[] = BUYER_PAGE_SLUGS.filter(buyerPageLive);

/** True for a link to a held buyer page ("/ask-your-centre", "/ask-your-centre#x", ...). Pure. */
export function isHeldPath(href: string): boolean {
  if (HELD_BUYER_PAGES_ON) return false;
  const path = href.replace(/^https:\/\/storyloop\.space/, "").split(/[?#]/)[0].replace(/\/$/, "");
  return HELD_BUYER_SLUGS.some((slug) => path === `/${slug}` && !heldPageOn(slug));
}

/** A list of links without the held pages. Pure. */
export function liveLinks<T extends { href: string }>(links: readonly T[]): T[] {
  return links.filter((link) => !isHeldPath(link.href));
}

export function buyerPage(slug: BuyerSlug): BuyerPage {
  return BUYER_PAGES[slug];
}
