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
  pricing: {
    slug: "pricing",
    title: "StoryLoop Pricing",
    description:
      "Simple StoryLoop pricing for early childhood educators: free monthly stories, unlimited educator plans, and centre rollout support.",
    kicker: "Pricing",
    heading: "Start free, then upgrade when the documentation backlog needs more support.",
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

export const SEO_PAGE_SLUGS = Object.keys(SEO_PAGES);
