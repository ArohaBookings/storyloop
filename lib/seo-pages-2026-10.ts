/**
 * Guides added 13 Oct 2026, aimed at what educators search for in Term 4 and
 * at the questions AI assistants are asked about learning stories.
 *
 * Why these five (production data, 60 days to 13 Oct 2026): guide landings had
 * started to come from Google (50 Google sessions in the week to 13 Oct, up
 * from 27), with /transition-to-school-statement suddenly the second most
 * visited guide as Term 4 began. Victoria's TLDS is a funding requirement due
 * by the end of Term 4, end of year summaries are written in the same weeks,
 * and "can I use ChatGPT for this" is the question every educator asks first.
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
    title: "TLDS Examples: Writing a Victorian Transition Statement",
    description:
      "How to write a Transition Learning and Development Statement in 2026: what each section asks for, example wording and intentional teaching strategies.",
    kicker: "Victoria · Term 4 2026",
    heading: "Write a TLDS a Prep teacher will actually use.",
    intro:
      "Every funded kindergarten in Victoria has to complete a TLDS for each child starting school, by the end of Term 4. The online tool tells you which boxes to fill. It cannot tell you what to write. This guide covers what each section asks for, with example wording you can adapt from what you have already seen this year.",
    reviewedAt: "2026-10-13",
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
          "Not by putting a child's details into a public chatbot: Australia's privacy regulator recommends, as best practice, not entering personal information into publicly available generative AI tools. The judgement in a TLDS has to be yours. What helps is having the evidence in one place, which is what StoryLoop's transition pack does: it gathers a child's stories, their words and their family's comments onto one page to write from.",
      },
    ],
    sources: [
      { label: "Victorian Government: Transition Learning and Development Statements", url: "https://www.vic.gov.au/transition-learning-and-development-statements" },
      { label: "Victorian Government: Completing 2026 Transition Learning and Development Statements (August 2026 update)", url: "https://www.vic.gov.au/early-childhood-update-august-2026/completing-2026-transition-learning-and-development-statements" },
      { label: "Victorian Government: Complete an online Transition Learning and Development Statement", url: "https://www.vic.gov.au/complete-online-transition-learning-and-development-statement" },
      { label: "OAIC: Guidance on privacy and the use of commercially available AI products", url: "https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products" },
    ],
  },

  "chatgpt-for-learning-stories": {
    slug: "chatgpt-for-learning-stories",
    title: "Can You Use ChatGPT to Write Learning Stories?",
    description:
      "What the NZ and Australian privacy regulators say about putting children's details into ChatGPT, a safer way to use it, and where general chatbots go wrong.",
    kicker: "AI guide · Aotearoa and Australia",
    heading: "ChatGPT can write a learning story. That is not the hard part.",
    intro:
      "Plenty of educators already paste a note into ChatGPT and get a story back in seconds. It works, up to a point. The problems are where the child's details go, what the story claims that nobody saw, and whether it sounds like every other AI story. Here is what the privacy regulators on both sides of the Tasman actually say, and how to use AI without putting a child's information somewhere it should not be.",
    reviewedAt: "2026-10-13",
    sections: [
      {
        title: "The privacy line",
        body:
          "Australia's OAIC recommends, as best practice, not entering personal information, particularly sensitive information, into publicly available generative AI tools. New Zealand's Privacy Commissioner recommends not uploading personal or confidential information to generative AI tools unless the provider confirms it is not kept or disclosed.",
      },
      {
        title: "The accuracy line",
        body:
          "A general chatbot will happily add what you never saw: feelings, intentions, curriculum links the note does not support. Every claim in a learning story should trace back to something an educator observed.",
      },
      {
        title: "The voice line",
        body:
          "Families notice when every story sounds the same. Generic AI wording, the remarkable journeys and wonderful explorations, reads as if nobody was really watching their child.",
      },
    ],
    faqs: [
      {
        question: "Is it against the law to put a child's name into ChatGPT?",
        answer:
          "Neither regulator has issued a blanket ban for educators, but both say the Privacy Act applies to AI, and both recommend not entering personal information into public generative AI tools. Your service's own policy may go further. If in doubt, leave names, photos and family details out.",
      },
      {
        question: "Is it safe if I take the child's name out?",
        answer:
          "Removing names, ages, family details and anything unusual enough to identify a child lowers the risk a lot. In a small community an observation can still identify a child, and it does nothing for accuracy or voice, which you still have to check line by line.",
      },
      {
        question: "Does ChatGPT use what I type to train its models?",
        answer:
          "On the consumer ChatGPT app, OpenAI may use your conversations to improve its models unless you turn that off in the data controls settings. Its business and API services are not used for training by default. Check OpenAI's current terms before relying on either.",
      },
      {
        question: "How is StoryLoop different from pasting a note into ChatGPT?",
        answer:
          "StoryLoop uses OpenAI or Anthropic models through their business services, whose terms do not allow your notes to be used for training, and it stores notes in Sydney. Around the model it checks quotes against your note, uses the right curriculum for your country, shows what every claim is built on, and flags privacy risks before anything is shared. You still read and sign off every word.",
      },
      {
        question: "Can a good prompt make ChatGPT write better learning stories?",
        answer:
          "It helps. Tell it to use only what is in the note, to quote the child exactly, to name links to Te Whāriki or the EYLF only where the note shows them, and to avoid praise words. It will still need checking against what you saw, every time.",
      },
    ],
    sources: [
      { label: "OAIC: Guidance on privacy and the use of commercially available AI products (21 October 2024)", url: "https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products" },
      { label: "Office of the Privacy Commissioner (NZ): Generative artificial intelligence", url: "https://www.privacy.org.nz/resources-and-learning/a-z-topics/ai/generative-artificial-intelligence/" },
      { label: "OpenAI Help Center: How your data is used to improve model performance", url: "https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance" },
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
          "Do not paste a child's details into a public chatbot; both the Australian and New Zealand privacy regulators advise against it. Write the summary yourself from your own documentation. If your stories are in StoryLoop, each child's history puts a year of notes, quotes and family comments in one place to write from.",
      },
    ],
    sources: [
      { label: "ACECQA: Element 1.3.3 Information for families", url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning/element-133-information-families" },
      { label: "Te Whāriki Online: Te Whāriki, the early childhood curriculum (Ministry of Education, 2017)", url: "https://tewhariki.tahurangi.education.govt.nz/te-wh-riki-early-childhood-curriculum-document/5637184332.p" },
      { label: "OAIC: Guidance on privacy and the use of commercially available AI products", url: "https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products" },
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
  "chatgpt-for-learning-stories": [
    {
      heading: "A safer way to use a general chatbot",
      paragraphs: [
        "Check your service's policy first. Some services do not allow general AI tools for anything about children, and that decision is theirs to make.",
        "If it is allowed: describe what happened, not who it happened to. Use a placeholder instead of the child's name, leave out ages, family details, health information and anything distinctive, and never paste photos.",
        "Ask for structure, not judgement. \"Organise this note into a learning story with the moment, the learning, a Te Whāriki link and a next step\" is safer than \"Tell me what this child is learning\". You are the one who knows.",
        "Then check every sentence against your note. Delete anything you did not see, anything about the child's feelings you cannot back up, and any link the moment does not show.",
      ],
    },
    {
      heading: "Where general chatbots go wrong in learning stories",
      paragraphs: [
        "They invent. Ask for a learning story from three lines and you will often get a child who \"beamed with pride\" or \"was determined to succeed\". Neither was in the note.",
        "They overclaim curriculum. A sandpit moment gets linked to four outcomes because they all sound plausible. Assessors and families notice when links are generic.",
        "They mix up frameworks and spelling: EYLF language in a Te Whāriki story, American spelling, outcomes that do not exist in EYLF V2.0.",
        "They drift into diagnosis words. \"Shows signs of\" and \"may have difficulty with\" do not belong in a learning story written by a chatbot that has never met the child.",
      ],
    },
    {
      heading: "When a purpose-built tool is worth it",
      paragraphs: [
        "If you write one learning story a month, a careful prompt and a careful read may be all you need. If you write ten a week, the risk adds up: privacy terms you have not read, links you do not have time to check, and a voice that starts to sound like a machine.",
        "That is the gap StoryLoop was built for: your note goes in, the draft comes back with what every claim is built on, the child's words checked against your note, and the right curriculum for your country. You edit it and sign it off. Three stories a month are free, so you can judge it on your own notes.",
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
};
