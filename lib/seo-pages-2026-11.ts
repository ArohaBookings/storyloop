import type { SeoPage } from "./seo-pages";
import { EYLF_OUTCOMES } from "./eylf-outcomes";
import { TE_WHARIKI_STRANDS } from "./te-whariki-strands";

/**
 * An EYLF V2.0 key component written out in full from lib/eylf-outcomes.ts
 * (the published wording), so an example can never misquote the framework.
 */
function eylfKeyComponent(code: string): string {
  for (const outcome of EYLF_OUTCOMES) {
    const sub = outcome.subs.find((item) => item.code === code);
    if (sub) return `EYLF Outcome ${outcome.n}: ${outcome.title}, "${sub.text}" (${code})`;
  }
  throw new Error(`Unknown EYLF key component ${code}`);
}

/**
 * A Te Whāriki learning outcome with its strand, from lib/te-whariki-strands.ts
 * (copied from Te Whāriki 2017), found by its English wording.
 */
function teWharikiOutcome(english: string): string {
  for (const strand of TE_WHARIKI_STRANDS) {
    const outcome = strand.outcomes.find((item) => item.en === english);
    if (outcome) return `${strand.maori} | ${strand.english}, "${outcome.mi} | ${outcome.en}"`;
  }
  throw new Error(`Unknown Te Whāriki learning outcome ${english}`);
}

/**
 * Guides added 12 Nov 2026: three questions the November features answer and
 * that no page of ours answered.
 *
 * Why these three. Every one is a question somebody types in full, to a search
 * box or to an assistant, and each has a real answer before StoryLoop is
 * mentioned: what to translate for a family and what never to, how to get a
 * note into English without losing it, and what a leader should check in a
 * story. The product comes last on each page, as how we do it.
 *
 * Every official line quoted here was read on the official page on 12 Nov
 * 2026: NQS Elements 6.1.2 and 7.2.2 on ACECQA's Quality Area 6 and 7 pages,
 * Element 1.3.3 on its Guide to the NQF page, and the Mana reo strand statement
 * in Te Whāriki. What StoryLoop is said to do is what the code does
 * (lib/family-link.ts, lib/note-language.ts, lib/story-check.ts).
 */

const ACECQA_QA6 = {
  label: "ACECQA: Quality Area 6, Collaborative partnerships with families and communities",
  url: "https://www.acecqa.gov.au/nqf/national-quality-standard/quality-area-6-collaborative-partnership-with-families-and-communities",
};
const ACECQA_QA7 = {
  label: "ACECQA: Quality Area 7, Governance and leadership",
  url: "https://www.acecqa.gov.au/nqf/national-quality-standard/quality-area-7-governance-and-leadership",
};
const ACECQA_133 = {
  label: "ACECQA: Element 1.3.3, Information for families",
  url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning/element-133-information-families",
};
const ACECQA_13 = {
  label: "ACECQA: Standard 1.3, Assessment and planning",
  url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning",
};
const TE_WHARIKI = {
  label: "Te Whāriki: the early childhood curriculum document (Ministry of Education)",
  url: "https://tewhariki.tahurangi.education.govt.nz/te-wh-riki-early-childhood-curriculum-document/5637184332.p",
};
const EYLF_V2 = {
  label: "Belonging, Being and Becoming: the Early Years Learning Framework for Australia V2.0",
  url: "https://www.acecqa.gov.au/sites/default/files/2023-01/Belonging_Being_And_Becoming_V2.0.pdf",
};

const MTOP_V2 = {
  label: "My Time, Our Place: Framework for School Age Care in Australia V2.0 (2022), Australian Government Department of Education for the Ministerial Council",
  url: "https://www.acecqa.gov.au/sites/default/files/2023-01/MTOP-V2.0.pdf",
};

/**
 * My Time, Our Place V2.0: the five outcomes and their key components, copied
 * on 18 Nov 2026 from the framework PDF (MTOP_V2). Each key component is the
 * heading of its own section (pages 35 to 62); the bullet lists at the top of
 * each outcome word three of them slightly differently ("and agency", "a sense
 * of positive self-worth", "the reciprocal rights"). Every key component starts
 * "Children and young people".
 */
export const MTOP_OUTCOMES: Array<{ n: number; title: string; components: string[] }> = [
  {
    n: 1,
    title: "Children and young people have a strong sense of identity",
    components: [
      "feel safe, secure and supported",
      "develop their autonomy, interdependence, resilience and sense of agency",
      "develop knowledgeable, confident self-identities and a positive sense of self-worth",
      "learn to interact in relation to others with care, empathy and respect",
    ],
  },
  {
    n: 2,
    title: "Children and young people are connected with and contribute to their world",
    components: [
      "develop a sense of belonging to groups and communities and an understanding of their reciprocal rights and responsibilities necessary as active and informed citizens",
      "respond to diversity with respect",
      "become aware of fairness",
      "become socially responsible and show respect for the environment",
    ],
  },
  {
    n: 3,
    title: "Children and young people have a strong sense of wellbeing",
    components: [
      "become strong in their social, emotional and mental wellbeing",
      "become strong in their physical learning and wellbeing",
      "are aware of and develop strategies to support their own mental and physical health, and personal safety",
    ],
  },
  {
    n: 4,
    title: "Children and young people are confident and involved learners",
    components: [
      "develop a growth mindset and learning dispositions such as curiosity, cooperation, confidence, creativity, commitment, enthusiasm, persistence, imagination and reflexivity",
      "develop a range of learning and thinking skills and processes such as problem solving, inquiry, experimentation, hypothesising, researching and investigating",
      "transfer and adapt what they have learned from one context to another",
      "resource their own learning through connecting with people, place, technologies and natural and processed materials",
    ],
  },
  {
    n: 5,
    title: "Children and young people are effective communicators",
    components: [
      "interact verbally and non-verbally with others for a range of purposes",
      "engage with and gain meaning from a range of visual images and texts",
      "collaborate with others, express ideas and make meaning using a range of digital technologies and media and communication technologies",
    ],
  },
];

/** An MTOP V2.0 key component quoted in full, so an example cannot misquote it. */
function mtopKeyComponent(n: number, component: string): string {
  const outcome = MTOP_OUTCOMES.find((item) => item.n === n);
  if (!outcome || !outcome.components.includes(component)) {
    throw new Error(`Unknown MTOP key component ${n}: ${component}`);
  }
  return `MTOP Outcome ${n}: ${outcome.title}, "Children and young people ${component}"`;
}

/** One paragraph per MTOP outcome: its title, then its key components. */
function mtopOutcomeList(): string[] {
  return [
    "My Time, Our Place V2.0 has five outcomes. Each has key components, and every key component begins \"Children and young people\". Quote the one the moment actually shows.",
    ...MTOP_OUTCOMES.map(
      (outcome) =>
        `Outcome ${outcome.n}: ${outcome.title}. Key components: ${outcome.components
          .map((component) => `\"${component}\"`)
          .join("; ")}.`,
    ),
  ];
}

export const NOV_2026_PAGES: Record<string, SeoPage> = {
  "learning-stories-in-family-languages": {
    slug: "learning-stories-in-family-languages",
    title: "Learning Stories for Families Who Read Another Language",
    description:
      "How to share learning stories with families who do not read English easily: what to translate, what never to translate, and how families can write back.",
    kicker: "Families · home languages",
    heading: "A learning story the family can read in their own language.",
    intro:
      "The parent who smiles at pickup and never opens the story is often the parent who cannot read it. You wrote it for them, and it stopped at the language. This guide covers what the frameworks ask of you, what to translate and what to leave exactly as it was said, how to check a translation you cannot read yourself, and how to let a family answer in the language they think in.",
    reviewedAt: "2026-11-12",
    siblingLinks: {
      heading: "Close to this",
      links: [
        { label: "Writing the story when English is your second language", href: "/writing-learning-stories-english-second-language" },
        { label: "Learning stories families actually read", href: "/parent-friendly-learning-stories" },
      ],
    },
    sections: [
      {
        title: "What the frameworks ask",
        body:
          "In Australia, Element 6.1.2 of the National Quality Standard reads: \"The expertise, culture, values and beliefs of families are respected and families share in decision-making about their child's learning and wellbeing.\" Element 1.3.3 asks that families are informed about the program and their child's progress. In Aotearoa, Whānau tangata | Family and community is one of the four principles of Te Whāriki. None of them says \"in English\". A story a family cannot read has informed nobody.",
      },
      {
        title: "Translate your words. Leave the child's words alone.",
        body:
          "The part you wrote can be translated: what you saw, what you made of it, what you will try next. The part the child said cannot. \"More sand\" is evidence of exactly what a two-year-old said on a Tuesday, and once it is translated it is evidence of nothing. Keep every quote as it was spoken, in whichever language the child used, and keep names as they are. If the meaning will not be clear to the reader, put it in brackets after the quote.",
      },
      {
        title: "Checking a translation you cannot read",
        body:
          "You cannot proofread Punjabi if you do not read Punjabi, so make the English easy to translate well. Short sentences. One idea in each. No idioms: \"he was over the moon\" does not survive the trip. Say plainly at the top that a computer translated it, keep the English one tap away, and ask the family to tell you if something reads wrongly. For the first story or two, ask a colleague or a family member who reads the language to look it over. After that, what the family writes back will tell you whether it is landing.",
      },
      {
        title: "Let the family answer in their language",
        body:
          "A translated story is half of it. The half that changes your planning is what comes back: she does this with her grandmother's bangles, he only speaks Tongan with his cousins. A parent who would never write that in English will often write it in their own language. Give them a way to do it, read it beside their original words, and add what matters to the child's record in the family's own words.",
      },
      {
        title: "How StoryLoop does it",
        body:
          "On any saved story, tap Share with family and make a private link for Mum, Dad or Nana. There is no app to install and no password. They see the stories you have shared about that child and can write back under any of them. That much is on every plan. On the Educator Pro and Centre plans you also choose a language for the link: the story is shown in it, with a line at the top saying a computer translated it and a button back to the English, and when the family writes back in their own language you get their words with an English reading beside them. The child's own words are never translated. The ten languages are te reo Māori, Samoan, Tongan, Chinese (Simplified and Traditional), Hindi, Punjabi, Tagalog, Arabic and Vietnamese.",
      },
    ],
    faqs: [
      {
        question: "Which languages can a family read a learning story in?",
        answer:
          "Ten: te reo Māori, Samoan, Tongan, Simplified Chinese, Traditional Chinese, Hindi, Punjabi, Tagalog, Arabic and Vietnamese. They are drawn from the most widely spoken languages after English in the 2023 New Zealand Census and the 2021 Australian Census, plus Tongan, which is common in early learning in Aotearoa.",
      },
      {
        question: "Is the translation checked by a person?",
        answer:
          "No. A computer translates it, and the page says so at the top in the family's language. The English is one tap away, the child's own words are left exactly as they were said, and the family is asked to tell the teacher if something reads wrongly.",
      },
      {
        question: "Do families need an app or an account?",
        answer:
          "No. The link opens in the browser on any phone. It shows only the stories you chose to share about that child, and you can cancel it whenever you like.",
      },
      {
        question: "What if a family does not read easily in any language?",
        answer:
          "Then the story is not the tool, the conversation is. Read them the best line at pickup, show them the photo, and ask what they see at home. A translated story helps the families it helps. It does not replace talking.",
      },
      {
        question: "Is it safe to put a child's story through a translator?",
        answer:
          "The story is translated by the same AI provider that drafts stories, under the same terms: children's information is never used to train AI models. Use first names only, as you would in any story, and follow your service's policy on children's information.",
      },
    ],
    sources: [ACECQA_QA6, ACECQA_133, TE_WHARIKI],
  },

  "writing-learning-stories-english-second-language": {
    slug: "writing-learning-stories-english-second-language",
    title: "Writing Learning Stories in English as a Second Language",
    description:
      "For educators who think in another language: how to write a clear learning story in English without losing what you noticed or what the child actually said.",
    kicker: "For educators · writing in a second language",
    heading: "You noticed it in your own language. Start there.",
    intro:
      "Plenty of the best observers in early childhood think in Tagalog, Hindi, Mandarin, Samoan or Punjabi, and lose half of what they saw on the way into English. The noticing was never the problem. This guide is about getting what you saw onto the page first, in whatever language it arrives in, and then getting it into English you can stand behind.",
    reviewedAt: "2026-11-12",
    siblingLinks: {
      heading: "Close to this",
      links: [
        { label: "Sharing stories with families who read another language", href: "/learning-stories-in-family-languages" },
        { label: "How long a learning story should take", href: "/how-long-should-a-learning-story-take" },
      ],
    },
    sections: [
      {
        title: "Write the note in the language you think in",
        body:
          "A note is for you. Nobody marks it. Write it or say it the way it comes: you will get more detail down, faster, and the detail is what makes a story true. The English comes second, and it is a separate job.",
      },
      {
        title: "The child's words stay as the child said them",
        body:
          "If the child said it in English, write the English exactly, mistakes and all: \"I goed up\" is the evidence. If the child said it in Samoan or Mandarin, write that, and put the meaning in brackets. In Te Whāriki, the Mana reo | Communication strand says the languages and symbols of children's own and other cultures are promoted and protected, and Outcome 5 of the EYLF is that children are effective communicators. A child's home language, written down as they spoke it, is both of those on the page.",
      },
      {
        title: "Putting it into English, and checking it",
        body:
          "However the English gets made, by you, by a colleague or by a tool, check four things before you write the story from it. The names: who did what. The order: what happened first. The quotes: untouched. And nothing added: no feeling, no reason and no extra person that was not in your note. If a sentence says more than you saw, cut it back.",
      },
      {
        title: "Plain English is good English",
        body:
          "You do not need \"demonstrated\" or \"utilised\". \"He tried again\" is better than \"he demonstrated persistence\", because a parent can see it. Short sentences are easier to write correctly and easier to read, and many of the families reading are reading in their second language too.",
      },
      {
        title: "How StoryLoop does it",
        body:
          "On the story page, type or say your note in your own language. Under the note, tap \"Put it into English for me to check\". You get your note back in plain English, with anything a child said left exactly as they said it and its meaning in brackets. Read it against what you remember, change anything that is not right, then write the story. Your original note is one tap away if you want it back. It is on every plan, including the free one.",
      },
    ],
    faqs: [
      {
        question: "Is it cheating to use a tool for the English?",
        answer:
          "No more than a spellchecker is. The observation is yours, and so is the judgement about what it meant. What you sign is what you checked. If your service has a policy on AI tools, follow it, and tell your leader how you work.",
      },
      {
        question: "Will the story still sound like me?",
        answer:
          "It will sound plainer than a lot of learning stories, which families tend to prefer. Every word of the draft is yours to change, so edit anything that does not sound like you before it goes anywhere.",
      },
      {
        question: "What if the child spoke two languages in the same moment?",
        answer:
          "Write both, exactly as they were said, with the meaning in brackets where a reader would need it. Moving between languages is learning worth showing, and a family will recognise their child in it straight away.",
      },
    ],
    sources: [TE_WHARIKI, EYLF_V2],
  },

  "how-to-check-a-learning-story": {
    slug: "how-to-check-a-learning-story",
    title: "How to Check a Learning Story: A Leader's Two-Minute Guide",
    description:
      "What an educational leader or head teacher should check in a learning story before families see it: five questions, about two minutes, and feedback that helps.",
    kicker: "For educational leaders and head teachers",
    heading: "Check a learning story in two minutes, and say something useful.",
    intro:
      "You are the last reader before the family. You have a stack of stories, a room to run and no time to rewrite anybody's work, and you should not be rewriting it anyway. This is the short version: whose job it is, five questions to ask in order, and how to give an educator one piece of feedback they can use tomorrow.",
    reviewedAt: "2026-11-12",
    siblingLinks: {
      heading: "Close to this",
      links: [
        { label: "A one-page AI policy for your service", href: "/ai-policy" },
        { label: "StoryLoop for a whole centre", href: "/for-centres" },
        { label: "Critical reflection: examples and a template", href: "/critical-reflection-early-childhood" },
      ],
    },
    sections: [
      {
        title: "Whose job it is",
        body:
          "In Australia, Element 7.2.2 of the National Quality Standard reads: \"The educational leader is supported and leads the development and implementation of the educational program and assessment and planning cycle.\" Reading educators' documentation is one of the plainest ways to lead that cycle. In Aotearoa no rule names who checks a story. In practice it is the head teacher, a team leader or a mentor teacher.",
      },
      {
        title: "Five questions, in this order",
        body:
          "One. Is it true to the note? Ask to see what the educator wrote down at the time. Anything in the story that is not in the note, a feeling, a reason, another child, should come out or be confirmed. Two. Are the child's words exactly theirs? A quote that has been tidied up is no longer a quote. Three. Does each curriculum link point at something that happened? If you cannot put your finger on the sentence it comes from, the link is decoration. Four. Is there a next step somebody could do next week? \"Continue to support\" is not one. Five. Would this family be glad to read it? Strengths first, no labels, no diagnosis words, and no other child's full name.",
      },
      {
        title: "You need the note beside the story",
        body:
          "Most checking goes wrong because the leader sees only the finished story. A polished story with an invented detail reads better than a plain one that is true, and the only way to tell them apart is the note. If your educators do not keep their notes, that is the first thing to change.",
      },
      {
        title: "Feedback an educator can use",
        body:
          "Say one thing that is right, in the story's own words, and one thing to change. Do not rewrite it: a story rewritten by the leader teaches the educator that their writing is not wanted. If the same thing comes up in three people's stories, it is a team conversation, not three corrections.",
      },
      {
        title: "Stories drafted with an AI tool",
        body:
          "If educators in your service draft with an AI tool, the checks do not change. They matter more. Questions one and two catch what a careless tool gets wrong: detail that was never observed, and speech the child never said. Ask to see the note every time, and have a written line in your policy about which tools are used and what must never go into them.",
      },
      {
        title: "How StoryLoop does it",
        body:
          "An educator taps Send to my leader on a finished story and sends you a private link. You see their note beside the story, with the child's first name and the educator's first name and nothing else about either of them. You tap Looks good, or Suggest a change and say what you would change, and you are done in about two minutes. You do not need an account. The link opens that one story, lasts 14 days, and the educator can cancel it.",
      },
    ],
    faqs: [
      {
        question: "How many learning stories should a leader check?",
        answer:
          "There is no number in the National Quality Standard or in Te Whāriki. Checking every story does not scale, and it teaches people to write for you and not for the family. A few from each educator each month, and more for somebody new, is a sensible place to start.",
      },
      {
        question: "Should a leader edit the story themselves?",
        answer:
          "No. Say what you would change and let the educator change it. The story goes out under their name, and they learn nothing from a version they did not write.",
      },
      {
        question: "Does the leader need a StoryLoop account to check a story?",
        answer:
          "No. The educator sends a private link that opens one story with their note beside it. It lasts 14 days, it can be answered once, and nothing else of the educator's can be reached from it.",
      },
    ],
    sources: [ACECQA_QA7, ACECQA_13],
  },

  // 13 Nov 2026 (staged for release before 15 Dec, so it is indexed when rooms
  // restart in late January): the first learning story for a new child.
  // Transition searches fall away from about 21 Dec; the next job educators
  // search for is settling in. Read on 13 Nov 2026: EYLF V2.0 (full 2022 text,
  // "Continuity of learning and transitions", page 24), Te Whāriki Online
  // "Mana whenua | Belonging" (Te Whāriki pages 31 to 35) and ACECQA Quality
  // Area 6 (Element 6.1.1). The six children are imagined, to show the shape.
  // Outcome wording comes from lib/eylf-outcomes.ts and lib/te-whariki-strands.ts.
  "first-learning-story-of-the-year": {
    slug: "first-learning-story-of-the-year",
    title: "First Learning Story of the Year: Settling-In Examples",
    description:
      "Settling-in learning story examples for a new child: six first stories from a baby to a 4 year old, with the EYLF or Te Whāriki link and a next step.",
    kicker: "Educator guide · new children · EYLF and Te Whāriki",
    heading: "The first learning story for a new child, written in their first weeks.",
    intro:
      "A new child, a family who wants to know they are all right, and nothing written down yet. The first story does not need to show much learning. It needs to show the family that someone noticed their child. Here is what the frameworks say about starting, what to ask families before the first day, six short examples from a baby to a four year old, and what to leave out.",
    reviewedAt: "2026-11-13",
    siblingLinks: {
      heading: "Close to this",
      links: [
        { label: "EYLF learning story examples", href: "/learning-story-examples-eylf" },
        { label: "NZ learning story examples", href: "/learning-story-examples-nz" },
        { label: "Learning stories families actually read", href: "/parent-friendly-learning-stories" },
      ],
    },
    sections: [
      {
        title: "Settle first, then write",
        body:
          "In the first weeks your job is the child, not the paperwork. Jot one line when something small happens: the first time they join a game, ask for help or go back to the same toy. One of those lines becomes the first story.",
      },
      {
        title: "Start from what the family told you",
        body:
          "EYLF V2.0 says educators who know and build on what children bring from home help them feel secure, confident and connected. Te Whāriki says transitions into a setting recognise what children bring with them. Use the family's answers in the story.",
      },
      {
        title: "Write what you saw, not how they felt",
        body:
          "\"Settled well\" and \"was sad\" tell a family very little. \"Watched the sandpit from the step, then took the red bucket in\" tells them a lot. Describe what the child did and said, and let the family read the feeling.",
      },
    ],
    faqs: [
      {
        question: "When should I write a new child's first learning story?",
        answer:
          "Neither EYLF V2.0 nor Te Whāriki sets a deadline for a first story, so check your service's own policy. Write it when a real moment gives you something to say, usually within the first few weeks. A short true story in week two is worth more to a family than a long one in week six.",
      },
      {
        question: "What should a settling-in learning story include?",
        answer:
          "One moment the child chose, told in order, with any words they said kept exactly. One line on what it shows, linked to an outcome only if it fits. Where to next, and one question for the family. It can be five or six sentences long.",
      },
      {
        question: "Should I write about a hard drop-off or crying?",
        answer:
          "Only if it helps the family, and only briefly. Say what happened and what helped, in plain words (\"Sam cried when Dad left, then held my hand and watched the fish tank\"), and talk to the family before it goes in writing. A first story is better about something the child chose to do.",
      },
      {
        question: "Which outcome fits a settling-in learning story?",
        answer:
          "In Australia it is often EYLF V2.0 Outcome 1, Children have a strong sense of identity, and especially 1.1, \"Children feel safe, secure and supported\". In Aotearoa it is often the Mana whenua | Belonging strand, for example \"Understanding how things work here and adapting to change\". Link what the moment actually shows, not what the week was about.",
      },
      {
        question: "What should I ask a family before their child starts?",
        answer:
          "What do you call your child at home? What words, in any language, will they use for drink, toilet, sleep and help? What comforts them? What do they love doing right now? Who is in their family, and who might pick them up? Their answers give you the details that make the first story theirs.",
      },
      {
        question: "Can StoryLoop write the first story from my notes?",
        answer:
          "Yes. Type the one line you jotted down and StoryLoop drafts the learning story with the EYLF V2.0 or Te Whāriki link the moment actually shows, keeps the child's words exactly as you wrote them, and adds where to next and a question for the family. Try it on this page without signing up, and check every word before anything is shared.",
      },
    ],
    deepDive: [
      {
        heading: "What the frameworks say about starting",
        paragraphs: [
          "EYLF V2.0 has a practice called Continuity of learning and transitions. It says children bring their individual, family and community ways of being, belonging and becoming, often called funds of knowledge, and that \"Educators who know and build on children's funds of knowledge help them to feel secure, confident and connected to familiar people, places, events and understandings.\" It names starting at an early childhood setting as one of the bigger transitions.",
          "Te Whāriki says it in the Mana whenua | Belonging strand: \"Transitions into and across settings are thoughtfully planned and recognise what children bring with them.\" For infants it describes language, key words, signs and routines from home being used in the setting, and a familiar and unhurried kaiako who has primary responsibility for each infant.",
          "In Australia, Element 6.1.1 of the National Quality Standard reads: \"Families are supported from enrolment to be involved in the service and contribute to service decisions.\" A first story with a question at the end is one of the simplest ways to start that.",
        ],
      },
      {
        heading: "Before the first day: five questions for the family",
        paragraphs: [
          "Many services call this an \"all about me\" page. Keep it short enough that a tired parent will fill it in: what do you call your child at home; what words, in any language, will they use for drink, toilet, sleep and help; what comforts them; what do they love doing right now; and who is in their family.",
          "Read the answers before the child arrives and keep them where every educator in the room can see them. Every example below uses one.",
        ],
      },
      {
        heading: "Baby: Theo, 9 months, week two (example, EYLF)",
        paragraphs: [
          "The note: \"Theo's mum said he settles to 'Twinkle Twinkle'. Fussing at 10.30 before sleep. Sang it, he stopped, watched my mouth, put his hand on my cheek. Asleep by the second verse.\"",
          "The story: Theo's mum told us that \"Twinkle Twinkle\" is the song that settles him at home. This morning, when Theo was tired and fussing before his sleep, his educator sang it. Theo went quiet, watched her face and put his hand on her cheek. He was asleep before the second verse.",
          `The learning: ${eylfKeyComponent("1.1")}. A song from home helped Theo feel safe with a new person in a new place, and he showed it by turning towards her.`,
          "Where to next: sing the same song at every sleep this month, and keep the same educator for Theo's sleeps where we can. For the family: are there other songs or words you use at bedtime?",
        ],
      },
      {
        heading: "Toddler: Amara, 22 months, week one (example, Te Whāriki)",
        paragraphs: [
          "The note: \"Amara brought the photo of her nan from home. Carried it all morning. At kai she put it on the table next to her plate, pointed, 'Nana'. Showed Kauri.\"",
          "The story: Amara, today you brought the photo of your nana from home. You carried it with you all morning, and at kai time you stood it on the table beside your plate. You pointed at it and said, \"Nana,\" and then you showed it to Kauri.",
          `The learning: ${teWharikiOutcome("Making connections between people, places and things in their world")}. Amara brought someone important from home into her new place and shared her with a friend.`,
          "Where to next: make a small space on the family wall for Amara's photo, and invite her whānau to send more. For the whānau: who is in the photo, and what does Amara call her other grandparents?",
        ],
      },
      {
        heading: "Toddler: Kai, 2 years 4 months, week three (example, EYLF)",
        paragraphs: [
          "The note: \"Family form: Kai loves trains. Day 1-3 stayed by the door. Today he found the train set, pushed the long train round the track, looked back at me each lap. Said 'choo choo' to Mila when she sat down.\"",
          "The story: Kai's family told us he loves trains. For his first few days Kai stayed close to the door. This morning he found the train set, pushed the long train all the way around the track and looked back at his educator every time he came past. When Mila sat down beside him, he told her, \"Choo choo.\"",
          `The learning: ${eylfKeyComponent("1.1")}. Kai used something he loves from home to find his place in the room, and checked back with a familiar adult while he did it.`,
          "Where to next: leave the train set out near the door this week, and add a tunnel and bridge for Kai and Mila to build together. For the family: which trains does Kai know by name?",
        ],
      },
      {
        heading: "Preschooler: Hana, 3 years 6 months, week two (example, Te Whāriki)",
        paragraphs: [
          "The note: \"Hana moved from another centre. Knew straight away when kai was coming, got her drink bottle and sat at the table before we called. Asked 'Do we say karakia here?' We said one together.\"",
          "The story: Hana, you have only been with us for two weeks, and already you know when kai time is coming. Today you fetched your drink bottle and sat at the table before anyone called. Then you asked, \"Do we say karakia here?\" We said one together.",
          `The learning: ${teWharikiOutcome("Understanding how things work here and adapting to change")}. Hana is learning our routines and asking how they fit with what she knew at her last centre.`,
          "Where to next: ask Hana to help start karakia before kai this week, and talk with her about what was the same and different at her old centre. For the whānau: what karakia or waiata does Hana know from home or her last centre?",
        ],
      },
      {
        heading: "Preschooler: Sofia, 4 years 1 month, week one (example, EYLF)",
        paragraphs: [
          "The note: \"Sofia's dad: she speaks Spanish at home. At the playdough table she made 'tortillas', patted them flat. Told Jack 'para ti'. He said 'thank you'. She laughed and made him another.\"",
          "The story: At the playdough table Sofia rolled balls and patted them flat. \"Tortillas,\" she said. She handed one to Jack and said, \"Para ti.\" Jack said, \"Thank you,\" and Sofia laughed and made him another one.",
          `The learning: ${eylfKeyComponent("1.3")}. Sofia brought her home language and something she knows from home into her play, and used them to make a new friend.`,
          "Where to next: learn a few Spanish words from Sofia's family to use at meal times, and add a rolling pin and flat pans to the playdough table. For the family: what does Sofia like to cook or eat with you at home, and how do you say \"thank you\" in Spanish?",
        ],
      },
      {
        heading: "Preschooler: Oliver, 4 years 7 months, new room (example, EYLF)",
        paragraphs: [
          "The note: \"Oliver moved up from the toddler room. First morning: went back to the toddler room door twice. Third time I walked with him. He waved to Kate through the window, came back, joined the block corner with Ruby.\"",
          "The story: This week Oliver moved up from the toddler room. On his first morning he walked back to his old room's door twice. The third time his educator walked with him, and Oliver waved to Kate through the window. Then he came back and joined Ruby in the block corner.",
          `The learning: ${eylfKeyComponent("1.2")}. Oliver chose how to say goodbye to his old room and then made his own way into the new one.`,
          "Where to next: invite Oliver to visit Kate and take her a message this week, and give him a job he can do each morning in his new room. For the family: has Oliver talked about his new room at home?",
        ],
      },
      {
        heading: "What to leave out of a first story",
        paragraphs: [
          "Comparisons with other children, guesses at feelings (\"she was missing Mum\"), \"settled well\" with nothing behind it, and words like clingy, shy or anxious. A family reads those as a verdict on their child in week one.",
          "Leave out other children's surnames and anything private the family told you on the enrolment form unless you have checked with them first.",
        ],
      },
      {
        heading: "The first story starts the second",
        paragraphs: [
          "Every example ends with a question for the family. Their answer is the start of the next story: the songs Theo's family sings, the trains Kai knows by name, how to say thank you in Spanish. That is the planning cycle, started in a child's first weeks.",
          "The note is the part only you can write. Type it into the box on this page and StoryLoop drafts the learning story with the EYLF V2.0 or Te Whāriki link the moment shows, where to next and a question for the family, keeping the child's words exactly as you wrote them. Use a first name only, and check every word before anything is shared.",
        ],
      },
    ],
    sources: [
      {
        label: "Belonging, Being and Becoming: The Early Years Learning Framework for Australia V2.0 (2022), Continuity of learning and transitions, page 24",
        url: "https://www.acecqa.gov.au/sites/default/files/2023-01/EYLF-2022-V2.0.pdf",
      },
      {
        label: "Te Whāriki Online: Mana whenua | Belonging, Strand 2 (Te Whāriki pages 31 to 35)",
        url: "https://tewhariki.tahurangi.education.govt.nz/mana-whenua-belonging---strand-2/5637177578.p",
      },
      ACECQA_QA6,
    ],
  },

  // 18 Nov 2026 (staged, waiting for "release the pages"): learning stories in
  // outside school hours care. Every MTOP line here was read on 18 Nov 2026 in
  // the framework PDF on ACECQA's site (MTOP_V2 below): the five outcomes and
  // key components (pages 34 to 63, wording from each key component's own
  // heading), "Assessment and evaluation for wellbeing, learning and
  // development" (pages 26 to 28) and the planning cycle (pages 30 and 31).
  // The framework never uses the words "learning story". The six children are
  // imagined, to show the shape. StoryLoop's writer links EYLF V2.0, not MTOP,
  // and the page says so.
  "mtop-learning-stories": {
    slug: "mtop-learning-stories",
    title: "MTOP Learning Stories: My Time, Our Place V2.0 Examples",
    description:
      "Learning stories for OSHC and vacation care under My Time, Our Place V2.0: six examples for 5 to 11 year olds, with the MTOP outcome and the child's voice.",
    kicker: "OSHC educator guide · My Time, Our Place V2.0",
    heading: "Learning stories in school age care, written the My Time, Our Place way.",
    intro:
      "You have the children for an hour before school and three after it, they are tired, and most of what they do is play. That is exactly what My Time, Our Place is about. Here is what the framework asks you to document, how its five outcomes differ from the EYLF's, six short stories from a Prep child to an 11 year old, and how to put the child's own voice in every one.",
    reviewedAt: "2026-11-18",
    siblingLinks: {
      heading: "Close to this",
      links: [
        { label: "EYLF learning story examples", href: "/learning-story-examples-eylf" },
        { label: "Where to next: examples", href: "/learning-story-next-steps-examples" },
      ],
    },
    sections: [
      {
        title: "Keep it short and true",
        body:
          "An OSHC story can be five sentences: what the child did, anything they said, kept exactly, what it shows, and what you will offer next. The note you jot at 4.15pm is the evidence. Write the story from that, not from memory on Friday.",
      },
      {
        title: "Write it with the child",
        body:
          "My Time, Our Place calls this assessment \"as learning\": educators include children and young people in documenting their own learning. School age children can read the story, disagree with it and add their own line. Ask them, and write down what they say.",
      },
      {
        title: "Link the MTOP outcome, not the EYLF one",
        body:
          "The five outcomes line up with the EYLF by theme, but the words are different and Outcome 5 has three key components, not five. If your service runs school age care, quote MTOP V2.0's wording in the child's record.",
      },
    ],
    faqs: [
      {
        question: "Do OSHC services have to write learning stories?",
        answer:
          "No. My Time, Our Place V2.0 does not mention learning stories. It says documentation happens at every stage of the planning cycle and that educators gather information in a variety of ways. A learning story is one of those ways, and it suits school age care because children can read it and add to it. Follow your service's own documentation policy.",
      },
      {
        question: "What are the five My Time, Our Place outcomes?",
        answer:
          "Outcome 1: Children and young people have a strong sense of identity. Outcome 2: Children and young people are connected with and contribute to their world. Outcome 3: Children and young people have a strong sense of wellbeing. Outcome 4: Children and young people are confident and involved learners. Outcome 5: Children and young people are effective communicators.",
      },
      {
        question: "What is the difference between MTOP and EYLF outcomes?",
        answer:
          "Both V2.0 frameworks have the same five outcome themes, but MTOP says \"children and young people\" throughout and puts play and leisure at the centre. Outcome 2's first key component is about belonging to groups and communities, where the EYLF says connectedness. Outcome 5 has three key components in MTOP (interacting with others, visual images and texts, and digital technologies) where the EYLF has five.",
      },
      {
        question: "How often should I write a learning story for each child in OSHC?",
        answer:
          "My Time, Our Place sets no number. It asks that children's views are visible in the program plan and that documentation happens at every stage of the planning cycle. Your service's policy decides how often. Fewer, true stories that a child has read and added to are worth more than a story for everyone every week.",
      },
      {
        question: "Can StoryLoop link My Time, Our Place outcomes?",
        answer:
          "Not yet. StoryLoop's Australian drafts link EYLF V2.0 wording. The outcome themes match MTOP's, so the draft gives you a start, but change the outcome line to the MTOP wording on this page before it goes in a child's record, and check every word.",
      },
      {
        question: "What should a school age learning story include?",
        answer:
          "One moment, told in order. Anything the child said, word for word. One line on what it shows, linked to an MTOP key component only if it fits. What you will offer next. The child's own comment after they have read it, and a question for the family.",
      },
    ],
    deepDive: [
      {
        heading: "What My Time, Our Place asks you to document",
        paragraphs: [
          "MTOP V2.0 calls this \"Assessment and evaluation for wellbeing, learning and development\". It describes an ongoing cycle \"that includes observing, documenting, analysing, planning, implementing and critical reflection\", and says \"documentation occurs at every stage of the planning cycle.\"",
          "It names three kinds of assessment. Assessment \"as learning\" includes children and young people in documenting their own learning. Assessment \"of wellbeing and learning\" reviews achievements and capabilities at selected timepoints. Assessment \"for wellbeing and learning\" gathers what children feel, know, can do and understand, to inform planning for play and leisure. One good learning story can do all three.",
          "On planning, it says: \"Children and young people's views are visible in the program plan.\" A story that ends with the child's own words, and a next step built from them, is that sentence on paper.",
        ],
      },
      {
        heading: "The five outcomes and their key components",
        paragraphs: mtopOutcomeList(),
      },
      {
        heading: "Prep: Ava, 5, before school care (example)",
        paragraphs: [
          "The note: \"Ava's first weeks at before care. Stood by the sign-in table every morning until Mum left. Today saw Lucas from her class at the Lego table and went straight over. 'Can I make the roof?' Built until the bell, walked to class with Lucas.\"",
          "The story: For her first few mornings Ava stayed near the sign-in table until Mum had gone. Today she spotted Lucas from her class at the Lego table and walked straight over. \"Can I make the roof?\" she asked. They built together until the bell, then walked to class side by side.",
          `The learning: ${mtopKeyComponent(1, "feel safe, secure and supported")}. Ava found a familiar face and used it to make a new place her own.`,
          "Ava's words, when we read it with her: \"Lucas is my friend at school and here.\"",
          "Where to next: keep the Lego out near the sign-in table first thing, and ask Ava to show the next new Prep child where it lives. For the family: what does Ava tell you about before care at home?",
        ],
      },
      {
        heading: "Year 2: Noah, 7, the quiet corner after school (example)",
        paragraphs: [
          "The note: \"Noah came in from school, didn't want afternoon tea, went straight to the beanbags with a book. About 20 min. Then came out and joined soccer. Said 'I needed my quiet bit first.'\"",
          "The story: Noah came in from school today and went straight to the beanbags with a book. He read for about twenty minutes. Then he put the book back, came outside and joined the soccer game. \"I needed my quiet bit first,\" he told us.",
          `The learning: ${mtopKeyComponent(3, "become strong in their social, emotional and mental wellbeing")}. MTOP says passive leisure helps children relax and refresh in the hours outside school. Noah knows what he needs after a big day and chose it for himself.`,
          "Noah's words: \"Can the beanbags stay there?\"",
          "Where to next: keep the quiet corner open for the first half hour every afternoon, and ask the children what else should be in it. For the family: what helps Noah wind down at home?",
        ],
      },
      {
        heading: "Year 3: Mateo, 8, a fairer handball serve (example)",
        paragraphs: [
          "The note: \"Handball. Mateo said Jai's serve was 'too fast for the little kids, not fair'. Big argument. Mateo suggested 'a slow serve when Preps are in'. Wrote it on the whiteboard himself. Played 20 min, no more arguing.\"",
          "The story: In handball today, Mateo said Jai's serve was \"too fast for the little kids, not fair.\" The group argued about it for a while. Then Mateo suggested a new rule: \"a slow serve when Preps are in.\" He wrote it on the whiteboard himself, and the game went for twenty minutes without another argument.",
          `The learning: ${mtopKeyComponent(2, "become aware of fairness")}. Mateo noticed who was being left out and found a rule that kept the game going for everyone.`,
          "Mateo's words: \"It's still hard, just not impossible.\"",
          "Where to next: take the rule to Friday's children's meeting so the group decides whether it stays. For the family: are there games at home where Mateo makes up the rules?",
        ],
      },
      {
        heading: "Year 4: Ethan, 9, a stop-motion film (example)",
        paragraphs: [
          "The note: \"Ethan and Zara, stop motion on the service tablet with Lego figures, 46 photos. Ethan: 'If we move it less it looks smoother.' Reshot the start. Added a title. Showed the group at 5pm.\"",
          "The story: Ethan and Zara made a stop-motion film on the tablet with Lego figures, 46 photos in all. Halfway through, Ethan said, \"If we move it less it looks smoother,\" so they went back and shot the start again. They added a title and showed the whole group at five o'clock.",
          `The learning: ${mtopKeyComponent(5, "collaborate with others, express ideas and make meaning using a range of digital technologies and media and communication technologies")}. Ethan worked out how the technique works and used it to tell a story with a friend.`,
          "Ethan's words: \"Next one is going to have sound.\"",
          "Where to next: show Ethan and Zara how to record a voice track, and set up a small film corner for the holidays. For the family: does Ethan make videos or comics at home?",
        ],
      },
      {
        heading: "Year 5: Priya, 10, the marble run in vacation care (example)",
        paragraphs: [
          "The note: \"Priya, marble run on the wall, cardboard tubes and tape. Marble kept flying out at the corner. Tried more tape, then steeper, then a cup at the bend. Cup worked. Timed it on my phone: 4 seconds. 'Can I make it slower?'\"",
          "The story: Priya built a marble run on the wall from cardboard tubes and tape. The marble kept flying out at the corner, so she tried three fixes: more tape, a steeper tube, then a paper cup at the bend. The cup worked. We timed it at four seconds, and Priya asked straight away, \"Can I make it slower?\"",
          `The learning: ${mtopKeyComponent(4, "develop a range of learning and thinking skills and processes such as problem solving, inquiry, experimentation, hypothesising, researching and investigating")}. Priya tested one change at a time until she found what worked, then set herself a harder problem.`,
          "Priya's words: \"Next time I want it to take ten seconds.\"",
          "Where to next: leave the wall up for the rest of the week and add funnels, more cups and a stopwatch. For the family: what does Priya like to build or fix at home?",
        ],
      },
      {
        heading: "Year 6: Isla, 11, running the veggie patch (example)",
        paragraphs: [
          "The note: \"Isla and three other Year 6s asked to run the veggie patch roster. Made a chart, asked each younger child what they wanted to plant. Isla to a Year 1: 'You can pick strawberries, you just have to water them on Tuesday.'\"",
          "The story: Isla and three friends asked if they could run the veggie patch. They made a roster and asked each younger child what they wanted to grow. When a Year 1 child asked for strawberries, Isla said, \"You can pick strawberries, you just have to water them on Tuesday.\"",
          `The learning: ${mtopKeyComponent(2, "develop a sense of belonging to groups and communities and an understanding of their reciprocal rights and responsibilities necessary as active and informed citizens")}. Isla took on a job for the whole service and made sure the youngest children had a say and a part.`,
          "Isla's words: \"Can we sell some at pick-up?\"",
          "Where to next: help Isla's group plan a small pick-up stall and decide together what the money is for. For the family: does Isla grow or cook anything at home?",
        ],
      },
      {
        heading: "Putting the child's voice in",
        paragraphs: [
          "Read the story with the child before it goes anywhere. Ask: \"Is this right? Is there anything you would change? What do you want to do next?\" Write their answer under the story in their exact words, even when it is one line. If they say it is wrong, fix it.",
          "Older children may want to write their own part, take the photo or choose which moment the story is about. That is assessment \"as learning\" in the framework's own words, and it is often the line a family reads first.",
        ],
      },
      {
        heading: "Writing it with StoryLoop",
        paragraphs: [
          "Type the note you jotted, the way you jotted it, into the box on this page. StoryLoop drafts a short learning story with what it shows, where to next and a question for the family, and keeps anything the child said exactly as you wrote it. No signup.",
          "Be clear on one thing: StoryLoop's Australian drafts link EYLF V2.0 today, not My Time, Our Place. The themes match, so change the outcome line to the MTOP wording above, add the child's own comment, and check every word before anything is shared. Use first names only.",
        ],
      },
    ],
    sources: [MTOP_V2],
  },
};
