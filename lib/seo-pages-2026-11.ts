import type { SeoPage } from "./seo-pages";

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
};
