/**
 * Guides added 13 Oct 2026, aimed at what educators search for in Term 4.
 *
 * Why these five (production data, 60 days to 13 Oct 2026): guide landings had
 * started to come from Google (50 Google sessions in the week to 13 Oct, up
 * from 27), with /transition-to-school-statement suddenly the second most
 * visited guide as Term 4 began. Victoria's TLDS is a funding requirement due
 * by the end of Term 4, and end of year summaries are written in the same weeks.
 * Two pages are built from the real drafts in lib/real-examples.ts, so the
 * examples are exactly what StoryLoop wrote, never retyped.
 *
 * Facts checked on 13 Oct 2026 against the sources listed on each page. No em
 * dashes, no invented statistics. Shared FAQs are added in seo-pages.ts.
 */
import type { SeoPage } from "./seo-pages";
import { REAL_EXAMPLES, type RealExample } from "./real-examples";

type Block = { heading: string; paragraphs: string[] };

/** The story's sections, keyed by heading, from the plain-text draft. */
function storySections(story: string): Map<string, string[]> {
  const sections = new Map<string, string[]>();
  let current = "Opening";
  for (const raw of story.split(/\n\n+/)) {
    const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) continue;
    const first = lines[0];
    const isHeading = first.length < 60 && !/[.!?”"]$/.test(first);
    if (isHeading) {
      current = first;
      if (!sections.has(current)) sections.set(current, []);
      if (lines.length > 1) sections.get(current)!.push(lines.slice(1).join(" "));
    } else {
      if (!sections.has(current)) sections.set(current, []);
      sections.get(current)!.push(lines.join(" "));
    }
  }
  return sections;
}

function section(example: RealExample, pattern: RegExp): string[] {
  for (const [heading, paragraphs] of storySections(example.story)) {
    if (pattern.test(heading)) return paragraphs;
  }
  return [];
}

function example(slug: string): RealExample {
  const found = REAL_EXAMPLES.find((item) => item.slug === slug);
  if (!found) throw new Error(`Missing real example ${slug}`);
  return found;
}

const curriculumName = (example: RealExample) => (example.framework === "NZ" ? "Te Whāriki" : "EYLF V2.0");
const ageLabel = (example: RealExample) => example.age.replace(/^Under 1$/, "under one").toLowerCase();

const NEXT_STEP_NOTES: Array<[string, string]> = [
  ["infant-tummy-time-nz", "It grows straight out of what Mere did. She reached three times before she got the rattle, so the next step keeps objects just within reach and asks adults to wait before helping."],
  ["one-feeding-au", "It accepts where Ruby is (fingers for the last bit) instead of correcting her, and gives the exact words to model at the table."],
  ["toddler-sand-quote-nz", "It names the words to use and sets a question to answer next time: does Tama repeat it, try a different container, or go looking for more sand?"],
  ["two-shoes-independence-nz", "It gives any adult in the room a script (\"You try first\") and a rule they can follow: offer just enough help, then pause."],
  ["two-painting-colours-au", "It sets up the next experience precisely: two colours side by side, time to mix, and watching whether Zara names the change again."],
  ["three-waiata-nz", "It counts doing the actions as real participation and plans more ways in, instead of pushing Nikau to sing louder."],
  ["three-teeth-nz", "It follows Anika's lead (\"if she chooses\") and turns one moment into a routine: room at kai time for family news."],
  ["four-long-rich-au", "It offers materials and two open questions that stretch Grace's thinking without doing the building for her."],
  ["four-group-names-nz", "It plans to listen for the children's own rules and roles, which is where the learning in their play actually is."],
  ["four-writing-name-au", "It deals with the backwards S gently, inside real writing, rather than turning it into a worksheet."],
  ["four-maths-au", "Its prompts sit exactly at Jack's level (\"What could we add to make ten?\") and it says what to watch for: whether he checks the total."],
  ["four-sensitive-family-au", "It responds to a hard week with care and space rather than a learning target, and keeps Liam's friendship with Oliver in view."],
];

const PRESCHOOL_NOTES: Array<[string, string]> = [
  ["three-waiata-nz", "It describes participation honestly. Nikau sang the first line loudly, then carried on with the actions, and the draft says exactly that rather than claiming he led the whole waiata."],
  ["three-teeth-nz", "A family moment handled warmly. The story is about Anika, her identity and her place in the group, not about the new baby."],
  ["four-long-rich-au", "A long note turned into a clear story of problem solving: what failed, what Grace changed, what worked, and then teaching a friend."],
  ["four-group-names-nz", "Three children, one story. It stays focused on Tui's language and role in the play without losing Rawiri and Sam."],
  ["four-writing-name-au", "Proof that three lines is enough. The draft does not inflate the moment; it notices early literacy where it actually happened."],
  ["four-maths-au", "Real early maths, quoted exactly: sorting by colour, counting eight, adding two to make ten."],
  ["four-sensitive-family-au", "How to write about a hard week. It shares only what the reader needs to understand Liam's morning and keeps the focus on how he coped."],
];

function nextStepBlocks(): Block[] {
  return NEXT_STEP_NOTES.map(([slug, why]) => {
    const item = example(slug);
    const next = section(item, /where to next|responding/i);
    return {
      heading: `${item.childName}, ${ageLabel(item)}: ${item.title.toLowerCase()} (${curriculumName(item)})`,
      paragraphs: [
        `The note: ${item.note}`,
        `Where to next, as StoryLoop wrote it: ${next.join(" ")}`,
        `Why it works: ${why}`,
      ],
    };
  });
}

function preschoolBlocks(): Block[] {
  return PRESCHOOL_NOTES.map(([slug, why]) => {
    const item = example(slug);
    const opening = section(item, /^learning story$/i)[0] ?? "";
    const links = section(item, /curriculum links/i)[0] ?? "";
    return {
      heading: `${item.childName}, ${ageLabel(item)}: ${item.title.toLowerCase()} (${curriculumName(item)})`,
      paragraphs: [
        `The note: ${item.note}`,
        `How the story opens: ${opening}`,
        `The ${curriculumName(item)} link: ${links}`,
        `What makes it strong: ${why}`,
      ],
    };
  });
}

export const OCT_2026_PAGES: Record<string, SeoPage> = {
  "tlds-examples": {
    slug: "tlds-examples",
    title: "TLDS Examples 2026: Writing a Victorian Transition Statement",
    description:
      "How to write a Transition Learning and Development Statement in 2026: what each section asks for, example wording and intentional teaching strategies.",
    kicker: "Victoria · Term 4 2026",
    heading: "Write a TLDS a Prep teacher will actually use.",
    intro:
      "Every funded kindergarten in Victoria has to complete a TLDS for each child starting school, by the end of Term 4. The online tool tells you which boxes to fill. It cannot tell you what to write. This guide covers what each section asks for, with example wording you can adapt from what you have already seen this year.",
    reviewedAt: "2026-10-19",
    sections: [
      {
        title: "Section 1.1 in one line",
        body:
          "For each of the five VEYLDF outcomes, select at least one descriptor (the department suggests two to five) and write at least one intentional teaching strategy. The strategies are what a Foundation teacher can act on in week one.",
      },
      {
        title: "The child and the family write too",
        body:
          "Section 2 is the child's, completed with an adult's help. Section 3 is the family's. Section 1.2 is for children with diverse learning needs, including disability or developmental delay, and the professionals supporting them.",
      },
      {
        title: "It is not a report card",
        body:
          "That is the department's own phrase. Describe how this child learns best and what helps them, using moments you actually saw. Leave out comparisons, labels you are not qualified to give and anything you could not point to in your documentation.",
      },
    ],
    faqs: [
      {
        question: "When is the 2026 TLDS due?",
        answer:
          "Funded kindergarten providers must complete a TLDS for every enrolled child going to primary school in 2027, by the end of Term 4, 2026. The online TLDS tool, hosted on the Insight Assessment Platform, reopened on Monday 20 July 2026.",
      },
      {
        question: "What are the five VEYLDF outcomes in Section 1.1?",
        answer:
          "Identity, Community, Wellbeing, Learning and Communication. Section 1.1 describes the child's learning and development against these outcomes and the Victorian Curriculum F to 10, and includes intentional teaching strategies.",
      },
      {
        question: "How many intentional teaching strategies does a TLDS need?",
        answer:
          "At least one for each of the five outcomes. Write each as something a teacher can do, for example: give Mia a job in the first week, such as handing out the fruit, so she has a reason to talk to children she does not know yet.",
      },
      {
        question: "Can families stop the TLDS going to the school?",
        answer:
          "Yes. The family must always be given the secure link to the completed statement and the chance to opt out of it being shared with the school. If they do not opt out, it is shared through the online tool, by secure email if the school is not listed, or printed for the family to pass on.",
      },
      {
        question: "Is there funding for the time it takes?",
        answer:
          "Yes. In 2026 the department pays $9 per enrolled child to release early childhood teachers to write TLDS. It is paid automatically and should be spent by the end of Term 4.",
      },
      {
        question: "Can I use AI to write a TLDS?",
        answer:
          "Not by pasting a child's details into a general chatbot: Australia's privacy regulator recommends, as best practice, not entering personal information into publicly available AI tools. If your service allows a purpose-built tool, one can help with the drafting. The TLDS draft at the top of this page is told to write only from the notes you give it and to leave an outcome for you when your notes show nothing, and it flags any quote it cannot find in your notes. Use a first name only; notes and drafts are not saved to any account. The judgement stays yours: you check every line and decide what goes into the online statement. Check your service's policy on children's information first.",
      },
    ],
    sources: [
      { label: "Victorian Government: Transition Learning and Development Statements", url: "https://www.vic.gov.au/transition-learning-and-development-statements" },
      { label: "Victorian Government: Completing 2026 Transition Learning and Development Statements (August 2026 update)", url: "https://www.vic.gov.au/early-childhood-update-august-2026/completing-2026-transition-learning-and-development-statements" },
      { label: "Victorian Government: Complete an online Transition Learning and Development Statement", url: "https://www.vic.gov.au/complete-online-transition-learning-and-development-statement" },
      { label: "OAIC: Guidance on privacy and the use of commercially available AI products", url: "https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products" },
    ],
  },


  "learning-story-next-steps-examples": {
    slug: "learning-story-next-steps-examples",
    title: "Next Steps in a Learning Story: 12 Real Examples",
    description:
      "Twelve real 'where to next' sections from learning stories for babies to five year olds, for Te Whāriki and the EYLF, with what makes each one useful.",
    kicker: "Examples · Where to next",
    heading: "The next step is the part of a learning story that changes tomorrow.",
    intro:
      "Most learning stories end with something like \"We will continue to support Mia's interest in painting.\" That is not a next step. A next step names what an educator will do, offer or watch for, so whoever reads it next can act on it. Below are twelve real \"where to next\" sections, each written by StoryLoop from a real note and shown exactly as written, with what makes each one work.",
    reviewedAt: "2026-10-13",
    sections: [
      {
        title: "Name an action",
        body:
          "Offer, set out, sit nearby, ask, give time. If you cannot picture a teacher doing it tomorrow morning, it is not a next step yet.",
      },
      {
        title: "Grow it from the moment",
        body:
          "The strongest next steps come straight from what happened in the story. Mere reached three times for the rattle, so the step is to keep objects just within reach and wait before helping.",
      },
      {
        title: "Say what you will notice",
        body:
          "A good next step also says what to watch for, so the next story can show change. That is the planning cycle, or notice, recognise and respond, in two sentences.",
      },
    ],
    faqs: [
      {
        question: "What is the difference between 'where to next' and 'possible lines of development'?",
        answer:
          "They are different names for the same part of a learning story: how educators will respond to and extend what they noticed. Services in Aotearoa often use responding, where to next or possibilities and opportunities. Australian services often frame it as planning or extending learning, linked to the EYLF planning cycle.",
      },
      {
        question: "How many next steps should a learning story have?",
        answer:
          "One or two that you will actually do. A list of six intentions nobody follows up is worse than one clear action and one thing to watch for.",
      },
      {
        question: "Should families be part of the next step?",
        answer:
          "Where it fits, yes. Several of the examples below end with a family or whānau link: a simple way to notice or extend the same learning at home, written as an invitation rather than homework.",
      },
      {
        question: "Are these real learning stories?",
        answer:
          "They are real notes and the drafts StoryLoop wrote from them in its 23 September 2026 evaluation run, shown without edits. The same twelve are on the examples page in full.",
      },
    ],
    sources: [
      { label: "Te Whāriki Online: Te Whāriki, the early childhood curriculum (Ministry of Education, 2017)", url: "https://tewhariki.tahurangi.education.govt.nz/te-wh-riki-early-childhood-curriculum-document/5637184332.p" },
      { label: "ACECQA: Element 1.3.1 Assessment and planning cycle", url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning/element-131-assessment-and-planning-cycle" },
    ],
  },

  "learning-story-examples-preschool": {
    slug: "learning-story-examples-preschool",
    title: "Learning Story Examples for Preschoolers (3 to 5)",
    description:
      "Seven real learning stories for three to five year olds, from waiata to marble runs, with Te Whāriki and EYLF links and what makes each one strong.",
    kicker: "Examples · 3 to 5 years",
    heading: "Seven preschool learning stories, written from real notes.",
    intro:
      "Three and four year olds give you more to write about than any other age: plans, rules, jokes, arguments, words. The skill is choosing the moment that shows their thinking and writing about that, not the whole morning. These are seven real notes and the drafts StoryLoop wrote from them, quoted exactly, with what makes each one strong.",
    reviewedAt: "2026-10-13",
    sections: [
      {
        title: "Pick one moment",
        body:
          "Grace spent forty minutes on the marble run. Her story is about one problem: the marble kept falling off at the join, and what she did about it.",
      },
      {
        title: "Keep their words exact",
        body:
          "Tui's \"password please\" and Grace's \"not too fast or it flies off\" carry their stories. Quote children exactly as they spoke, including the mistakes.",
      },
      {
        title: "Link only what you saw",
        body:
          "Each story names one or two links to Te Whāriki or the EYLF and says what in the moment shows them. A link with no evidence beside it is decoration.",
      },
    ],
    faqs: [
      {
        question: "How long should a learning story for a four year old be?",
        answer:
          "Long enough to tell one moment well. The drafts below run to roughly 280 to 440 words including the learning, links and next steps. Families read the first paragraph most closely, so make that the moment itself.",
      },
      {
        question: "Should I write about a group of children in one story?",
        answer:
          "You can, as the hut door password story shows, as long as the story stays focused and each child's family would be comfortable reading it. Many services write a group story and then a short individual note for each child's own portfolio.",
      },
      {
        question: "How do I write about something difficult happening at home?",
        answer:
          "Share only what the reader needs to understand the child's day, keep the focus on how the child coped and what helped, and check with the family before anything sensitive goes into a story they or others will read.",
      },
      {
        question: "Are these real learning stories?",
        answer:
          "They are real notes and the drafts StoryLoop wrote from them in its 23 September 2026 evaluation run, shown without edits. The full drafts are on the examples page.",
      },
    ],
  },

  "end-of-year-learning-summary": {
    slug: "end-of-year-learning-summary",
    title: "End of Year Learning Summary: Examples for ECE",
    description:
      "How to write an end of year learning summary for a child in early childhood, with example paragraphs for the EYLF and Te Whāriki and a simple structure.",
    kicker: "Educator guide · Term 4",
    heading: "A year of a child's learning, on one page a family will keep.",
    intro:
      "Families keep the end of year summary. It is often the one piece of documentation that ends up in a memory box. It is also written in the busiest weeks of the year, usually from memory. This guide gives a simple structure, example paragraphs for Australia and Aotearoa, and a way to write it from the evidence you already have rather than from scratch.",
    reviewedAt: "2026-10-13",
    sections: [
      {
        title: "Start with who they are now",
        body:
          "Open with a picture of the child today: what they love, how they play, who they look for when they arrive. Families read the first paragraph most closely.",
      },
      {
        title: "Show change with two moments",
        body:
          "One moment from early in the year and one from now says more about growth than any list of skills. Use your own dated stories and the child's actual words.",
      },
      {
        title: "End with what is next",
        body:
          "Close with where this child is heading and one or two simple ways the family, or the next teacher, can support it.",
      },
    ],
    faqs: [
      {
        question: "Is an end of year summary required in Australia?",
        answer:
          "Not as a separate document by that name. ACECQA's guidance for element 1.3.3 says assessors may look for how families are informed about their child's progress, such as point-in-time progress summaries, and for transition statements for children starting school. Many services write an end of year summary as part of meeting that.",
      },
      {
        question: "What about Aotearoa New Zealand?",
        answer:
          "Te Whāriki does not set a form for end of year reports. Many services share a portfolio, or a summary learning story, with whānau at the end of the year or when a child moves rooms or starts school. Write it so whānau can read it easily and respond.",
      },
      {
        question: "How long should an end of year summary be?",
        answer:
          "One page. Three to five short paragraphs a family can read in two minutes. Longer is not more professional, and a family is more likely to read every word of something short.",
      },
      {
        question: "Can I use AI to write end of year summaries?",
        answer:
          "Do not paste a child's details into a general chatbot; both the Australian and New Zealand privacy regulators advise caution with personal information in public AI tools. If your service allows a purpose-built tool, the summary draft at the top of this page is told to write only from your own notes and to leave an outcome for you when they show nothing, and it flags any quote it cannot find in your notes. Use a first name only; notes and drafts are not saved to any account. You write the final summary. If your stories are in StoryLoop, each child's history puts a year of notes, quotes and family comments in one place to write from.",
      },
    ],
    sources: [
      { label: "ACECQA: Element 1.3.3 Information for families", url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning/element-133-information-families" },
      { label: "Te Whāriki Online: Te Whāriki, the early childhood curriculum (Ministry of Education, 2017)", url: "https://tewhariki.tahurangi.education.govt.nz/te-wh-riki-early-childhood-curriculum-document/5637184332.p" },
      { label: "OAIC: Guidance on privacy and the use of commercially available AI products", url: "https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products" },
    ],
  },

  // 27 Oct 2026: "summative assessment" searches in Australia peak in May and
  // again from September to November (Google Trends, 5 years), and the people
  // searching have to write one this week. They get worked examples and a
  // no-signup draft from their own notes. Wording checked on 27 Oct 2026
  // against ACECQA's EYLF V2.0 information sheet and Element 1.3.1.
  "summative-assessment-examples": {
    slug: "summative-assessment-examples",
    title: "Summative Assessment Examples for Childcare (EYLF V2.0)",
    description:
      "Summative assessment examples for a toddler, a three year old and a four year old, built from dated observations and linked to EYLF V2.0 outcomes.",
    kicker: "Educator guide · Term 4",
    heading: "Summative assessment examples that show how far a child has come.",
    intro:
      "A summative assessment looks back over a set period, usually a term or a year, and says what a child can do now compared with where they started. The EYLF V2.0 calls it assessment of learning. This guide gives three worked examples, for a toddler, a three year old and a four year old, each built from four dated observations. It also gives a structure you can copy and a way to draft yours from your own notes in a couple of minutes.",
    reviewedAt: "2026-10-27",
    sections: [
      {
        title: "Formative or summative?",
        body:
          "Formative assessment (assessment for learning) is the everyday noticing that shapes tomorrow's plan. Summative assessment (assessment of learning) steps back at a set point and judges progress over time. The summative one is built from the formative ones.",
      },
      {
        title: "Built from evidence, not memory",
        body:
          "Every sentence should point to something you documented: a dated observation, a learning story, the child's own words or what the family told you. If you cannot say where you saw it, leave it out.",
      },
      {
        title: "One page, outcome by outcome",
        body:
          "Use the five EYLF V2.0 outcomes as points of reference. Say what you saw, what it shows and one next step. A short, honest outcome is better than a long one stretched from thin evidence.",
      },
    ],
    faqs: [
      {
        question: "What is a summative assessment in early childhood?",
        answer:
          "It is assessment of learning. ACECQA's EYLF V2.0 information sheet describes educators reviewing children's achievements and capabilities at specified or selected timepoints, such as the end of a term or the move to school, and making professional judgements about their learning progress over time to show the \"distance travelled\". It sits alongside formative assessment (assessment for learning) and assessment as learning.",
      },
      {
        question: "Is a summative assessment required under the NQF?",
        answer:
          "Not as a document with that name. Element 1.3.1 asks that each child's learning and development is assessed or evaluated as part of an ongoing cycle, and ACECQA says assessors may sight documented assessment and analysis of each child's learning, development and wellbeing, using the learning outcomes as points of reference. Regulation 74 covers documenting child assessments or evaluations. ACECQA also says there is no one way to meet documentation requirements, so many services write a summative assessment each term or twice a year to show this.",
      },
      {
        question: "How often should summative assessments be done?",
        answer:
          "The NQF does not set a frequency. Many services write one each term, or one mid-year and one at the end of the year, plus a transition statement for children starting school. ACECQA's guidance for Element 1.3.1 says the information collected should be appropriate to the age and capabilities of the child and the time and frequency the child attends, so a child who comes one day a week needs a shorter summary than a child who comes five.",
      },
      {
        question: "How is a summative assessment different from a learning story?",
        answer:
          "A learning story captures one moment and what it shows. A summative assessment draws on many of them to describe progress across a term or a year. Good learning stories make the summative assessment quick, because the evidence is already written, dated and linked to the outcomes.",
      },
      {
        question: "Can I use AI to write summative assessments?",
        answer:
          "Do not paste a child's details into a general chatbot; the Australian privacy regulator advises caution with personal information in public AI tools. The draft box on this page is told to write only from the notes you paste, to leave an outcome for you when your notes show nothing, and to flag anything you need to check. Use a first name only; notes and drafts are not saved to any account. You write the final assessment. If your stories are in StoryLoop, Educator Pro's Term report builds one printable page for each child from the stories you saved that term, with no scores and no comparisons with other children.",
      },
    ],
    sources: [
      { label: "ACECQA: Information sheet, EYLF Practices: Assessment and evaluation for learning, development and wellbeing", url: "https://www.acecqa.gov.au/information-sheet-eylf-practices-assessment-and-evaluation-learning-development-and-wellbeing" },
      { label: "ACECQA: Element 1.3.1 Assessment and planning cycle", url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning/element-131-assessment-and-planning-cycle" },
      { label: "Belonging, Being and Becoming: The Early Years Learning Framework for Australia V2.0 (2022)", url: "https://www.acecqa.gov.au/sites/default/files/2023-01/Belonging_Being_And_Becoming_V2.0.pdf" },
      { label: "OAIC: Guidance on privacy and the use of commercially available AI products", url: "https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products" },
    ],
  },

  // 27 Oct 2026: the two state statements due before the summer holidays. Only
  // government pages rank for them, and none of those drafts anything. Facts
  // checked on 27 Oct 2026 against the NSW Department of Education's statement
  // page and its "Guide to completing the Transition to School Statement"
  // (April 2025), and QCAA's transition statement pages and KTS app FAQs
  // (updated 18 August 2026).
  "nsw-transition-to-school-statement": {
    slug: "nsw-transition-to-school-statement",
    title: "NSW Transition to School Digital Statement: Examples",
    description:
      "What the NSW Transition to School Digital Statement asks for, section by section, with example wording and a draft of the outcomes from your own notes.",
    kicker: "New South Wales · Term 4 2026",
    heading: "The NSW Transition to School Statement, section by section.",
    intro:
      "In NSW the Transition to School Statement is written by a child's early childhood service in the year before school, then shared with the family and the new school. If your service receives Start Strong funding, it must be completed and shared before the new school year. This guide walks through each section with example wording, and the draft box turns your own notes into the learning and development section in a couple of minutes.",
    reviewedAt: "2026-10-27",
    sections: [
      {
        title: "Two parts are always required",
        body:
          "The consent form and the question about whether the school should follow up with your service are mandatory. The department leaves the rest of the statement to your professional judgement.",
      },
      {
        title: "The outcomes section is a summary",
        body:
          "The department's guide asks you to take the documentation gathered through the year and write a summary of strengths, emerging skills, interests, relationships and intentional teaching strategies for each EYLF V2.0 outcome.",
      },
      {
        title: "Strategies a teacher can use in week one",
        body:
          "Write each strategy with who, what, where or when, and how, so a Kindergarten teacher who has never met the child knows exactly what to do.",
      },
    ],
    faqs: [
      {
        question: "Who has to complete a Transition to School Statement in NSW?",
        answer:
          "The NSW Department of Education says that if your service receives Start Strong funding, a Transition to School Statement must be completed for children in the year before Kindergarten and shared with the child's parents or carers and new school before the new school year. It is completed by the child's early childhood teacher or educator.",
      },
      {
        question: "What sections does the statement have?",
        answer:
          "Child's details and parental consent; About the child (being and belonging), covering family, culture, languages, attendance and any additional learning and support needs; Feelings about school, in the child's own voice; and the child's learning and development across the five EYLF V2.0 outcomes, with intentional teaching strategies and future planning.",
      },
      {
        question: "What if a family does not give consent?",
        answer:
          "The department's guide says to indicate this on the consent form and keep a copy in the child's records. If you are using the digital statement, you upload the signed department consent form when a family does consent.",
      },
      {
        question: "How do I capture the child's voice?",
        answer:
          "From everyday one-to-one or group conversations and learning experiences, not an interview. For a child who needs support with communication, it can be worked out together with the family and other professionals, and a description of one of the child's work samples can help the school get to know them.",
      },
      {
        question: "Can I use AI to write the statement?",
        answer:
          "Do not paste a child's details into a general chatbot. The draft box on this page writes a line for each EYLF V2.0 outcome and a strategy for the school teacher only from the notes you paste, leaves an outcome for you when your notes show nothing, and is not saved to any account. Use a first name only. You review every word and complete the official statement yourself.",
      },
    ],
    sources: [
      { label: "NSW Department of Education: The Transition to School Digital Statement", url: "https://education.nsw.gov.au/early-childhood-education/ecec-resource-library/transition-to-school/transition-to-school-digital-statement" },
      { label: "NSW Department of Education: Guide to completing the Transition to School Statement (PDF, April 2025)", url: "https://education.nsw.gov.au/content/dam/main-education/early-childhood-education/working-in-early-childhood-education/media/documents/transition-to-school/Guide_to_completing_the_Transition_to_School_Statement.pdf" },
      { label: "Belonging, Being and Becoming: The Early Years Learning Framework for Australia V2.0 (2022)", url: "https://www.acecqa.gov.au/sites/default/files/2023-01/Belonging_Being_And_Becoming_V2.0.pdf" },
    ],
  },

  "qld-kindergarten-transition-statement": {
    slug: "qld-kindergarten-transition-statement",
    title: "QLD Kindergarten Transition Statement: Examples and Help",
    description:
      "Writing a Queensland kindergarten transition statement: the five QKLG areas, consent forms 1 and 2, the KTS app, examples and a draft from your notes.",
    kicker: "Queensland · November 2026",
    heading: "Writing a Queensland kindergarten transition statement.",
    intro:
      "Queensland kindergartens complete a transition statement for each child in November of the kindergarten year. It is a strengths-based, point-in-time summary of the child's knowledge, skills and dispositions for learning across the five learning and development areas of the Queensland kindergarten learning guideline (QKLG). This guide covers consent, the KTS app and the five areas with example wording, and the draft box writes yours from your own notes.",
    reviewedAt: "2026-10-27",
    sections: [
      {
        title: "Two consent forms, two jobs",
        body:
          "Consent form 1 lets you create the statement in the KTS app. Consent form 2 lets you share it with the child's school. Without consent to create, use the QCAA kindergarten transition statement template instead.",
      },
      {
        title: "Five areas, one child",
        body:
          "Identity, connectedness, wellbeing, active learning and communicating. Describe what the child knows, can do and is disposed to do in each one, from moments you documented.",
      },
      {
        title: "Families and children contribute",
        body:
          "Parent, carer and child contributions are recorded by the teacher in the Suggestions for continuity section, so ask early and write their words down.",
      },
    ],
    faqs: [
      {
        question: "Who completes a kindergarten transition statement in Queensland?",
        answer:
          "Kindergarten services complete one for each eligible child's family in November of the kindergarten year, in the Kindergarten Transition Statement (KTS) application in the QCAA Portal. Only services providing a Queensland Government funded kindergarten program can use the portal. The Department of Education's kindergarten funding essential information sets out the requirements.",
      },
      {
        question: "What is the difference between consent form 1 and consent form 2?",
        answer:
          "Consent to create (form 1) gives the service a parent or carer's permission to write the statement in the KTS app, and you need it before you start. Consent to share (form 2) lets the service share the statement with the child's school, through the QCAA Portal or as a hard copy when the template was used.",
      },
      {
        question: "What if a family has not returned consent form 2?",
        answer:
          "You can still submit the statement, selecting no for each consent option. It is then finalised for you to share with the family and keep in your records, and the consent can be updated in the app if the form comes back later.",
      },
      {
        question: "What about early entry or a second year of kindergarten?",
        answer:
          "Statements for children with approved early entry to school cannot be completed in the KTS app; use the kindergarten transition statement template. For a child returning for a second year, submit the statement with no consent to share with a school, then create a new one at the end of the second year.",
      },
      {
        question: "Can I use AI to write the statement?",
        answer:
          "Do not paste a child's details into a general chatbot. The draft box on this page writes a line for each QKLG area and a suggestion for continuity only from the notes you paste, leaves an area for you when your notes show nothing, and is not saved to any account. Use a first name only. You review every word and enter the final statement in the KTS app yourself.",
      },
    ],
    sources: [
      { label: "QCAA: Creating transition statements", url: "https://www.qcaa.qld.edu.au/kindergarten/creating-transition-statements" },
      { label: "QCAA: Kindergarten Transition Statement application FAQs", url: "https://www.qcaa.qld.edu.au/kindergarten/creating-transition-statements/faqs" },
      { label: "QCAA: Queensland kindergarten learning guideline (QKLG) 2024", url: "https://www.qcaa.qld.edu.au/kindergarten/qklg" },
    ],
  },

  // 29 Oct 2026: "transition to school statement consent form (2026)" and
  // "transition to school consent form" sit at positions 5 to 10 in Term 4.
  // Facts checked on 29 Oct 2026 against the NSW Department of Education's
  // statement page, its consent form (2025/2026) and its digital statement FAQs,
  // QCAA's KTS app pages and FAQs (updated 18 and 19 August 2026), and the
  // Victorian Government's TLDS page. We link to the official forms and never
  // host them.
  "transition-statement-consent-form": {
    slug: "transition-statement-consent-form",
    title: "Transition to School Statement Consent Form 2026: NSW, QLD",
    description:
      "What the NSW and Queensland transition statement consent forms ask, what to do when one is missing, Victoria's opt-out, and a draft from your notes.",
    kicker: "NSW · Queensland · Victoria · Term 4 2026",
    heading: "Transition statement consent forms, state by state.",
    intro:
      "Before you write a single line of a transition statement, you need the right permission from the family. NSW and Queensland each publish their own consent form, and Victoria works differently: families can opt out of the TLDS being shared with the school. This guide explains what each form asks, what to do when a form has not come back, and how to explain it to a family in plain words. Then the draft box turns your notes into the outcomes section, with no signup.",
    reviewedAt: "2026-10-29",
    sections: [
      {
        title: "NSW: one form, two choices",
        body:
          "Families say yes or no to sharing the statement itself, and separately to sharing other relevant information, such as a follow-up call with the school. They can agree to either, both or neither.",
      },
      {
        title: "Queensland: form 1 to create, form 2 to share",
        body:
          "Consent form 1 comes before you enter a child's details in the KTS app. Consent form 2 comes after the family has read the draft, and lets you share it with the school.",
      },
      {
        title: "Victoria: a choice about sharing",
        body:
          "Every child going to school in a funded kindergarten program has a TLDS. The family gets the secure link to the finished statement and must be given the chance to opt out of it being shared with the school.",
      },
    ],
    faqs: [
      {
        question: "Where do I get the NSW Transition to School Statement consent form?",
        answer:
          "From the NSW Department of Education's Transition to School Digital Statement page, under Resources. The family signs it, and you upload the signed form to the digital statement platform. The department's FAQs say the decision should be recorded before a statement is started.",
      },
      {
        question: "What if a NSW family does not give consent?",
        answer:
          "You cannot create a Transition to School Statement for that child. If your service receives Start Strong funding, keep the signed form that records the family's choice for funding compliance. The form tells families that taking part is voluntary, that they can collect the information from the service and give it to the school themselves, and that they can withdraw consent at any time by contacting the service.",
      },
      {
        question: "We already have Start Strong consent. Do we need this form too?",
        answer:
          "Yes. The department's FAQs say additional consent must be obtained for the Transition to School Digital Statement. The Start Strong declaration is about fee relief and enrolment details; the Transition to School parent consent form is the one you upload to the platform.",
      },
      {
        question: "What is the difference between Queensland consent form 1 and form 2?",
        answer:
          "Form 1, consent to create, gives the kindergarten permission to write the statement in the KTS app in the QCAA Portal, and you need it before you start. Form 2, consent to share, lets the kindergarten share the finished statement with the child's school. Without form 1, use the QCAA kindergarten transition statement template instead of the app.",
      },
      {
        question: "Can I submit a Queensland statement if consent form 2 has not come back?",
        answer:
          "Yes. QCAA's FAQs say to submit the statement and select no for each consent option. When the family returns form 2, you can edit the consent information in the KTS app. Consent is the only thing you can change after a statement is submitted.",
      },
      {
        question: "How long do I keep the Queensland consent forms?",
        answer:
          "QCAA says the kindergarten should keep a copy of each consent form with the transition statement for three years after the child has left the service.",
      },
      {
        question: "Is there a TLDS consent form in Victoria?",
        answer:
          "The Victorian Government's TLDS page does not describe a form to create the statement. Every child transitioning to school from a funded kindergarten program has a TLDS. The family must be given the secure link to the completed statement and the chance to opt out of it being shared with the school, and a family with concerns is encouraged to talk with the child's early childhood teacher.",
      },
      {
        question: "Can I use AI to write the statement?",
        answer:
          "Do not paste a child's details into a general chatbot. The draft box on this page writes a line for each outcome and a strategy for the school teacher only from the notes you paste, leaves an outcome for you when your notes show nothing, and is not saved to any account. Use a first name only. You review every word, collect the family's consent, and complete the official statement yourself.",
      },
    ],
    sources: [
      { label: "NSW Department of Education: The Transition to School Digital Statement", url: "https://education.nsw.gov.au/early-childhood-education/ecec-resource-library/transition-to-school/transition-to-school-digital-statement" },
      { label: "NSW Department of Education: Transition to School Digital Statement consent form (PDF)", url: "https://education.nsw.gov.au/content/dam/main-education/early-childhood-education/working-in-early-childhood-education/media/documents/transition-to-school/Transition_to_School_Digital_Statement_consent_form.pdf" },
      { label: "NSW Department of Education: Transition to School Digital Statement FAQs (PDF)", url: "https://education.nsw.gov.au/content/dam/main-education/early-childhood-education/working-in-early-childhood-education/media/documents/transition-to-school/Transition_to_School_Digital_Statement_FAQs.pdf" },
      { label: "QCAA: Using the KTS app to create transition statements (consent forms 1 and 2)", url: "https://www.qcaa.qld.edu.au/kindergarten/creating-transition-statements/using-kts-app" },
      { label: "QCAA: Kindergarten Transition Statement application FAQs", url: "https://www.qcaa.qld.edu.au/kindergarten/creating-transition-statements/faqs" },
      { label: "Victorian Government: Transition Learning and Development Statements", url: "https://www.vic.gov.au/transition-learning-and-development-statements" },
      { label: "Victorian Government: Transition statement privacy and information sharing", url: "https://www.vic.gov.au/transition-statement-privacy-and-information-sharing" },
    ],
  },
};

export const OCT_2026_DEEP_DIVES: Record<string, Block[]> = {
  "tlds-examples": [
    {
      heading: "What a Prep teacher reads first",
      paragraphs: [
        "A Foundation teacher may have twenty-five statements to read before the first day. They are looking for three things: how this child settles, what this child loves, and what the teacher should do differently for them in the first weeks. Everything else is background.",
        "That is why the intentional teaching strategies matter more than the descriptors. Descriptors tell the teacher where a child is. Strategies tell them what to do about it, written by the person who knows the child best.",
      ],
    },
    {
      heading: "Example intentional teaching strategies, outcome by outcome",
      paragraphs: [
        "These are written for an imagined child, Mia, to show the shape. Yours should come from your own observations of the real child.",
        "Identity: Mia settles best when she knows what is coming next. A photo of the classroom and her teacher's name before the first day, and a familiar job in week one, will help her feel she belongs.",
        "Community: Mia joins group games when an adult gives her a role. Pair her with one buddy for the first fortnight rather than asking her to find a group.",
        "Wellbeing: When Mia is upset she goes quiet rather than crying. Check in with her by name after transitions such as lining up and eating time, and give her a minute before expecting an answer.",
        "Learning: Mia stays with a construction problem for thirty minutes or more. Give her open materials and time, and ask \"What will you try next?\" rather than showing her.",
        "Communication: Mia writes the M in her name and copies words she sees around the room. Give her real reasons to write, such as labels and signs, and name the letters in words that matter to her.",
      ],
    },
    // 19 Oct 2026: TLDS searches ("tlds examples", "transition statements
    // victoria", "tlds example intentional teaching") became the fastest
    // growing Google landings (7 clicks, 193 impressions in a week), and those
    // readers left after a few seconds. They came for example wording; one
    // imagined child was not enough. The department's own guidance asks for a
    // strengths-based statement, so the examples show the same child both ways.
    {
      heading: "The same child written two ways",
      paragraphs: [
        "The department asks for a strengths-based statement: what the child can do, what helps them, and what the teacher can do next. Here is a second imagined child, Arlo, written both ways. The second version of each is the one a Prep teacher can use on day one.",
        "Identity. Instead of \"Arlo is shy and finds it hard to separate from his dad\", write: \"Arlo settles once he has a job to do. Saying goodbye at the gate and going straight to water the vegetable garden worked well this year.\" Strategy: give Arlo the same small job each morning for his first fortnight, so arriving has a routine he knows.",
        "Community. Instead of \"Arlo doesn't join in group games\", write: \"Arlo watches a game for a few minutes before he joins, and joins easily when an adult offers him a role.\" Strategy: invite him in with a specific role (\"Can you be the one who counts?\") rather than asking \"Do you want to play?\".",
        "Wellbeing. Instead of \"Arlo gets upset when routines change\", write: \"Arlo copes well with change when he knows about it ahead of time. A picture timetable and a two-minute warning before pack-up made transitions smooth.\" Strategy: go through the day's timetable with him each morning in his first weeks, and tell him early about excursions or a relief teacher.",
        "Learning. Instead of \"Arlo has a short attention span\", write: \"Arlo stays with a task for twenty minutes or more when it involves building or moving things, such as ramps and marble runs.\" Strategy: bring early literacy and numeracy into construction, for example measuring his ramps or labelling what he builds.",
        "Communication. Instead of \"Arlo's speech is unclear\", write: \"Arlo talks in short sentences and uses gesture to fill the gaps; adults who know him understand him easily.\" Strategy: give him time to answer, and say the full sentence back without correcting him (\"Yes, the truck went down the big ramp\"). If the family has shared a speech pathology report, Section 1.2 is the place for it, with their agreement.",
      ],
    },
    {
      heading: "Strategy starters a Foundation teacher can act on",
      paragraphs: [
        "Each strategy should name the child, what helps, and when to use it. These openers keep them specific:",
        "\"[Child] settles best when… so in the first weeks…\"",
        "\"When joining a group, give [child] a role such as…\"",
        "\"Check in with [child] by name after… and give them a moment before expecting an answer.\"",
        "\"[Child] is very interested in… Use it to introduce…\"",
        "\"Ask [child] open questions such as 'What will you try next?' rather than showing them how.\"",
        "\"Tell [child] about changes ahead of time, such as a relief teacher or an excursion.\"",
        "\"If [child] is going to the same school as a friend from kinder, pair them for the first fortnight.\"",
        "If a strategy would suit any child in the room, it is not specific enough yet. Go back to a moment you documented and ask what you did that worked.",
      ],
    },
    {
      heading: "Write it from the year, not from November",
      paragraphs: [
        "A statement written from memory in Term 4 drifts towards the generic: happy, friendly, loves outdoor play. A statement written from your documentation can say what actually happened. Before you open the tool, pull together two or three dated moments for each outcome, the child's own words, and anything the family has told you.",
        "For Section 2, ask the child simple questions in a calm moment and write their answers exactly: what they like doing at kinder, what they are looking forward to at big school, what they might need help with. Short and in their words is exactly right.",
        "For Section 3, give families the information sheet early and enough time to write. Some will want to talk it through instead, and that is worth the ten minutes.",
      ],
    },
    {
      heading: "What to leave out",
      paragraphs: [
        "Leave out comparisons with other children, diagnosis-style words you are not qualified to use, deficit language (\"cannot\", \"struggles with\") without the strategy that helps, and family circumstances the family has not agreed to share. If you could not point to where you saw it, it does not belong in the statement.",
        "If a child has extra needs, Section 1.2 is the place to record the other professionals supporting them and any reports that will help the school plan, with the family's agreement.",
      ],
    },
  ],
  "learning-story-next-steps-examples": [
    {
      heading: "Twelve next steps, babies to five year olds",
      paragraphs: [
        "Each example below gives the educator's note, the \"where to next\" section exactly as StoryLoop wrote it, and why it works. They cover both Te Whāriki and EYLF V2.0.",
      ],
    },
    ...nextStepBlocks(),
    {
      heading: "Turning a weak next step into a strong one",
      paragraphs: [
        "Weak: \"We will continue to support Zara's interest in painting.\" Strong: \"We will place two colours side by side at the easel, give Zara time to mix, and notice whether she names the colour change again.\" The difference is an action, a material and something to watch for.",
        "Weak: \"Liam needs to work on his feelings.\" Strong: \"We will keep a quiet drawing space ready at drop-off and sit nearby, giving him time to talk if he chooses.\" The first is a judgement. The second is what a kind adult will actually do tomorrow.",
      ],
    },
  ],
  "learning-story-examples-preschool": [
    {
      heading: "Seven stories, three to five year olds",
      paragraphs: [
        "For each one: the educator's note, how StoryLoop's draft opens, its curriculum link and what makes the story strong. Every quote is exactly as the draft has it.",
      ],
    },
    ...preschoolBlocks(),
  ],
  "end-of-year-learning-summary": [
    {
      heading: "A structure that works",
      paragraphs: [
        "Who they are now: two or three sentences a family will recognise straight away.",
        "How they have grown: one early moment and one recent moment, side by side, with the child's own words.",
        "What they are learning: two or three areas, each linked to your framework with the evidence that shows it.",
        "What is next: where they are heading, and one simple way to support it at home or at school.",
      ],
    },
    {
      heading: "Example paragraph, Australia (EYLF V2.0)",
      paragraphs: [
        "Written for an imagined child to show the shape: \"In February, Theo watched the block corner from the doorway for most of the morning. This term he is usually the one deciding what the group will build, and last week he told Ava, 'You do the roof, I'll do the walls.' He has grown into a confident, involved learner who plans, tests and explains his ideas (Outcome 4), and he is learning to share a plan with others (Outcome 2). Next year, Theo will enjoy building with friends and being given a job in a group.\"",
      ],
    },
    {
      heading: "Example paragraph, Aotearoa (Te Whāriki)",
      paragraphs: [
        "Again for an imagined child: \"When Hana started with us she held Mum's hand at the gate every morning. Now she runs to find Kiri and they head straight for the garden, where Hana checks on the beans she planted. 'They got bigger, look!' she told us last week. Hana's sense of belonging (Mana whenua) and her curiosity about living things (Mana aotūroa) have grown together this year. At home you might like to grow something small together and talk about how it changes.\"",
      ],
    },
    {
      heading: "Phrases that say nothing",
      paragraphs: [
        "\"Has had a wonderful year.\" \"Is a pleasure to have in the room.\" \"Enjoys all areas of the curriculum.\" Every family receives these lines. Replace each one with a moment only this child could have had.",
      ],
    },
    {
      heading: "Getting them done in Term 4",
      paragraphs: [
        "Do not start from a blank page. Start from what you already have: this year's stories for the child, their recorded words, and what the family has told you. Pick the two moments first, then write around them. A summary built that way takes about fifteen minutes, not an evening, and it is truer.",
      ],
    },
  ],
  "summative-assessment-examples": [
    {
      heading: "Who reads it, and what they need",
      paragraphs: [
        "Families read a summative assessment to find out how their child has grown. The next educator reads it to know where to start. An assessor reads it to see the planning cycle working: what you noticed, what you made of it and what you did next. All three want the same thing, which is progress shown with evidence and a clear next step.",
        "ACECQA's guidance for Element 1.3.1 puts it plainly: analyse each child's learning in relation to the learning outcomes, identify progress that can be shared with families, and use it to set goals for further learning. A summative assessment is where that analysis is written down.",
      ],
    },
    {
      heading: "A structure you can copy",
      paragraphs: [
        "Child's first name, age and the period covered, for example Term 3, 14 July to 19 September.",
        "Evidence used: how many observations and learning stories, plus anything the family or the child told you.",
        "Who they are now: two sentences a family will recognise straight away.",
        "Outcome by outcome: what you saw, with dates; what it shows; one next step. Use the five EYLF V2.0 outcomes as points of reference, and say honestly when an outcome was not documented this period.",
        "The child's voice: what they said about their own learning, in their exact words.",
        "Goals for next term: two or three, each one an action an educator can take tomorrow.",
      ],
    },
    {
      heading: "Example 1: Isla, 2 years, Term 3",
      paragraphs: [
        "An imagined child, to show the shape. The four observations it is built from: 22 July, Isla cried at the gate when Dad left and settled after ten minutes on an educator's lap with a lift-the-flap book. 6 August, she carried her bag to her hook and hung it up herself: \"my bag\". 27 August, at the sandpit she filled a bucket, tipped it out and said \"again!\" each time. 16 September, she waved to Dad at the gate and walked to the sandpit with Mia: \"bye Dad, sand\".",
        "Outcome 1, identity: In July Isla needed an educator and a familiar book to settle after drop-off. By September she waved goodbye at the gate and walked off to play (16 September). She is building a secure sense of belonging and takes pride in doing things for herself (\"my bag\", 6 August).",
        "Outcome 3, wellbeing: Isla manages more of her own arrival routine each week, from carrying her bag to choosing where to play.",
        "Outcome 4, learning: Isla repeats an action to see what happens again, filling and tipping a bucket and asking for \"again!\" (27 August).",
        "Outcome 5, communication: Isla is putting two words together: \"my bag\" and \"bye Dad, sand\".",
        "Outcome 2, community: Not documented enough this term. Next term, watch how Isla plays alongside others at the sandpit, which began with Mia on 16 September.",
        "Next steps: keep the same goodbye routine at the gate. Offer buckets, sieves and scoops of different sizes so she can keep testing full and empty. Say short phrases back to her, such as \"full bucket\" and \"tip it out\", so she hears the next words to try.",
      ],
    },
    {
      heading: "Example 2: Kai, 3 years, Term 3",
      paragraphs: [
        "Built from four observations: 15 July, Kai built a tall tower alone in the block area, knocked it down and laughed. 5 August, he asked Noah \"you want the red one?\" and passed him a block. 26 August, at group time he told everyone about his nana's chickens: \"they lay eggs every day\". 9 September, Kai and Noah built a chicken house together, and Kai said \"we need a door so they don't get out\".",
        "Outcome 2, community: Kai's block play has moved from building alone (15 July) to building with a friend (9 September). He offers materials to others (5 August) and shares the plan for what they are making.",
        "Outcome 1, identity: His family is part of his play. Nana's chickens went from a story at group time (26 August) to a building project two weeks later.",
        "Outcome 4, learning: Kai plans with a purpose. \"We need a door so they don't get out\" shows him thinking ahead about what his building has to do.",
        "Outcome 5, communication: Kai speaks confidently to the whole group and asks a friend questions during play.",
        "Outcome 3, wellbeing: Not documented this term. Add an observation of Kai's outdoor and physical play next term.",
        "Next steps: invite the family to send a photo of Nana's chickens for the block area. Add animal figures and loose parts for fences and gates. Ask \"What else will the chickens need?\" and notice whether Kai invites more children into the project.",
      ],
    },
    {
      heading: "Example 3: Amara, 4 years, end of year",
      paragraphs: [
        "Built from four observations across the year: 3 February, Amara watched at the drawing table and asked an educator to draw a cat for her. 12 May, she drew a cat herself and wrote an A beside it: \"That's me, A for Amara\". 18 August, she made a menu for the home corner café with drawings and letters, and took her friends' orders. 14 October, she wrote AMARA and MUM on a card, sounding out \"mmm, Mum\".",
        "Outcome 5, communication: Across the year Amara has moved from asking an adult to draw for her (February) to writing her name and sounding out a word (October). She uses writing for real reasons, like the café menu in August.",
        "Outcome 4, learning: Amara has grown into a confident learner who has a go. She tried drawing for herself, then letters, then whole words.",
        "Outcome 1, identity: She connects writing with who she is: \"That's me, A for Amara\".",
        "Outcome 2, community: Her café play brings other children in, with Amara taking orders and serving.",
        "Outcome 3, wellbeing: Only one documented moment this year, so it is left short here rather than stretched.",
        "Next steps for school: give Amara real reasons to write, such as lists, labels, cards and signs. Point out the letters of her name in words around the room, and let her lead play that uses writing, such as a café or a shop.",
      ],
    },
    {
      heading: "Words that weaken a summative assessment",
      paragraphs: [
        "\"Has had a great term.\" \"Enjoys all areas of the program.\" \"Is a pleasure to have in the room.\" These could be written about any child, so they tell the reader nothing. Replace each with a dated moment only this child had.",
        "Leave out comparisons with other children, scores and ages-and-stages labels you cannot back with evidence, and deficit words such as \"can't\" or \"struggles\" without what helps. Describe what the child does and what supports them.",
      ],
    },
    {
      heading: "Doing a room of them in Term 4",
      paragraphs: [
        "Start with the evidence, not the template. For each child, pull this term's stories and observations, their recorded words and any family comments, and pick the two or three moments that best show change. Write around those. A summative assessment built that way takes about fifteen minutes, and it is truer than one written from memory in the last week of term.",
        "Paste those moments into the draft box on this page and StoryLoop drafts each outcome and a next step from them, leaving an outcome for you when your notes show nothing. If your stories are already in StoryLoop, each child's history keeps dated stories, quotes and family comments in one place, and Educator Pro's Term report turns a term of saved stories into one printable page.",
      ],
    },
  ],
  "nsw-transition-to-school-statement": [
    {
      heading: "Section by section",
      paragraphs: [
        "Child's details and consent. Enter the details as they appear on the enrolment form. In the digital statement you upload the signed department consent form; if a family does not consent, note that on the form and keep a copy in the child's records.",
        "About the child (being and belonging). Who the child is and how they are connected to family, community, culture and place: cultural background, whether the child or family identifies as Aboriginal and/or Torres Strait Islander, languages other than English, the important people in their life and activities outside the service, how long and how often they have attended, and any additional learning and support needs, with the professionals involved.",
        "Feelings about school (child's voice). What the child thinks and feels about starting school, gathered from everyday conversations and experiences. Write their words exactly.",
        "Child's learning and development. One question for each of the five EYLF V2.0 outcomes. The department's guide asks for a summary built from the year's documentation: strengths, emerging skills, interests, relationships and intentional teaching strategies. This is a summative assessment, so every line should point to something you saw.",
        "Future planning and follow-up. Strategies for the Kindergarten teacher, and the required question about whether the school should follow up with your service by phone or meeting before the child starts.",
      ],
    },
    {
      heading: "Example wording, outcome by outcome",
      paragraphs: [
        "Written for an imagined child, Zoe, to show the shape. Each line says what was seen and gives a strategy the Kindergarten teacher can use. Yours should come from your own documentation.",
        "Outcome 1, identity: Zoe settles quickly when she arrives with a plan. Most mornings this year she told an educator what she would build first, then went straight to it. Strategy: in her first weeks, greet Zoe at the door and ask what she will do first, then help her start.",
        "Outcome 2, community: Zoe often leads games in the home corner and hands out the roles (\"you're the vet, I'm the nurse\"). This term she has started letting friends change the plan. Strategy: give Zoe a helper role in group work, and name it when she takes up someone else's idea.",
        "Outcome 3, wellbeing: Zoe climbs, balances and runs with confidence. When she is upset she takes a book to a quiet corner and comes back when she is ready. Strategy: show Zoe where the quiet space is in the classroom, and give her a minute before talking.",
        "Outcome 4, learning: Zoe stays with a problem. In June she spent a whole morning making a bridge for the cars that would not fall down, trying blocks, then cardboard, then tape. Strategy: ask \"What else could you try?\" before showing her, and give her time to finish.",
        "Outcome 5, communication: Zoe writes her name and the first letters of her friends' names, and makes signs for her play (\"VET OPEN\"). Strategy: give Zoe real reasons to write, such as signs, labels and lists, from the first week.",
      ],
    },
    {
      heading: "Strategies written the department's way",
      paragraphs: [
        "The department's guide suggests writing strategies with who, what, where or when, and how. Weak: \"Support Ben's social skills.\" Strong: \"When Ben joins a group game, give him a role straight away, such as counting for hide and seek, and stay nearby for the first few minutes.\"",
        "Weak: \"Ella needs help with transitions.\" Strong: \"Tell Ella about changes to the day at the start of the morning, and give her a two-minute warning before pack-up.\" The strong version names the child, the action and the moment, so a teacher can do it on day one.",
      ],
    },
    {
      heading: "Doing a room of them before the holidays",
      paragraphs: [
        "Start with the evidence, not the form. For each child, pull this year's observations and stories, the child's own words and what the family has told you, and pick two or three dated moments for each outcome. Then paste those moments into the draft box on this page: StoryLoop drafts a line and a strategy for each outcome from them and leaves an outcome for you when your notes show nothing.",
        "If your stories are already in StoryLoop, each child's history keeps dated stories, quotes and family comments in one place, and the Transition pack puts up to six chosen moments on one printable page for a child starting school, ready to draw on when you complete the official statement.",
      ],
    },
  ],
  "qld-kindergarten-transition-statement": [
    {
      heading: "The five QKLG areas, with example wording",
      paragraphs: [
        "Written for an imagined child, Mila, to show the shape. Each area says what was seen and gives a suggestion for continuity the Prep teacher can act on. Yours should come from your own documentation.",
        "Identity: Mila arrives ready to play and tells educators what she plans to do. When she finished a puzzle she had worked on for days, she called out \"I did it by myself!\" Suggestion: give Mila a small job in her first week, and notice her effort out loud.",
        "Connectedness: Mila plays with a close group of three friends and has started inviting new children in. She looked after the worm farm all term and reminded others to be gentle. Suggestion: give her a care job in the classroom, such as the plants or a class pet.",
        "Wellbeing: Mila is confident on the climbing frame and serves herself at lunch. She says when she is tired and asks for a rest. Suggestion: tell her about changes to the day ahead of time.",
        "Active learning: Mila sticks with hard tasks. She worked out a 48-piece puzzle over three days, sorting the edge pieces first. Suggestion: offer puzzles and building challenges, and ask her how she will start.",
        "Communicating: Mila speaks Vietnamese and English at home, retells stories with the puppets and writes the M in her name. Suggestion: welcome her Vietnamese words in class, and give her real reasons to write.",
      ],
    },
    {
      heading: "Using the KTS app",
      paragraphs: [
        "Access is through the QCAA Portal: log in and choose the Kindergarten Transition Statement tile. A service nominates Access Administrators (two are recommended), and staff with the Editor, Submitter, Delegate or Director role can all write statements.",
        "You will enter the program enrolment start date and the number of days enrolled across the 40-week program, and absent days when you submit. Once a statement is submitted, only the consent information can be edited, so check it before you press submit.",
        "Schools find statements assigned to them, or search by the service name, the child's given and family names as they appear on the birth certificate, and the date of birth. Enter the child's details exactly, or the school may not find the statement.",
      ],
    },
    {
      heading: "Strengths-based wording",
      paragraphs: [
        "QCAA asks for statements written from a strengths-based perspective. Weak: \"Noah struggles to share.\" Strong: \"Noah shares more easily when there are two of something. With a second shovel nearby, he offered one to a friend in the sandpit.\"",
        "Weak: \"Ava is shy.\" Strong: \"Ava watches a new game for a few minutes before she joins, and joins easily when an adult offers her a role.\" Each strong version describes something a teacher could see for themselves, and what helped.",
      ],
    },
    {
      heading: "Getting a room of them done in November",
      paragraphs: [
        "Collect consent forms early, so the app is open to you when you are ready to write. For each child, pull the year's observations and stories, their own words and what the family has told you, then pick two or three dated moments for each area. Paste those into the draft box on this page: StoryLoop drafts a line and a suggestion for each QKLG area from them, and leaves an area for you when your notes show nothing.",
        "If your stories are already in StoryLoop, each child's history keeps dated stories, quotes and family comments in one place, and the Transition pack puts up to six chosen moments on one printable page for a child starting school.",
      ],
    },
  ],
  "transition-statement-consent-form": [
    {
      heading: "The NSW consent form, part by part",
      paragraphs: [
        "The department's form explains, in family-friendly language, what is shared and why. The statement can include the child's name, date of birth, behaviour and attendance, whether any court orders are in place, health information such as allergies, disability, specialist support or an NDIS plan, and educators' observations about the child's feelings about school and their learning and development.",
        "Then come two choices. The first is consent for your service to share the information in the child's statement with the department, which uses it if the child is going to a NSW government school or passes it to the non-government school the child will attend. The second is consent to share relevant information that is not in the statement, such as what comes up in a phone call or email between your service and the school.",
        "The second choice links to a required question in Section Two of the statement: \"Would making a call to the Early Learning and Care Service help to support the child's transition?\" Families can agree to either, both or neither, then sign and date the form. Upload the signed form to the platform before you start the statement.",
      ],
    },
    {
      heading: "Queensland: forms 1 and 2, in the order you need them",
      paragraphs: [
        "Form 1 first. Under Queensland's privacy laws, a parent or carer completes Transition statement consent form 1 before you enter any of the child's personal details into the KTS app. If a family does not give it, write the statement on the QCAA kindergarten transition statement template instead.",
        "Write the statement. Then form 2: before you submit, the family reads the draft. They can add their own perspective on the move to school, ask for any wrong personal details to be fixed, and give written permission to share the statement with the school. They can also name the school on form 2 if they know it.",
        "Give the family a copy of the submitted statement, and keep both forms with the statement for three years after the child leaves your service.",
      ],
    },
    {
      heading: "Victoria: no form to create, a choice about sharing",
      paragraphs: [
        "A TLDS is a kindergarten funding requirement for every child going to school, and the Victorian Government's TLDS page does not describe a form to create one. What it does require: the family must get the secure link to the finished statement and the chance to opt out of it going to the school. Section 3 of the TLDS is the family's own section, and Section 2 is the child's, completed with an adult's help.",
        "Unless the family has opted out, the statement goes to the school online through the Insight Assessment Platform, by secure email if the school is not listed in the online tool, or printed for the family to hand to the school themselves.",
      ],
    },
    {
      heading: "Explaining consent to a family: words you can adapt",
      paragraphs: [
        "Families sign more readily when they know what the statement is for. The NSW department suggests explaining the purpose and benefits, and showing the consent form video. Something like this works at pick-up or in a note home.",
        "NSW example: \"Before Zoe starts Kindergarten, we write a short statement about her strengths, her interests and how she learns best, and send it to her new school so her teacher can get to know her. The form asks two things: whether we can share the statement, and whether we can talk to the school if that would help her settle. You can say yes or no to each, and change your mind later.\"",
        "Queensland example: \"We would like to write Mila's transition statement in QCAA's online KTS app. Form 1 lets us start it. When it is written, we will show it to you first. You can add your own thoughts, and then form 2 lets us send it to her school.\"",
        "Victoria example: \"Arlo's TLDS is ready. Here is the secure link so you can read it. Unless you tell us you would rather it was not shared, we will send it to his school.\"",
      ],
    },
    {
      heading: "Situations that come up",
      paragraphs: [
        "A child goes to two services (NSW). Only the child's primary service, the one receiving Start Strong funding, has to complete the statement, but the department encourages the second service to contribute.",
        "The child is going to a non-government or interstate school (NSW). Only NSW public schools can open the digital statement. Save it as a PDF and share it yourself.",
        "Parents are separated (Queensland). QCAA leaves it to each service to decide how to manage consent to share for its own situation.",
        "A second year of kindergarten (Queensland). Submit the statement with no consent to share with a school, then write a new one at the end of the second year.",
        "Cultural information (NSW). The department recommends getting the family's permission before sharing specific cultural information with the school.",
      ],
    },
    {
      heading: "A Term 4 order of jobs",
      paragraphs: [
        "Send consent forms out early, so you are never waiting on paperwork when you have time to write. The NSW department recommends finalising statements by early December, and Queensland kindergartens complete theirs in November.",
        "While the forms come back, pull together each child's year: dated observations and stories, the child's own words about school, and what the family has told you. Paste two or three moments into the draft box on this page, and StoryLoop drafts a line and a strategy for each outcome from them, leaving an outcome for you when your notes show nothing.",
        "If your stories are already in StoryLoop, each child's history keeps dated stories, quotes and family comments in one place, and the Transition pack puts up to six chosen moments on one printable page for a child starting school, ready to draw on when you complete the official statement.",
      ],
    },
  ],
};
