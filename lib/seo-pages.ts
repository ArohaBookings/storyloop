export type SeoPage = {
  slug: string;
  title: string;
  description: string;
  kicker: string;
  heading: string;
  intro: string;
  sections: Array<{ title: string; body: string }>;
  faqs: Array<{ question: string; answer: string }>;
  reviewedAt?: string;
  sources?: Array<{ label: string; url: string }>;
  /**
   * Long-form, human-written body. This is what turns a thin marketing page
   * into something worth reading and worth ranking. Each block is a heading and
   * a set of plain paragraphs. Kept as data so pages stay easy to edit.
   */
  deepDive?: Array<{ heading: string; paragraphs: string[] }>;
};

const sharedFaqs = [
  {
    question: "Does StoryLoop replace educator thinking?",
    answer:
      "No. StoryLoop supports drafting and structure, while educators remain responsible for observation, interpretation, reflection, final editing, and sign-off.",
  },
  {
    question: "Can I edit the generated stories?",
    answer:
      "Yes. Stories are editable after generation and saved in history, so educators can add context, adjust wording, copy, export, or regenerate from the original observation.",
  },
  {
    question: "Does it create generic AI stories?",
    answer:
      "StoryLoop is designed to avoid generic, poetic AI wording. It asks for real observations, keeps claims evidence-based, and links curriculum only when the observation supports it.",
  },
  {
    question: "How many stories are free?",
    answer:
      "The free plan includes 3 learning stories per month. Upgrade prompts are dismissible, and existing history remains available even if the free limit is reached.",
  },
];

export const SEO_PAGES: Record<string, SeoPage> = {
  // Highest-intent query in the market and we had nothing for it. Written to
  // be fair: Storypark is a good product and this page does not pretend
  // otherwise. The honest position is that a centre does not have to choose,
  // which is also the only position we can defend now that Storypark ships its
  // own AI. Answers are kept short and self-contained so an answer engine can
  // lift one cleanly.
  "storypark-alternative": {
    slug: "storypark-alternative",
    title: "Storypark Alternative for Learning Stories | StoryLoop",
    description:
      "StoryLoop and Storypark compared for learning stories in New Zealand and Australia: what each does, what they cost, and why most educators use both.",
    kicker: "Honest comparison",
    heading: "Looking for a Storypark alternative? You may not need one.",
    intro:
      "Storypark is a full documentation platform: photos, families, enrolments, records. StoryLoop is a writing tool. If the part you actually dread is the writing, you can keep Storypark and add StoryLoop alongside it, then export the finished draft straight back in.",
    sections: [
      {
        title: "They solve different problems",
        body:
          "Storypark holds your children, photos, family messaging and records in one place, and a centre that already runs on it has years of history there. StoryLoop does one job: turn a rough note or a voice memo into an editable learning story draft. It holds no enrolments and sends nothing to families.",
      },
      {
        title: "You can use both, and most educators do",
        body:
          "StoryLoop exports into Storypark, Educa, Kinderloop and Brightwheel. Write the draft in StoryLoop while the moment is fresh, edit it in your own words, then paste it into whatever your centre already mandates. Nothing migrates and nothing is replaced.",
      },
      {
        title: "Who buys which",
        body:
          "A centre buys Storypark, because it is a whole-service system and the centre decides. An individual educator can buy StoryLoop with their own money without asking anyone, which matters for home-based educators, relievers and student teachers whose centre uses something else, or nothing at all.",
      },
      {
        title: "What each one costs",
        body:
          "Storypark is priced per child, around NZ$1.79 per child per month paid monthly with a minimum around NZ$23.85, so a 60-child centre pays roughly NZ$107 a month. StoryLoop is NZ$21 a month for an individual educator, or priced per educator seat with unlimited children for a centre. Check both against your own roll before deciding.",
      },
      {
        title: "Both write with AI now",
        body:
          "Storypark added AI drafting through Storypark Assist in April 2026, so AI story writing is no longer unique to either product. The difference is that StoryLoop does only that, works regardless of which platform your centre uses, and can be bought by one person.",
      },
    ],
    faqs: [
      {
        question: "Is StoryLoop a replacement for Storypark?",
        answer:
          "No. Storypark is a full documentation platform covering photos, families, enrolments and records. StoryLoop only writes learning story drafts and exports them into Storypark, Educa, Kinderloop or Brightwheel. Most educators who use StoryLoop keep their centre platform.",
      },
      {
        question: "Can I use StoryLoop if my centre already pays for Storypark?",
        answer:
          "Yes. StoryLoop is bought by the individual educator and needs no change to your centre's systems. You write the draft in StoryLoop, edit it, then paste or export it into Storypark as usual.",
      },
      {
        question: "Does Storypark have AI learning stories?",
        answer:
          "Yes. Storypark released Storypark Assist in April 2026, which drafts and reviews learning stories inside the platform. AI drafting is available in both products, so the practical difference is price, whether you need a full platform, and who is allowed to buy it.",
      },
      {
        question: "Which is cheaper, StoryLoop or Storypark?",
        answer:
          "It depends on your roll, because Storypark charges per child and StoryLoop charges per educator. A 60-child centre with nine educators pays roughly NZ$107 a month for Storypark. Work both out against your own numbers rather than assuming.",
      },
      {
        question: "What is the best Storypark alternative for a home-based educator?",
        answer:
          "Home-based educators are usually poorly served by centre platforms priced per child with service minimums. A writing-only tool bought individually, such as StoryLoop at NZ$21 a month, fits that situation better because there is no centre account and no migration.",
      },
      {
        question: "Will my learning stories still meet Te Whāriki or EYLF requirements?",
        answer:
          "The curriculum links come from your observation either way. StoryLoop maps drafts to Te Whāriki strands or EYLF V2.0 outcomes and names why each link fits, and the educator confirms or changes it before anything is shared.",
      },
    ],
    reviewedAt: "2026-09-16",
    sources: [
      { label: "Storypark pricing", url: "https://main.storypark.com/pricing" },
      { label: "AI at Storypark", url: "https://www.storypark.com/lp/ai-at-storypark" },
    ],
  },

  // Question-shaped rather than comparison-shaped on purpose. A low-authority
  // domain does not win head terms, but it can be the best passage-level answer
  // to a specific question, which is what answer engines retrieve. Every FAQ
  // below leads with a directly quotable sentence for that reason.
  "how-long-should-a-learning-story-take": {
    slug: "how-long-should-a-learning-story-take",
    title: "How Long Should a Learning Story Take to Write?",
    description:
      "How long a learning story really takes, why the blank page costs more than the writing, and what that means for unpaid documentation hours.",
    kicker: "A straight answer",
    heading: "How long should a learning story take to write?",
    intro:
      "Most educators spend 20 to 40 minutes on a single learning story once they sit down with a blank page. Very little of that is writing. It goes on remembering the detail, deciding what the learning was, and finding curriculum wording that fits. Written straight after the moment, from a note taken at the time, the same story is usually a 5 to 10 minute job.",
    sections: [
      {
        title: "The blank page is the expensive part",
        body:
          "Educators know exactly what they saw and why it mattered. What costs time is starting from nothing, hours later, when the specifics have blurred. The moment a child changed their mind, tried a different approach, or said something in their own phrasing is what makes a story worth keeping, and it is the first thing memory loses. A rough note captured at the time removes most of the cost, because the recall work is already done.",
      },
      {
        title: "Length is not prescribed, and shorter is usually better",
        body:
          "Neither Te Whāriki nor the EYLF prescribes a format, a length, or a frequency for documentation. A learning story that names what a child did, what it showed about their thinking, and what you will do next can be three short paragraphs. Longer does not mean stronger. A story padded to look thorough is harder for whānau to read and harder for you to write.",
      },
      {
        title: "What the research says about the time cost",
        body:
          "A national survey of 570 Australian early childhood educators, published in The Australian Educational Researcher in 2025, found more than three-quarters worked an average of nine unpaid hours a week, and two-thirds said workload demands were reducing the quality of care they could give. The study measures total workload rather than documentation alone, so it does not attribute all nine hours to learning stories. It does establish that the unpaid administrative load is real, widespread and measured.",
      },
      {
        title: "A realistic target",
        body:
          "If you capture a two-line note in the moment, 5 to 10 minutes per story is a fair target, including your own editing. If you are writing from memory at 9pm with nothing written down, 20 to 40 minutes is normal and no tool changes that honestly. The fix is not writing faster. It is shortening the gap between the moment and the note.",
      },
      {
        title: "Where StoryLoop fits",
        body:
          "StoryLoop turns a rough note or a voice memo into an editable draft with curriculum links already mapped, so the blank page is gone and the specifics are still sharp. You review and edit every word, and the draft exports into Storypark, Educa, Kinderloop or Brightwheel rather than replacing whatever your centre already runs on. The free plan includes three stories a month with no credit card.",
      },
    ],
    faqs: [
      {
        question: "How long should a learning story take to write?",
        answer:
          "Five to ten minutes if you are working from a note taken at the time, and twenty to forty minutes if you are starting from a blank page hours later. The difference is recall, not typing speed.",
      },
      {
        question: "How long should a learning story be?",
        answer:
          "Three short paragraphs is enough for most moments: what the child did, what it showed about their thinking, and what you will do next. Neither Te Whāriki nor the EYLF prescribes a length.",
      },
      {
        question: "How many learning stories should I write per child?",
        answer:
          "There is no regulated number. Neither Te Whāriki nor the EYLF sets a quota per child, per week or per term. Quotas are usually a service-level decision, not a regulatory requirement, and are worth questioning if they are driving unpaid hours.",
      },
      {
        question: "Do educators write learning stories in their own time?",
        answer:
          "Frequently, yes. A 2025 national survey of 570 Australian early childhood educators found more than three-quarters worked an average of nine unpaid hours a week. The survey covers total workload rather than documentation alone.",
      },
      {
        question: "Can AI write a learning story for me?",
        answer:
          "It can write a draft from your observation, but it cannot observe the child or decide what the learning was. StoryLoop drafts from what you actually recorded, flags anything it had to assume, and leaves every judgement and the final edit with you.",
      },
      {
        question: "What is the fastest way to write learning stories?",
        answer:
          "Capture a two-line note or a voice memo in the moment rather than reconstructing it later, then draft from that. The gap between the moment and the note is what costs the time.",
      },
    ],
    reviewedAt: "2026-09-16",
    sources: [
      {
        label: "Harper, Wilson & McGrath-Champ (2025), The Australian Educational Researcher",
        url: "https://link.springer.com/article/10.1007/s13384-025-00847-z",
      },
      {
        label: "University of Sydney, July 2025",
        url: "https://www.sydney.edu.au/news-opinion/news/2025/07/16/childcare-educators-spend-less-than-30-percent-of-time-in-focused-interaction-with-children-research.html",
      },
    ],
  },

  // Aimed at the person who signs off, not the person who writes. Pricing
  // questions are high intent, and explicit visible pricing is one of the four
  // citation gatekeepers SIGIR 2026 measured, so this page answers with numbers.
  "learning-story-software-cost-for-centres": {
    slug: "learning-story-software-cost-for-centres",
    title: "What Does Learning Story Software Cost a Centre?",
    description:
      "What early childhood documentation tools cost a centre, why per-child and per-educator pricing pull apart, and what to check before signing.",
    kicker: "For directors and owners",
    heading: "What does learning story software cost a centre?",
    intro:
      "Most early childhood platforms bill per child, per month, so the price rises every time you enrol someone. Drafting tools tend to bill per educator or as a flat centre fee, which does not. StoryLoop is the second kind: NZ$109 a month covers ten educators and unlimited children, which works out at about NZ$10.90 per educator.",
    sections: [
      {
        title: "Per child and per educator pull in opposite directions",
        body:
          "A per-child platform costs more as your roll grows, which is the opposite of how the work behaves: forty children do not create four times the documentation of ten if the same six educators are writing it. A per-educator or flat fee tracks the people actually doing the writing. Neither is dishonest, but they reward different services, and a growing centre should know which side of that line a quote sits on before signing.",
      },
      {
        title: "Ask what happens when you enrol twenty more children",
        body:
          "This is the single most useful question at a demo, and the answer is rarely on the pricing page. Ask for the monthly figure at your current roll and at the roll you expect in two years. On StoryLoop centre plans both numbers are the same, because children are unlimited and you are paying for educator seats.",
      },
      {
        title: "A drafting tool is usually additional, not a replacement",
        body:
          "If your centre already runs on Storypark, Educa, Kinderloop or Brightwheel, a drafting tool normally sits alongside it rather than replacing it, so budget for both. StoryLoop is built that way deliberately: it writes the draft and exports into whatever your service already uses. Nothing migrates, nothing is replaced, and nobody has to learn a new platform to benefit.",
      },
      {
        title: "Compare against relief cover, not against other software",
        body:
          "The honest comparison for an additional tool is what else that money would buy. At NZ$109 a month a centre is weighing roughly three hours of relief cover against every educator getting drafting help all month. That is a decision a manager can usually make alone, which matters more than the number itself: it is the difference between a quick yes and a board paper.",
      },
      {
        title: "Check what the centre can see",
        body:
          "Worth asking of any tool: does buying it give management the right to read everything staff write? On StoryLoop centre plans, leadership sees that an educator is documenting and when, and sees the writing itself only for educators who turn sharing on. Documentation is professional work about real children, and a purchase order is not consent.",
      },
    ],
    faqs: [
      {
        question: "What does learning story software cost a centre?",
        answer:
          "Most platforms charge per child per month, so the figure depends on your roll. StoryLoop charges a flat centre fee: NZ$109 a month for ten educator seats and unlimited children, or NZ$219 for twenty-five seats.",
      },
      {
        question: "Is it cheaper to buy a centre plan or individual educator plans?",
        answer:
          "A centre plan, once you have about six educators. StoryLoop's Centre Starter works out at roughly NZ$10.90 per educator against NZ$21 for an individual plan, so it is around half the price per head.",
      },
      {
        question: "Does the price go up when we enrol more children?",
        answer:
          "Not on a flat centre plan. StoryLoop centre plans cover unlimited children, so the monthly figure does not change with your roll. Platforms that bill per child do increase as you enrol.",
      },
      {
        question: "Do we have to replace Storypark or Educa to use a drafting tool?",
        answer:
          "No. StoryLoop exports into Storypark, Educa, Kinderloop and Brightwheel, so it sits alongside whatever your centre already runs on. Budget for it as an addition rather than a replacement.",
      },
      {
        question: "Can management read what educators write?",
        answer:
          "On StoryLoop, only if the educator turns sharing on. Centre leadership always sees activity, meaning how much someone is writing and when, and sees the content only with that educator's consent, which they can withdraw at any time.",
      },
      {
        question: "Is there a free way to try it before committing a centre budget?",
        answer:
          "Yes. The free plan includes three stories a month with no credit card, so an educator can test the output on a real observation before anyone signs anything.",
      },
    ],
    reviewedAt: "2026-09-17",
  },

  "nz-learning-stories": {
    slug: "nz-learning-stories",
    title: "NZ Learning Stories with Te Whāriki Links",
    description:
      "Draft New Zealand early childhood learning stories with Te Whāriki strands, learning outcomes, dispositions, child voice, and practical next steps.",
    kicker: "Aotearoa New Zealand",
    heading: "NZ learning stories that respect Te Whāriki and educator judgement.",
    intro:
      "StoryLoop helps kaiako turn real observations into editable learning story drafts that connect naturally with Te Whāriki, learning dispositions, whānau connection, and responding.",
    sections: [
      {
        title: "Te Whāriki-aware, not checklist-driven",
        body:
          "StoryLoop treats Mana atua, Mana whenua, Mana tangata, Mana reo, and Mana aotūroa as strands, then links to relevant learning outcome ideas with a short explanation of why the observation fits.",
      },
      {
        title: "Built for real centre practice",
        body:
          "Use a voice note after outdoor play, type quick bullets during rest time, or paste rough notes from your planning book. The result is a first draft that still needs educator review.",
      },
      {
        title: "Optional Kōwhiti and Tapasā lenses",
        body:
          "Kōwhiti Whakapae and Tapasā references are optional and only appear when relevant, so stories stay thoughtful rather than tokenistic.",
      },
    ],
    faqs: [
      { question: "Does StoryLoop support Te Whāriki?", answer: "Yes. Choose New Zealand mode to draft with Te Whāriki strands, learning outcomes, dispositions, child voice, and next steps." },
      { question: "Can it add more te reo Māori?", answer: "Yes. You can choose low, medium, or high te reo Māori support. StoryLoop keeps it natural and avoids random phrases." },
      ...sharedFaqs,
    ],
  },
  "australia-eylf-learning-stories": {
    slug: "australia-eylf-learning-stories",
    title: "EYLF Learning Stories for Australian Educators",
    description:
      "Create editable EYLF V2.0 learning story drafts for Australian early childhood settings with outcomes, dispositions, child voice, and next steps.",
    kicker: "Australia EYLF",
    heading: "EYLF learning stories that sound like an educator wrote them.",
    intro:
      "StoryLoop supports Australian educators with plain-language learning story drafts connected to EYLF V2.0 outcomes, without turning the story into policy-speak.",
    sections: [
      {
        title: "Aligned with broad EYLF outcomes",
        body:
          "StoryLoop links to the five EYLF learning outcomes only when the observation supports them, with attention to identity, community, wellbeing, confident learning, and communication.",
      },
      {
        title: "Useful for new and experienced educators",
        body:
          "New educators get help with structure and wording. Experienced educators get a faster first draft they can refine with their own professional judgement.",
      },
      {
        title: "Voice notes or bullet points",
        body:
          "Record or type the real moment, then review an editable draft with outcomes, learning dispositions, and practical responding ideas.",
      },
    ],
    faqs: [
      { question: "Does StoryLoop support EYLF?", answer: "Yes. Australian mode uses EYLF V2.0 learning outcomes and keeps the link grounded in what the educator observed." },
      { question: "Is it suitable for experienced educators?", answer: "Yes. It is not a replacement for professional judgement; it is a drafting tool to reduce backlog and support reflective wording." },
      ...sharedFaqs,
    ],
  },
  "learning-story-generator": {
    slug: "learning-story-generator",
    title: "Learning Story Generator for Early Childhood Educators",
    description:
      "A learning story generator for ECE educators that turns observations, bullet points, or voice notes into editable drafts with curriculum links.",
    kicker: "Learning story generator",
    heading: "Turn real observations into learning story drafts you can actually use.",
    intro:
      "StoryLoop helps educators move from rough notes to a clear first draft, while keeping educator reflection, final judgement, and family-ready editing at the centre.",
    sections: [
      {
        title: "Structured enough to help, flexible enough to edit",
        body:
          "Each draft can include a title, observation, learning noticed, child voice, curriculum links, dispositions, responding ideas, and a family-friendly summary when needed.",
      },
      {
        title: "Natural educator voice by default",
        body:
          "The default writing avoids oversized words, generic praise, and overly poetic phrasing. You can choose natural, warm reflective, professional, or simple tone.",
      },
      {
        title: "Made for mobile documentation",
        body:
          "StoryLoop works on phone-friendly flows, so educators can capture moments close to when they happen instead of rebuilding the story at the end of the week.",
      },
    ],
    faqs: [
      { question: "What is StoryLoop?", answer: "StoryLoop is an early childhood documentation tool that helps educators draft learning stories from real observations, voice notes, or bullet points." },
      { question: "Can I use voice notes?", answer: "Yes. Supported browsers can record microphone audio directly. If live recording is unavailable, educators can type bullet points or upload an audio file." },
      ...sharedFaqs,
    ],
  },
  "today-loop-ece": {
    slug: "today-loop-ece",
    title: "Today Loop for ECE Observation and Planning",
    description:
      "Capture real ECE moments in seconds, revisit open next steps, and decide later what deserves a learning story or planning response.",
    kicker: "Daily ECE workflow",
    heading: "Capture the moment now. Make the documentation decision later.",
    intro:
      "Today Loop is a lightweight daily observation inbox for early childhood educators. It brings forward unfinished moments and open next steps without turning children into scores or asking educators to complete another daily sheet.",
    sections: [
      {
        title: "A daily focus drawn from work you already did",
        body:
          "StoryLoop surfaces up to three prompts from unfinished captures, open next steps, and saved story history. The prompts are for attention and follow-up, not compliance or educator surveillance.",
      },
      {
        title: "Text-first capture in roughly 20 seconds",
        body:
          "Save one real action, quote, attempt, change, or question. A child is optional, a photo is never required, and analysis can wait until there is time away from the floor.",
      },
      {
        title: "An inbox designed to be cleared",
        body:
          "A moment can become a learning story, be held for planning, or be archived. StoryLoop does not suggest that every observation needs a polished story.",
      },
    ],
    deepDive: [
      {
        heading: "Why the daily workflow starts with less data entry",
        paragraphs: [
          "A 2025 Australian study reported that educators spent less than 30 percent of their day in focused interaction with children, while many also reported substantial unpaid work. A daily feature that creates another compulsory form would make the wrong problem bigger.",
          "Today Loop therefore keeps the capture small and the decision explicit. It is a memory and follow-up tool, not an attendance, routine, incident, consent, or regulatory records system.",
        ],
      },
      {
        heading: "How it fits assessment and planning in Aotearoa",
        paragraphs: [
          "Te Whāriki guidance describes assessment and planning through noticing, recognising, responding, recording and revisiting, supported by formal and informal assessment and partnership with whānau.",
          "Today Loop supports the noticing and revisiting rhythm while leaving the educator to decide what should be formally recorded and shared.",
        ],
      },
      {
        heading: "Why a photo is never required",
        paragraphs: [
          "Australian child-safety changes place stronger expectations on policies for taking, using, storing and destroying images, including authorised-device practices. A text-first capture gives educators a useful default when an image is unnecessary.",
          "Each service remains responsible for its own policies, consent, records and approved systems. StoryLoop helps with drafting and reflection; it does not replace those obligations.",
        ],
      },
    ],
    faqs: [
      {
        question: "Do I have to capture a moment every day?",
        answer: "No. Today Loop is available when it helps. An empty inbox is treated as a healthy state, not a missed target.",
      },
      {
        question: "Does every Today Loop moment become a story?",
        answer: "No. You choose whether to turn it into a story, hold it for planning, or archive it.",
      },
      {
        question: "How much of Today Loop is free?",
        answer: "The Free plan includes 10 captured moments per month. Educator and higher plans include unlimited captured moments.",
      },
      ...sharedFaqs,
    ],
    reviewedAt: "2026-07-29",
    sources: [
      {
        label: "University of Sydney: educator workload and child-facing time (2025)",
        url: "https://www.sydney.edu.au/news-opinion/news/2025/07/16/childcare-educators-spend-less-than-30-percent-of-time-in-focused-interaction-with-children-research.html",
      },
      {
        label: "New Zealand Ministry of Education: Assessment, planning and evaluation",
        url: "https://tewhariki.tahurangi.education.govt.nz/te-whariki-online/assessment-planning-and-evaluation/5637165598.p",
      },
      {
        label: "ACECQA: National Model Code for taking images or videos",
        url: "https://www.acecqa.gov.au/national-model-code-images-ecec",
      },
    ],
  },
  "story-quality-check": {
    slug: "story-quality-check",
    title: "Story Quality Check for Learning Stories",
    description:
      "StoryLoop reviews learning story drafts for educator tone, evidence, child voice, curriculum fit, next steps, and invented-detail risk before educators edit.",
    kicker: "Educator review helper",
    heading: "A story quality check before the draft reaches you.",
    intro:
      "StoryLoop is built to improve drafts before educators see them, then keep final judgement with the educator. The quality check looks for real evidence, natural educator voice, practical responses, and curriculum links that fit.",
    sections: [
      {
        title: "Evidence stays first",
        body:
          "The review checks that learning claims connect back to the observation and that saved child context is not treated as evidence from today.",
      },
      {
        title: "Less generic AI writing",
        body:
          "The draft improvement pass looks for wording that is too poetic, too generic, or too AI-sounding, then revises toward plain educator language.",
      },
      {
        title: "Educator control remains",
        body:
          "The quality check is a helper, not compliance or sign-off. Educators still review the draft, add local knowledge, and decide what is accurate enough to share.",
      },
    ],
    faqs: [
      { question: "Is the quality check a compliance check?", answer: "No. StoryLoop calls it a story quality check because it supports educator review without replacing professional judgement." },
      { question: "What does the quality check look for?", answer: "It checks educator tone, child voice, learning dispositions, framework fit, next steps, invented-detail risk, and whether the interpretation is connected to evidence." },
      ...sharedFaqs,
    ],
  },
  "backlog-rescue-learning-stories": {
    slug: "backlog-rescue-learning-stories",
    title: "Backlog Rescue for Learning Stories",
    description:
      "Paste multiple rough ECE observations and let StoryLoop help prioritise full learning stories, short updates, and documentation next steps.",
    kicker: "Backlog Rescue",
    heading: "Sort the week’s observations before writing every story.",
    intro:
      "Backlog Rescue helps educators paste multiple rough notes, then identify which moments deserve a full learning story and which can become short updates or be combined.",
    sections: [
      {
        title: "Prioritise the strongest evidence",
        body:
          "StoryLoop looks for moments with clear learning, child agency, problem solving, communication, relationships, or repeated interest so educators can start with the highest-value stories.",
      },
      {
        title: "Short update or full story",
        body:
          "Not every observation needs a full story. Backlog Rescue suggests a practical documentation level so educators can clear backlog without lowering quality.",
      },
      {
        title: "Move from sorting to drafting",
        body:
          "Once a candidate is selected, the cleaned observation can move straight into the learning story generator with the educator still reviewing the final draft.",
      },
    ],
    faqs: [
      { question: "Does Backlog Rescue write all stories at once?", answer: "No. It sorts and prioritises first, then educators choose which observation to draft." },
      { question: "Is it useful for centres?", answer: "Yes. It is especially useful when teams are catching up after a busy week and need a calm way to decide what to document first." },
      ...sharedFaqs,
    ],
  },
  "centre-voice-learning-stories": {
    slug: "centre-voice-learning-stories",
    title: "Centre Voice Memory for Learning Stories",
    description:
      "Save centre philosophy, preferred tone, story length, liked phrases, and avoided phrases so StoryLoop drafts closer to your service voice.",
    kicker: "Centre voice",
    heading: "Learning stories that can sound more like your centre.",
    intro:
      "Centre Voice Memory lets educators or centre teams save a philosophy, preferred wording, and phrases to avoid so future drafts match local practice more closely.",
    sections: [
      {
        title: "Philosophy shapes tone, not evidence",
        body:
          "Saved philosophy can guide language and emphasis, but StoryLoop still keeps the story grounded in the observation supplied for that day.",
      },
      {
        title: "Reduce repeated editing",
        body:
          "When a centre prefers practical language, certain cultural wording, or a shorter style, those preferences can become part of the drafting context.",
      },
      {
        title: "Built for team rollout",
        body:
          "Centre plans make voice consistency more useful across educators while keeping each story editable and educator-led.",
      },
    ],
    faqs: [
      { question: "Can individual educators use centre voice memory?", answer: "Yes. Individual educators can save personal voice preferences, while centre plans are positioned for shared team rollout." },
      { question: "Will StoryLoop force preferred phrases into every story?", answer: "No. Preferred phrases guide tone only when they fit naturally and are supported by the observation." },
      ...sharedFaqs,
    ],
  },
  "parent-friendly-learning-stories": {
    slug: "parent-friendly-learning-stories",
    title: "Parent-Friendly Learning Story Versions",
    description:
      "Create shorter, warmer parent-friendly versions of educator learning stories while keeping documentation-focused drafts intact.",
    kicker: "Family communication",
    heading: "Turn an educator draft into a family-friendly version.",
    intro:
      "StoryLoop can create a shorter parent-friendly version after the educator documentation draft, helping families understand the learning without losing the original professional story.",
    sections: [
      {
        title: "Two versions, two jobs",
        body:
          "The educator version can hold curriculum and assessment detail, while the family version is warmer, shorter, and easier to read.",
      },
      {
        title: "No new details added",
        body:
          "The parent-friendly version works from the saved story and does not invent extra actions, quotes, or family context.",
      },
      {
        title: "Useful for whānau communication",
        body:
          "The family version can support a quick home connection while the educator still decides what is appropriate to share.",
      },
    ],
    faqs: [
      { question: "Does the parent-friendly version replace the learning story?", answer: "No. It is an additional version for family communication; the educator documentation draft remains available." },
      { question: "Can I copy it separately?", answer: "Yes. StoryLoop provides a separate parent-friendly text block that can be copied." },
      ...sharedFaqs,
    ],
  },
  "te-whariki-learning-stories": {
    slug: "te-whariki-learning-stories",
    title: "Te Whāriki Learning Stories",
    description:
      "Draft Te Whāriki learning stories with accurate strand names, learning outcome links, dispositions, whānau connection, and responding ideas.",
    kicker: "Te Whāriki",
    heading: "Te Whāriki links that feel natural, not pasted on.",
    intro:
      "StoryLoop helps kaiako describe observed learning through Te Whāriki strands, outcome ideas, dispositions, working theories, and practical next steps.",
    sections: [
      {
        title: "Strands are treated correctly",
        body:
          "StoryLoop names strands such as Mana aotūroa | Exploration and then explains the related learning outcome idea, rather than treating Exploration or Communication as generic outcomes.",
      },
      {
        title: "Dispositions are visible in the story",
        body:
          "Curiosity, perseverance, inventiveness, collaboration, empathy, resilience, safe risk-taking, and problem solving are woven in when they are visible in the observation.",
      },
      {
        title: "Responding is practical",
        body:
          "Next steps are written as usable teaching responses, such as adding resources, revisiting the interest, inviting child voice, or sharing a home connection with whānau.",
      },
    ],
    faqs: [
      { question: "Can StoryLoop include Kōwhiti Whakapae?", answer: "Yes, when enabled and relevant. It uses Kōwhiti as a notice, recognise, and respond lens rather than forcing it into every story." },
      { question: "Does it use Te Reo Māori respectfully?", answer: "StoryLoop uses te reo Māori carefully and in context, with low, medium, or high settings so educators can choose what suits their service." },
      ...sharedFaqs,
    ],
  },
  "eylf-learning-stories": {
    slug: "eylf-learning-stories",
    title: "EYLF Learning Stories",
    description:
      "Draft EYLF learning stories for early childhood education with Outcome links, learning dispositions, child voice, and next steps.",
    kicker: "EYLF V2.0",
    heading: "EYLF learning story drafts without the generic AI sound.",
    intro:
      "StoryLoop supports EYLF-aligned story drafts that stay grounded in the observation, so educators can review, edit, and share with confidence.",
    sections: [
      {
        title: "Outcome links with a reason",
        body:
          "StoryLoop can link observations to EYLF outcomes such as confident and involved learners or effective communicators, with a short explanation of what evidence supports the link.",
      },
      {
        title: "Plain educator language",
        body:
          "The writing is warm and clear without unnecessary academic language, making it easier to edit for families, room leaders, and centre documentation.",
      },
      {
        title: "Backlog support",
        body:
          "Use it to get a first draft moving, then add your local context, child knowledge, and final professional judgement before publishing.",
      },
    ],
    faqs: [
      { question: "Is it suitable for new educators?", answer: "Yes. It helps new educators see how observation, learning, curriculum, dispositions, and responding can fit together." },
      { question: "Is it suitable for experienced educators?", answer: "Yes. Experienced educators can use it as a fast first draft and still refine the interpretation themselves." },
      ...sharedFaqs,
    ],
  },
  "storypark-educa-export-packs": {
    slug: "storypark-educa-export-packs",
    title: "Export Learning Stories to Storypark or Educa",
    description:
      "Turn one educator-reviewed learning story into copy-ready formats for Storypark, Educa, Kinderloop, and Brightwheel.",
    kicker: "Export packs",
    heading: "Keep your current documentation platform and improve the draft before you paste.",
    intro:
      "StoryLoop is designed to sit beside the systems educators already use. Export packs rearrange one story into platform-friendly sections without locking centres into a new publishing workflow.",
    sections: [
      {
        title: "Built to reduce switching friction",
        body:
          "Educators can draft in StoryLoop, review the quality and privacy checks, then copy the structure that best fits Storypark, Educa, Kinderloop, or Brightwheel.",
      },
      {
        title: "Different formats, same educator judgement",
        body:
          "The export pack changes section order and family wording. It does not auto-publish or bypass teacher review.",
      },
    ],
    faqs: [
      { question: "Does StoryLoop replace Storypark or Educa?", answer: "No. It can work as a drafting and quality layer before educators paste into their existing platform." },
      { question: "Can I still edit before copying?", answer: "Yes. The story remains editable before it is copied or downloaded." },
      ...sharedFaqs,
    ],
  },
  "ece-documentation-radar": {
    slug: "ece-documentation-radar",
    title: "ECE Documentation Radar for Early Childhood Centres",
    description:
      "Supportive documentation visibility for centres: open next steps, children needing fresh observations, family reply gaps, and review queues.",
    kicker: "Documentation Radar",
    heading: "See where documentation needs support without turning educators into a leaderboard.",
    intro:
      "Documentation Radar helps directors and room leaders notice practical gaps across recent stories, while keeping the focus on support, planning, and educator wellbeing.",
    sections: [
      {
        title: "Supportive signals, not surveillance",
        body:
          "The radar highlights children needing a fresh observation, open response ideas, unreviewed stories, and family questions waiting for replies.",
      },
      {
        title: "Planning from actual stories",
        body:
          "Signals are built from stories educators already created, so weekly planning conversations can start from real evidence rather than another blank form.",
      },
    ],
    faqs: [
      { question: "Is this used to rank educators?", answer: "No. The feature is designed for workload support, review health, and planning visibility." },
      { question: "Does it show personal family details?", answer: "It keeps the signal high-level and points educators back to the story for review." },
      ...sharedFaqs,
    ],
  },
  "ai-learning-story-privacy-guard": {
    slug: "ai-learning-story-privacy-guard",
    title: "AI Learning Story Privacy and Evidence Guard",
    description:
      "StoryLoop flags privacy risks, unsupported claims, diagnosis-style language, and extra identifiers before educators share learning stories.",
    kicker: "Privacy guard",
    heading: "AI drafting needs a visible privacy and evidence check.",
    intro:
      "StoryLoop keeps educator judgement central by showing evidence anchors, assumptions, privacy flags, and teacher review checks beside each draft.",
    sections: [
      {
        title: "Flags risk before sharing",
        body:
          "The Privacy + Evidence Guardian looks for sensitive family detail, diagnosis-style wording, unsupported certainty, and identifiers that do not belong in a learning story.",
      },
      {
        title: "Teacher review stays required",
        body:
          "StoryLoop does not sign off a story. It gives educators a clearer checklist so they can make the final professional decision.",
      },
    ],
    faqs: [
      { question: "Does this replace centre privacy policy?", answer: "No. It supports review, but centres should still follow their own policies and family consent settings." },
      { question: "Does StoryLoop diagnose children?", answer: "No. It is not a diagnostic tool and flags diagnosis-style wording for review." },
      ...sharedFaqs,
    ],
  },
  "early-childhood-centre-roi-dashboard": {
    slug: "early-childhood-centre-roi-dashboard",
    title: "Early Childhood Centre Documentation ROI Dashboard",
    description:
      "Show stories created, estimated time saved, backlog cleared, family loops, review completion, and planning signals for centre rollout.",
    kicker: "Centre ROI",
    heading: "Prove documentation support is saving time and improving follow-through.",
    intro:
      "StoryLoop's Centre Growth dashboard helps directors justify the subscription with practical usage and workload signals, without ranking educators.",
    sections: [
      {
        title: "Designed for directors and owners",
        body:
          "The dashboard estimates time saved, stories created, backlog cleared, review completion, and family reply activity.",
      },
      {
        title: "Built around support",
        body:
          "Signals are framed as coaching and planning prompts, not performance surveillance.",
      },
    ],
    faqs: [
      { question: "What does the ROI dashboard measure?", answer: "It measures usage and workflow signals such as stories created, estimated time saved, backlog support, reviews, family loops, and planning gaps." },
      { question: "Can it help justify a centre subscription?", answer: "Yes. It gives directors a simple way to explain why documentation support is saving staff time." },
      ...sharedFaqs,
    ],
  },
  pricing: {
    slug: "pricing",
    title: "StoryLoop Pricing",
    description:
      "Simple StoryLoop pricing for early childhood educators: free monthly stories, unlimited educator plans, and centre rollout support.",
    kicker: "Pricing",
    // Short on purpose. The old heading ran six lines on a 375px phone and ate
    // the entire first screen of the one page people open to see a number.
    heading: "Start free. Upgrade when it is worth it.",
    intro:
      "The free plan includes 3 stories per month. Paid plans are designed for educators and centres that want unlimited drafting, voice notes, saved history, and Stripe-managed billing.",
    sections: [
      {
        title: "Free plan",
        body:
          "Create 3 learning stories each month, edit and copy drafts, and test Te Whāriki or EYLF support before choosing a paid plan.",
      },
      {
        title: "Educator plan",
        body:
          "Unlock unlimited learning stories for individual educators who want to keep their documentation backlog under control.",
      },
      {
        title: "Centre plan",
        body:
          "Designed for services that want shared rollout support, admin visibility, and a consistent educator-led documentation workflow.",
      },
    ],
    faqs: [
      { question: "Can I manage my subscription?", answer: "Yes. Paid users can manage subscription and billing through the Stripe customer portal from Billing & plan." },
      { question: "Do upgrade prompts block history?", answer: "No. Upgrade prompts are dismissible and never block existing story history." },
      ...sharedFaqs,
    ],
  },
  examples: {
    slug: "examples",
    title: "Learning Story Examples",
    description:
      "Examples of early childhood learning story drafts using real observations, curriculum links, dispositions, and responding ideas.",
    kicker: "Examples",
    heading: "Examples of grounded learning story drafts.",
    intro:
      "StoryLoop examples show the difference between rough educator notes and a clearer first draft that can be reviewed, edited, and signed off.",
    sections: [
      {
        title: "Scooter tinkering example",
        body:
          "A child testing a clothes peg as a scooter stopper can show curiosity, inventiveness, perseverance, problem solving, and working theories linked naturally to Mana aotūroa | Exploration.",
      },
      {
        title: "Block building example",
        body:
          "A tower falling and being rebuilt can show resilience, self-regulation, confidence, and persistence without turning the story into a long formal report.",
      },
      {
        title: "Group story time example",
        body:
          "A child joining animal sounds during shared reading can show communication, belonging, child voice, and group participation.",
      },
    ],
    faqs: [
      { question: "Can I regenerate an example in another tone?", answer: "Yes. Saved stories can be regenerated from the original observation using a different tone, depth, or curriculum mode." },
      { question: "Can I copy or export the story?", answer: "Yes. Generated and saved stories can be copied or exported as text." },
      ...sharedFaqs,
    ],
  },
  faq: {
    slug: "faq",
    title: "StoryLoop FAQ",
    // Reviewed when the homepage questions moved here, so the visible date and
    // the sitemap say when the answers were last checked against the product.
    reviewedAt: "2026-09-23",
    description:
      "Answers about StoryLoop, Te Whāriki, EYLF, voice notes, free stories, editing, educator judgement, and generic AI writing.",
    kicker: "FAQ",
    heading: "Questions educators ask before using StoryLoop.",
    intro:
      "StoryLoop is built as an educator support tool, not a replacement for teacher thinking. These answers explain how it works and where educator judgement remains central.",
    sections: [
      {
        title: "Educator-led by design",
        body:
          "The educator supplies the observation, chooses the curriculum mode and settings, reviews the output, edits wording, and decides what is accurate enough to share.",
      },
      {
        title: "Flexible across NZ and Australia",
        body:
          "Use New Zealand mode for Te Whāriki or Australian mode for EYLF. Settings can be changed per story or saved as defaults.",
      },
      {
        title: "Voice notes and typed notes both work",
        body:
          "Live microphone recording is available in supported browsers. If it is blocked or unavailable, the app keeps the typing and audio-upload fallback visible.",
      },
    ],
    faqs: [
      { question: "What is StoryLoop?", answer: "StoryLoop is an ECE documentation tool that drafts learning stories from real educator observations, voice notes, or bullet points." },
      { question: "Does StoryLoop replace educator thinking?", answer: "No. StoryLoop supports drafting and structure, while educators remain responsible for observation, interpretation, reflection and final editing." },
      { question: "Can I edit the generated stories?", answer: "Yes. Generated stories can be edited immediately, saved in history, copied, exported, and regenerated from the original observation." },
      { question: "Does it support Te Whāriki?", answer: "Yes. NZ mode supports Te Whāriki strands, learning outcome ideas, dispositions, next steps, and optional Kōwhiti Whakapae or Tapasā lenses." },
      { question: "Does it support EYLF?", answer: "Yes. Australia mode supports EYLF V2.0 learning outcomes and keeps links grounded in the observed learning." },
      { question: "Can I use voice notes?", answer: "Yes. Supported browsers can request microphone access. If live recording is not available, you can type bullet points or upload an audio file." },
      { question: "How many stories are free?", answer: "The free plan includes 3 stories per month." },
      { question: "Is it suitable for new educators?", answer: "Yes. It supports structure and wording while still requiring educator review." },
      { question: "Is it suitable for experienced educators?", answer: "Yes. Experienced educators can use it to speed up the first draft and then apply their own judgement and local context." },
      { question: "Does it create generic AI stories?", answer: "StoryLoop is designed to avoid generic AI phrasing by grounding every story in the educator's observation and making curriculum links specific." },
      // Moved here from the homepage in September 2026, when the homepage FAQ was
      // cut to the seven questions a visitor is actually deciding on.
      { question: "Do I need to write a learning story every day?", answer: "No. A captured moment can become a story, be held for planning, or be archived. Not every observation needs formal documentation, and StoryLoop is built around that judgement." },
      { question: "What is Today Loop?", answer: "Today Loop is a daily observation inbox. It surfaces up to three prompts from your own unfinished moments, open next steps and story history, then lets you capture a real moment and decide later whether it needs a story, a planning response, or nothing." },
      { question: "Do I have to stop using Storypark or Educa?", answer: "No. StoryLoop writes the draft and you copy or export it into Storypark, Educa, Kinderloop, Brightwheel or whatever your centre already uses. It does not replace attendance, incident, consent, billing or regulatory record systems." },
      { question: "What about children's privacy?", answer: "Your observations are not used to train AI models. StoryLoop never keeps children's voice recordings. Wall cards shared with families carry no names, photographs or dates. Nothing is shared until you choose to." },
      { question: "What does a centre plan cost?", answer: "Centre Starter covers up to 10 educators and unlimited children for NZ$109 or A$99 a month. Centre Growth covers up to 25 educators for NZ$219 or A$199. There is no per-child fee, and plans start with a 7-day free trial." },
      { question: "Will it put words in the child's mouth?", answer: "Never. A child's quoted words are kept exactly as you wrote them, spelling and all, because how a two-year-old actually said it is the evidence. If you did not record a quote, the story does not invent one." },
      { question: "Will it make things up that I did not see?", answer: "Interpretation is allowed; invention is not. Drafts stay anchored to your observation, and anything the note does not support is raised as an assumption for you to confirm rather than written in as fact." },
      { question: "What happens with sensitive or difficult moments?", answer: "Every draft is scanned before you see it. Diagnosis language, other children's identifying details, sensitive family information, and physical safety incidents are flagged for your review against your own centre's process." },
      { question: "Will every story sound the same?", answer: "They are written to read one of a kind. Run the same note twice and you get two genuinely different stories, because a folder of near-identical documentation helps nobody." },
      { question: "Am I locked in?", answer: "No. Your stories stay yours, editable and exportable into the format your centre already uses. Cancel whenever you like and everything you have written stays in your account." },
    ],
  },
  "eylf-planning-cycle": {
    slug: "eylf-planning-cycle",
    title: "EYLF Planning Cycle: From Observation to Response",
    description:
      "A practical educator guide to using observation, analysis, planning, implementation, and reflection within EYLF V2.0 documentation.",
    kicker: "Educator guide · Australia",
    heading: "Use the EYLF planning cycle without turning documentation into a checklist.",
    intro:
      "A strong learning story is one part of an ongoing cycle. The useful question is not only what happened, but what the educator noticed, how the child’s learning was interpreted, and what response was later revisited.",
    reviewedAt: "2026-06-14",
    sections: [
      {
        title: "Observe specific actions",
        body:
          "Record what the child did, said, changed, repeated, or communicated. Concrete details give later interpretation something real to stand on.",
      },
      {
        title: "Analyse with restraint",
        body:
          "Connect the moment to relevant EYLF learning outcomes, principles, or practices only where the evidence supports the link. One clear connection is stronger than five generic tags.",
      },
      {
        title: "Plan, respond, revisit",
        body:
          "Choose a practical response, then notice what happens when the interest or strategy appears again. Reflection becomes more useful when it changes what educators do next.",
      },
    ],
    faqs: [
      {
        question: "Does every observation need all five EYLF outcomes?",
        answer:
          "No. Outcomes are broad and interconnected, but documentation should use the most relevant links rather than forcing every outcome into one moment.",
      },
      {
        question: "What makes a useful follow-up?",
        answer:
          "A useful follow-up names something observable to revisit, such as a strategy, phrase, relationship, working theory, or way the child responds to a new material.",
      },
      ...sharedFaqs,
    ],
    sources: [
      {
        label: "Australian Government Department of Education: Early Years Learning Framework",
        url: "https://www.education.gov.au/early-childhood/resources/early-years-learning-framework",
      },
      {
        label: "Australian Government Department of Education: National Quality Framework",
        url: "https://www.education.gov.au/early-childhood/about/quality-and-safety/national-quality-framework",
      },
    ],
  },
  // Term 4 is transition statement season in Australia, and educators search
  // for help while they write. Every obligation below is quoted or closely
  // paraphrased from the state's own page (reviewed 2026-09-17). States we did
  // not verify are not described, only pointed back to their department.
  "transition-to-school-statement": {
    slug: "transition-to-school-statement",
    title: "Transition to School Statements: An Educator's Guide",
    description:
      "What Victoria, NSW and Queensland require in a transition to school statement, how New Zealand differs, and how to have the evidence ready.",
    kicker: "Educator guide · Term 4",
    heading: "Write a transition statement from a year of noticing, not a week of remembering.",
    intro:
      "A transition statement is the one document a new teacher is most likely to read before a child walks in. The hard part is rarely the form. It is finding, in November, the real moments that show who this child is. This guide covers what each state asks for and how to have that evidence ready.",
    reviewedAt: "2026-09-17",
    sections: [
      {
        title: "Know what your state asks for",
        body:
          "Victoria's TLDS is a kindergarten funding requirement. NSW services with Start Strong funding must complete a Transition to School Statement. Queensland's approved kindergartens complete one in November. New Zealand has no national statement. Details for each are below.",
      },
      {
        title: "Write from strengths and evidence",
        body:
          "Describe what the child does, how they learn best and what helps them, using moments you actually saw. Leave out labels you are not qualified to give, comparisons with other children and anything you could not point to in your documentation.",
      },
      {
        title: "Bring the family and child in",
        body:
          "Families know things no service does, and several states build their voice into the statement itself. Victoria's TLDS includes a section for the child and one for the family, and families must be able to opt out of it being shared with the school.",
      },
    ],
    faqs: [
      {
        question: "Is a transition to school statement compulsory?",
        answer:
          "It depends where you are and how your service is funded. In Victoria a TLDS is a kindergarten funding requirement for every child moving to school. In NSW it is required for services receiving Start Strong funding and recommended for others. In Queensland approved and funded kindergarten providers are expected to complete one. New Zealand has no national requirement. For other states and territories, check your education department's current guidance.",
      },
      {
        question: "Do families have to agree before the statement goes to the school?",
        answer:
          "Follow your state's process and your service's privacy policy. Victoria requires that families receive the completed TLDS and are given the chance to opt out of it being shared with the school. Queensland's online Kindergarten Transition Statement application is used with parent or carer consent, with a template available where consent is not given.",
      },
      {
        question: "When should I start gathering evidence?",
        answer:
          "From the start of the year. Victoria's online TLDS tool opens around July, and Queensland statements are completed in November, but the statement is only as good as the observations behind it. A few specific, dated moments across the year say far more than a summary written from memory.",
      },
      {
        question: "Can I use AI to write a transition statement?",
        answer:
          "The statement is a professional judgement about a real child, so an educator has to write and stand behind it. Do not put identifying information about a child into a general AI tool. StoryLoop's transition pack does not write anything: it gathers the stories, the child's voice and the family's words you have already recorded onto one page, for you to draw on when you complete the official statement.",
      },
      {
        question: "What about New Zealand?",
        answer:
          "There is no national transition statement in Aotearoa, and because most children start school around their fifth birthday, transitions happen all year rather than in one end-of-year rush. Te Whāriki treats pathways to school and kura as part of the curriculum, and many services share a child's learning stories with whānau and, with their agreement, with the new school.",
      },
      ...sharedFaqs,
    ],
    sources: [
      {
        label: "Victorian Government: Transition Learning and Development Statements",
        url: "https://www.vic.gov.au/transition-learning-and-development-statements",
      },
      {
        label: "NSW Department of Education: Transition to school",
        url: "https://education.nsw.gov.au/early-childhood-education/ecec-resource-library/transition-to-school",
      },
      {
        label: "Queensland Government: Transition statements",
        url: "https://earlychildhood.qld.gov.au/early-years/transitions/moving-to-school/transition-statements",
      },
      {
        label: "QCAA: Kindergarten transition statements",
        url: "https://www.qcaa.qld.edu.au/kindergarten/transition-statements",
      },
    ],
  },
  // Directors and educational leaders preparing for assessment and rating are
  // the people who buy centre plans. Every statement about what assessors look
  // for paraphrases ACECQA's Guide to the NQF, Standard 1.3 (read 2026-09-17).
  "nqs-standard-1-3-assessment-and-planning": {
    slug: "nqs-standard-1-3-assessment-and-planning",
    title: "NQS Standard 1.3: Assessment and Planning",
    description:
      "What ACECQA's guidance says assessors look for in elements 1.3.1, 1.3.2 and 1.3.3, and how to show the planning cycle without more paperwork.",
    kicker: "Director guide · Australia",
    heading: "Show the whole planning cycle, not a pile of stories.",
    intro:
      "Standard 1.3 asks whether educators take a planned and reflective approach to each child's program. Most services have plenty of documentation. What is often missing is the thread from an observation to what was planned, what happened next and what educators thought about it. This guide sets out what ACECQA's guidance says and how to make that thread visible.",
    reviewedAt: "2026-09-17",
    sections: [
      {
        title: "1.3.1 Assessment and planning cycle",
        body:
          "Each child's learning is assessed as part of an ongoing cycle of observing, analysing, documenting, planning, implementing and reflecting. ACECQA is clear that there is no one way to document it. Assessors look for the cycle, not a format.",
      },
      {
        title: "1.3.2 Critical reflection",
        body:
          "Critical reflection on children's learning, individually and in groups, should drive planning. Assessors may sight reflection journals or jottings and ask how reflection has actually changed the program.",
      },
      {
        title: "1.3.3 Information for families",
        body:
          "Families are informed about the program and their child's progress in ways that suit them. Assessors may look for a communication approach agreed with families, point-in-time progress summaries and transition statements for children starting school.",
      },
    ],
    faqs: [
      {
        question: "Is there a required format for documentation under the NQS?",
        answer:
          "No. ACECQA's guidance says there is no one way to meet documentation requirements under the NQF. Services choose methods that suit their children, families and community, using professional judgement. What matters is that the assessment and planning cycle is visible.",
      },
      {
        question: "What might an assessor ask to see for element 1.3.1?",
        answer:
          "ACECQA's guidance lists things like information showing educators understand each child over time, evidence that families contributed and children's views were sought, documented analysis of each child's learning using the learning outcomes as reference points, and clear information for families about what the program offered.",
      },
      {
        question: "Does critical reflection have to be written down?",
        answer:
          "Assessors may sight documentation of reflection, such as journals, diaries or brief jottings, and may discuss how reflection informs planning. Short, honest notes that led to a change in practice are more useful than long reflections that change nothing.",
      },
      {
        question: "Can educators use their own phones to record observations?",
        answer:
          "ACECQA's guidance says images or recordings of children may only be captured, stored or transmitted on a service-supplied device in centre-based services, or a service-supplied or service-authorised device in family day care. A personal device must not be used for images of children. Check your service's device policy before using any app, and if you use voice notes, record your own summary rather than the children.",
      },
      ...sharedFaqs,
    ],
    sources: [
      {
        label: "ACECQA Guide to the NQF: Standard 1.3 Assessment and planning",
        url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning",
      },
      {
        label: "ACECQA: Element 1.3.1 Assessment and planning cycle",
        url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning/element-131-assessment-and-planning-cycle",
      },
      {
        label: "ACECQA: Element 1.3.2 Critical reflection",
        url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning/element-132-critical-reflection",
      },
      {
        label: "ACECQA: Element 1.3.3 Information for families",
        url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning/element-133-information-families",
      },
    ],
  },
  // Highest-intent director query we had nothing for. The hook is a fact from
  // ACECQA's own process page, verified 2026-09-22: a regulatory authority
  // generally gives ONE TO FIVE DAYS' notice of a site visit. Every director
  // who has been through it knows that number and it reframes the whole
  // problem, because a term of evidence cannot be rebuilt in five days.
  "assessment-and-rating-evidence": {
    slug: "assessment-and-rating-evidence",
    title: "Assessment and Rating: the evidence to have ready",
    description:
      "Regulatory authorities generally give 1-5 days' notice of a visit. What Standard 1.3 evidence to have ready, and the gaps that surface under pressure.",
    kicker: "Director guide · Australia and Aotearoa",
    heading: "You get a few days' notice, not a few weeks.",
    intro:
      "ACECQA's process page says regulatory authorities generally provide one to five days' notice that a site visit will occur, and an assessment that starts in response to compliance issues may start with no notice at all. That is the real constraint. Nobody rebuilds a term of documentation in five days, so the evidence either exists by then or it does not. This page sets out what to have ready and where the gaps usually are.",
    reviewedAt: "2026-09-22",
    sections: [
      {
        title: "What the notice period actually is",
        body:
          "One to five days for a site visit, or for a conversation in place of a visit where a partial assessment does not need one. A draft report follows three to five weeks after the visit, and the provider can respond to factual inaccuracies with evidence. So there is a second window, but only for correcting the record, not for creating documentation that should already have existed.",
      },
      {
        title: "Standard 1.3 is where documentation gets tested",
        body:
          "Element 1.3.1 asks whether the assessment and planning cycle is happening for each child. 1.3.2 asks whether critical reflection drives planning. 1.3.3 asks whether families are informed about the program and their child's progress. ACECQA is explicit that there is no required format. Assessors look for the cycle, not a template.",
      },
      {
        title: "The four gaps that show up under time pressure",
        body:
          "Coverage: the quiet children have far less recorded than the confident ones, and a roll call of documentation makes it obvious. Unclosed loops: next steps written at the bottom of a story and never mentioned again. Unrecorded reflection: the thinking happened in a conversation and was never written down. Family input living in a messaging app instead of in the child's documentation.",
      },
      {
        title: "A sequence that fits in the notice period",
        body:
          "Day one, list every child and when they were last documented, and give the thinnest names to the educators who know them. Day two, walk the open next steps and record what was actually tried. Day three, write the reflections that only exist as conversations. Day four, bring family voice back into the records it belongs in. Day five, read it as an assessor would and prepare to talk through one child's cycle end to end.",
      },
      {
        title: "In Aotearoa, the same evidence, a different visit",
        body:
          "ERO reviews early childhood services against Te Whariki and works from the service's own internal evaluation. The documentation questions land in the same place: can you show what you noticed about a child, what you did in response, what happened, and how whanau contributed. A service prepared for one conversation is largely prepared for the other.",
      },
    ],
    faqs: [
      {
        question: "How much notice does a service get before an assessment and rating visit?",
        answer:
          "ACECQA's process page says regulatory authorities generally provide one to five days' notice that a site visit will occur. Where a partial assessment does not require a visit, the same one to five days' notice may be given for a conversation instead. An assessment that commences in response to compliance issues may commence without notice.",
      },
      {
        question: "What happens after the visit?",
        answer:
          "The regulatory authority provides a draft report three to five weeks after the visit. The provider can give feedback on factual inaccuracies and supply evidence supporting that feedback. The final report follows, and ratings are published once the review period ends.",
      },
      {
        question: "Does the Quality Improvement Plan count as the evidence?",
        answer:
          "The QIP records your self-assessment: strengths and the areas you have identified for improvement. It is not the documentation evidence for Standard 1.3. An assessor reading a QIP will still ask to see how the planning cycle runs for individual children.",
      },
      {
        question: "Is there a required documentation format?",
        answer:
          "No. ACECQA's guidance states there is no one way to meet documentation requirements under the NQF, and services choose methods that suit their children, families and community. What is assessed is whether the cycle is visible, not which template produced it.",
      },
      {
        question: "Can software prove our service is compliant?",
        answer:
          "No, and be wary of anything that claims it can. Software can count what your team recorded and show you where the gaps are before someone else finds them. The professional judgement, the practice and the rating remain yours.",
      },
      ...sharedFaqs,
    ],
    sources: [
      {
        label: "ACECQA: Assessment and rating process",
        url: "https://www.acecqa.gov.au/assessment/assessment-and-rating-process",
      },
      {
        label: "ACECQA Guide to the NQF: Standard 1.3 Assessment and planning",
        url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning",
      },
      {
        label: "Education Review Office: how ERO reviews early childhood services",
        url: "https://www.ero.govt.nz/how-ero-reviews/how-ero-reviews-early-childhood-services",
      },
    ],
  },
  // The page a director lands on. Every claim here is either a plan fact from
  // lib/plans.ts or a feature that exists; the consent rule is the one thing no
  // competitor can say, so it leads.
  "for-centres": {
    slug: "for-centres",
    title: "StoryLoop for Centres",
    description:
      "Documentation support for a whole early childhood team: unlimited children, a reliever brief, an evidence pack, and planning built from real stories.",
    kicker: "For directors and owners",
    heading: "Your team's documentation, without buying their diary.",
    intro:
      "A centre plan covers every educator and every child for one flat price. Leadership sees who is documenting and when. It never sees what an educator wrote unless that educator turns sharing on, because buying the seats should not buy the diary.",
    reviewedAt: "2026-09-22",
    sections: [
      {
        title: "One price, unlimited children",
        body:
          "Centre Starter is NZ$109 or A$99 a month for up to 10 educators, Centre Growth NZ$219 or A$199 for up to 25. Enrol twenty more tamariki and the price does not move. Per educator that is roughly half the individual plan.",
      },
      {
        title: "The evidence, without the fortnight before the visit",
        body:
          "Regulatory authorities generally give one to five days' notice of a site visit. The evidence pack counts what your team already saved: every child's coverage and when they were last documented, how often a next step was written and then actually revisited, where reflection and family voice are recorded, and the gaps, named first. It summarises your own records. It is not a compliance judgement and does not claim to be one.",
      },
      {
        title: "The reliever problem, solved on one page",
        body:
          "A relief teacher prints one page before the children arrive: who has not been noticed lately, what each child is into, languages spoken at home, and the next steps your team already planned. Built from stories your team already wrote.",
      },
      {
        title: "Educators keep their drafts",
        body:
          "Sharing is off by default and only the educator can turn it on. Leadership always sees activity, never content they were not given. That is the difference between support and surveillance, and it is why teams stop hiding their documentation.",
      },
    ],
    faqs: [
      {
        question: "Do we have to move off Storypark or Educa?",
        answer:
          "No. StoryLoop is where the writing happens; your platform stays where families and records live. Finished drafts export into Storypark, Educa, Kinderloop and Brightwheel, so nothing migrates and nothing is replaced.",
      },
      {
        question: "What does a centre plan actually include?",
        answer:
          "Everything on Educator Pro for every educator on the plan, plus the evidence pack, the reliever brief, a planning brief built from recent stories, a documentation radar, shared centre voice and quality settings, export packs, and admin oversight that shows activity rather than content.",
      },
      {
        question: "How do we try it?",
        answer:
          "Start a centre plan and you get 30 days free with no card needed. Invite your team from My centre. If it is not right for you, do nothing: the month simply ends, nothing is charged, and every story stays yours. While founding spots last, the first ten centres then pay 50% for their first three months.",
      },
      {
        question: "Is it cheaper than buying individual plans?",
        answer:
          "From about six educators, yes. Ten individual Educator plans are NZ$210 a month; Centre Starter covers ten educators for NZ$109 with unlimited children. The documentation time calculator on this site does the arithmetic with your own numbers.",
      },
      {
        question: "Who owns what our educators write?",
        answer:
          "Your service does. Stories stay in the account, are editable and exportable at any time, and StoryLoop never sends anything to families on your behalf.",
      },
      ...sharedFaqs,
    ],
    sources: [
      {
        label: "ACECQA Guide to the NQF: Standard 1.3 Assessment and planning",
        url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning",
      },
      {
        label: "Education Review Office: how ERO reviews early childhood services",
        url: "https://www.ero.govt.nz/how-ero-reviews/how-ero-reviews-early-childhood-services",
      },
    ],
  },
  "te-whariki-learning-outcomes-guide": {
    slug: "te-whariki-learning-outcomes-guide",
    title: "Te Whāriki Learning Outcomes: A Practical Guide",
    description:
      "Understand Te Whāriki strands, goals, learning outcomes, dispositions, working theories, and assessment-for-learning in everyday learning stories.",
    kicker: "Educator guide · Aotearoa",
    heading: "Link Te Whāriki learning outcomes to evidence, not labels.",
    intro:
      "The five strands organise broad areas of learning and development. Learning outcomes sit within those strands and encompass knowledge, skills, attitudes, and dispositions that develop over time.",
    reviewedAt: "2026-06-14",
    sections: [
      {
        title: "Start with the moment",
        body:
          "Notice the child’s action, language, strategy, relationship, or working theory first. Curriculum language should clarify what mattered in the moment rather than replace the observation.",
      },
      {
        title: "Name strand and outcome idea",
        body:
          "A natural link names the relevant strand, then explains the outcome idea and the evidence. For example, testing and adjusting an idea can connect with Mana aotūroa | Exploration and reasoning or problem solving.",
      },
      {
        title: "Keep assessment formative",
        body:
          "Assessment becomes useful when it helps kaiako respond. Practical next steps can include revisiting an interest, changing resources, inviting whānau knowledge, or noticing how a working theory develops.",
      },
    ],
    faqs: [
      {
        question: "Are Exploration and Communication learning outcomes?",
        answer:
          "They are English names for Te Whāriki strands. Each strand contains broader learning outcomes that describe valued learning developing over time.",
      },
      {
        question: "Where does Kōwhiti Whakapae fit?",
        answer:
          "Kōwhiti Whakapae supports planning, formative assessment, and teaching practice within Te Whāriki in social and emotional learning, oral language and literacy, and maths.",
      },
      ...sharedFaqs,
    ],
    sources: [
      {
        label: "Te Whāriki Online: Strands, goals and learning outcomes",
        url: "https://tewhariki.tahurangi.education.govt.nz/te-whariki/our-curriculum/strands/5637145233.c",
      },
      {
        label: "Te Whāriki Online: Kōwhiti Whakapae",
        url: "https://tewhariki.tahurangi.education.govt.nz/k-whiti-whakapae-strengthening-progress-through-practice/5637184340.p",
      },
      {
        label: "Education Review Office: Te Ara Poutama indicators of quality",
        url: "https://www.ero.govt.nz/how-ero-reviews/early-childhood-services/akarangi-quality-evaluation/te-ara-poutama-indicators-of-quality-for-early-childhood-education-what-matters",
      },
    ],
  },
  "family-connection-pack-learning-stories": {
    slug: "family-connection-pack-learning-stories",
    title: "Family Connection Packs for Learning Stories",
    description:
      "Turn educator learning stories into family-ready messages, open questions, home links, photo captions, and pickup handover notes.",
    kicker: "Family communication",
    heading: "A family message from the story you already wrote.",
    intro:
      "StoryLoop's Family Connection Pack helps educators turn a saved learning story into clear family communication without rewriting the whole draft from scratch.",
    sections: [
      {
        title: "More than a shorter version",
        body:
          "The pack can include a family-ready message, an open question, a simple home connection, a photo caption, a pickup handover note, and a teacher check before sharing.",
      },
      {
        title: "Grounded in the saved story",
        body:
          "StoryLoop works from the educator-approved story and metadata, so it should not invent home routines, family background, culture, diagnosis, or extra child quotes.",
      },
      {
        title: "Built for busy pickup and app updates",
        body:
          "Educators can use the pack when they need a quick, respectful way to help families understand the learning behind a moment.",
      },
    ],
    faqs: [
      {
        question: "Does the Family Connection Pack replace educator judgement?",
        answer:
          "No. It gives educators copy-ready options to review, edit, and decide whether to share with families.",
      },
      {
        question: "Which plan includes Family Connection Packs?",
        answer:
          "Family Connection Packs are included on Educator and Centre plans.",
      },
      ...sharedFaqs,
    ],
  },
  "room-planning-brief-early-childhood": {
    slug: "room-planning-brief-early-childhood",
    title: "Room Planning Briefs from Learning Stories",
    description:
      "Use recent learning stories to create emerging-interest summaries, environment ideas, intentional teaching moves, and team reflection prompts.",
    kicker: "Centre planning",
    heading: "Turn learning stories into a weekly room planning conversation.",
    intro:
      "Room Planning Briefs help centre teams look across recent story evidence and decide what to notice, set up, ask families, and discuss next.",
    sections: [
      {
        title: "Planning from evidence already captured",
        body:
          "Instead of asking educators to complete another planning form, StoryLoop uses recent story summaries, next steps, outcomes, and educator observations as the starting point.",
      },
      {
        title: "Practical team prompts",
        body:
          "The brief can suggest emerging interests, environment setups, intentional teaching moves, family partnership prompts, and reflection questions for the next team conversation.",
      },
      {
        title: "A support tool, not a full assessment",
        body:
          "The brief should be reviewed and adapted by educators. It does not rank children, diagnose, or replace local curriculum judgement.",
      },
    ],
    faqs: [
      {
        question: "Who is the Room Planning Brief for?",
        answer:
          "It is designed for centre teams, room leaders, and educational leaders who want recent documentation to feed practical planning.",
      },
      {
        question: "Which plan includes Room Planning Briefs?",
        answer:
          "Room Planning Briefs are included on the Centre plan.",
      },
      ...sharedFaqs,
    ],
  },
  "responsible-ai-ece-documentation": {
    slug: "responsible-ai-ece-documentation",
    title: "Responsible AI for ECE Documentation",
    description:
      "A practical guide to educator judgement, child privacy, evidence, transparency, and responsible AI use in early childhood learning stories.",
    kicker: "Practice guide",
    heading: "Use AI for the first draft, not the final judgement.",
    intro:
      "Responsible use starts with a clear boundary: educators observe, interpret, reflect, edit, and sign off. AI can help organise a draft, but it should not invent evidence, diagnose a child, or make professional decisions.",
    reviewedAt: "2026-06-14",
    sections: [
      {
        title: "Keep evidence visible",
        body:
          "A useful AI-assisted draft should make it easy to trace interpretation back to the educator’s notes and identify where context is missing.",
      },
      {
        title: "Minimise child information",
        body:
          "Use only the details needed to draft the story. Avoid unnecessary identifying, health, family, or support information, and follow your service’s privacy policy.",
      },
      {
        title: "Make educator review explicit",
        body:
          "Before sharing, check quotes, cultural references, curriculum links, assumptions, and whether the suggested response fits the child and local curriculum.",
      },
    ],
    faqs: [
      {
        question: "Should families know AI supported a draft?",
        answer:
          "Services should decide and document a transparent approach to AI use with educators and families, including what data is used and where professional responsibility remains.",
      },
      {
        question: "Can AI assess a child’s development?",
        answer:
          "StoryLoop is not a diagnostic or developmental assessment system. It supports drafting from educator-provided evidence and requires professional review.",
      },
      ...sharedFaqs,
    ],
    sources: [
      {
        label: "Google Search Central: Helpful, people-first content",
        url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
      },
      {
        label: "Storypark: Responsible AI and child data safeguards",
        url: "https://blog.storypark.com/2025/02/how-storypark-ai-has-been-designed-to-help-educators-safeguard-childrens-data/",
      },
    ],
  },
};

// Attach long-form bodies to the pages that have them. Kept separate so the
// heavy prose lives in its own file and this one stays a readable index.
import { SEO_DEEP_DIVES } from "./seo-deep-dives";
for (const [slug, deepDive] of Object.entries(SEO_DEEP_DIVES)) {
  if (SEO_PAGES[slug]) {
    SEO_PAGES[slug].deepDive = deepDive;
  }
}

export const SEO_PAGE_SLUGS = Object.keys(SEO_PAGES);
