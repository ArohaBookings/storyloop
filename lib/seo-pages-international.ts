/**
 * Guides for England (EYFS) and Ireland (Aistear), added 13 Oct 2026 when
 * StoryLoop started writing drafts for both (lib/international-frameworks.ts).
 *
 * Facts checked on 13 Oct 2026 against the official documents:
 * - The EYFS statutory framework for group and school-based providers (DfE,
 *   effective 1 September 2026), paragraphs 1.5, 1.6, 1.18, 1.20, 2.2, 2.5
 *   and 2.6, read in full from the published PDF.
 * - The Department of Children, Equality, Disability, Integration and Youth
 *   briefing "Updated Aistear for the Early Learning and Childcare Sector"
 *   (December 2024), as circulated by the City and County Childcare
 *   Committees.
 * Example notes and observations on these pages are written by us to show the
 * shape. They are not real children and are labelled as such. No em dashes,
 * no invented statistics. Shared FAQs are added in seo-pages.ts.
 */
import type { SeoPage } from "./seo-pages";

type Block = { heading: string; paragraphs: string[] };

const EYFS_FRAMEWORK = {
  label: "Department for Education: Early years foundation stage (EYFS) statutory framework (effective 1 September 2026)",
  url: "https://www.gov.uk/government/publications/early-years-foundation-stage-framework--2",
};
const DEVELOPMENT_MATTERS = {
  label: "Department for Education: Development Matters (non-statutory curriculum guidance)",
  url: "https://www.gov.uk/government/publications/development-matters--2",
};
const AISTEAR_NEWS = {
  label: "NCCA: Updated Aistear, the Early Childhood Curriculum Framework (December 2024)",
  url: "https://ncca.ie/en/updates-and-events/latest-news/2024/december/aistear-2024",
};
const AISTEAR_BRIEFING = {
  label: "DCEDIY: Updated Aistear for the Early Learning and Childcare Sector (December 2024 briefing, via Donegal County Childcare Committee)",
  url: "https://donegalchildcare.com/wp-content/uploads/2025/01/Updated_Aistear_publication_information_for_ELC_sector.pdf",
};

const UK_PRICE_ANSWER =
  "The free plan is 3 stories a month with no card. Paid plans are charged in New Zealand dollars (Educator is NZ$21 a month) and your bank converts the charge into pounds on the day, so the exact amount moves a little with the exchange rate.";
const IE_PRICE_ANSWER =
  "The free plan is 3 stories a month with no card. Paid plans are charged in New Zealand dollars (Educator is NZ$21 a month) and your bank converts the charge into euro on the day, so the exact amount moves a little with the exchange rate.";
const DATA_ANSWER =
  "StoryLoop stores stories in a database in Sydney, Australia, and never uses children's information to train AI models. Some providers that process a request are based in the United States. If your setting needs records kept in the UK or the EU, check with whoever handles data protection for you first, and use a first name or initials in the meantime.";

export const INTERNATIONAL_PAGES: Record<string, SeoPage> = {
  "eyfs-learning-stories": {
    slug: "eyfs-learning-stories",
    title: "EYFS Learning Stories and Observations (2026 Framework)",
    description:
      "Writing EYFS observations and learning stories under the September 2026 framework: the seven areas, three characteristics and what you no longer need to record.",
    kicker: "England · EYFS 2026",
    heading: "EYFS observations worth writing, and quick to write.",
    intro:
      "The EYFS statutory framework is plain about it: ongoing assessment needs no written records and no physical evidence. Plenty of settings still write observations and learning stories anyway, because parents love reading them and key persons plan from them. This guide is about writing one that earns its place: linked to the seven areas only where the moment shows it, in your own words, and finished before you go home.",
    reviewedAt: "2026-10-13",
    sections: [
      {
        title: "What the framework requires",
        body:
          "Paragraph 2.2 of the September 2026 framework says assessment should not involve long breaks from interaction with children or excessive paperwork, and that practitioners do not have to prove judgements with physical evidence. Paragraph 2.5 says there is no requirement to keep written records of day-to-day observation.",
      },
      {
        title: "What it does still ask for",
        body:
          "Keeping parents and carers up to date with their child's progress, a short written summary of development in the prime areas when a child is between two and three, and the EYFS profile at the end of reception. A good observation feeds the first two without extra work.",
      },
      {
        title: "Where StoryLoop fits",
        body:
          "Type a few rough lines about what a child did and said. StoryLoop drafts the observation with links to the EYFS areas and characteristics the moment actually shows, keeps the child's words exactly as you wrote them, and you edit and decide what is shared.",
      },
    ],
    faqs: [
      {
        question: "Do I have to write observations under the EYFS?",
        answer:
          "No. The EYFS statutory framework (effective 1 September 2026) says there is no requirement to keep written records of ongoing assessment, and practitioners do not have to prove their judgements with physical evidence. Many settings choose to write some, mostly to share with parents and carers and to plan.",
      },
      {
        question: "What are the seven areas of learning in the EYFS?",
        answer:
          "Three prime areas: communication and language; physical development; personal, social and emotional development. Four specific areas: literacy; mathematics; understanding the world; expressive arts and design.",
      },
      {
        question: "What are the characteristics of effective teaching and learning?",
        answer:
          "Playing and exploring (children investigate and have a go), active learning (they concentrate and keep trying when things are difficult), and creating and thinking critically (they have their own ideas, make links and develop strategies). They are about how a child learns, not what.",
      },
      {
        question: "Is Development Matters statutory?",
        answer:
          "No. The framework itself says Development Matters is non-statutory curriculum guidance, and that Ofsted and childminder agencies do not take it into account when they inspect. It is up to each provider how they deliver the learning and development requirements.",
      },
      {
        question: "Can StoryLoop write EYFS observations?",
        answer:
          "Yes. Choose EYFS · England as the curriculum and StoryLoop links the draft to the seven areas and the characteristics of effective teaching and learning, in British English. It does not make Early Learning Goal judgements or score a child against a checklist, and you check every word before it is shared.",
      },
      {
        question: "Where is the data stored?",
        answer: DATA_ANSWER,
      },
      {
        question: "How much does StoryLoop cost in pounds?",
        answer: UK_PRICE_ANSWER,
      },
    ],
    sources: [EYFS_FRAMEWORK, DEVELOPMENT_MATTERS],
  },

  "eyfs-observation-examples": {
    slug: "eyfs-observation-examples",
    title: "EYFS Observation Examples Linked to the 7 Areas of Learning",
    description:
      "Example EYFS observations for babies, toddlers and preschoolers, each linked to an area of learning and a characteristic of effective teaching and learning.",
    kicker: "England · EYFS examples",
    heading: "EYFS observation examples you can actually learn from.",
    intro:
      "Four short examples, from a baby to a child about to start reception, each showing the rough note a practitioner might jot down, the observation written from it, the EYFS link and a next step. They are written by us to show the shape, not about real children. Yours should come from what you saw today.",
    reviewedAt: "2026-10-13",
    sections: [
      {
        title: "Start from the note, not the area",
        body:
          "Write down what the child did and said first. Decide which area it links to afterwards. Observations written to fill an area read like it, and parents notice.",
      },
      {
        title: "One area is usually enough",
        body:
          "A strong observation names the one or two areas the moment clearly shows, and says why in a sentence. Ticking five areas for one moment at the water tray tells nobody anything.",
      },
      {
        title: "Say how, not just what",
        body:
          "The characteristics of effective teaching and learning are where an observation gets interesting: did the child keep trying, change their plan, have their own idea? That is the part a key person can plan from.",
      },
    ],
    faqs: [
      {
        question: "How long should an EYFS observation be?",
        answer:
          "As long as it needs to be to show the learning, which is often three to six sentences. The framework sets no length and no number of observations. Quality and usefulness matter more than quantity.",
      },
      {
        question: "Should I write the child's exact words?",
        answer:
          "Yes, whenever you have them. A child's own words are the strongest evidence of communication and language and of their thinking, and parents treasure them. Write them exactly as the child said them, not tidied up.",
      },
      {
        question: "Can I link one observation to several areas?",
        answer:
          "You can, if the moment really shows each one. Most moments show one or two clearly. Name those and explain the link in the child's actions, rather than listing every area the activity could touch.",
      },
      {
        question: "Can StoryLoop write these from my notes?",
        answer:
          "Yes. Type the rough note, choose EYFS · England, and StoryLoop drafts the observation with the area and characteristic links and a next step. Try it on this page without signing up.",
      },
      {
        question: "Where is the data stored?",
        answer: DATA_ANSWER,
      },
      {
        question: "How much does StoryLoop cost in pounds?",
        answer: UK_PRICE_ANSWER,
      },
    ],
    sources: [EYFS_FRAMEWORK, DEVELOPMENT_MATTERS],
  },

  "aistear-learning-stories": {
    slug: "aistear-learning-stories",
    title: "Aistear Learning Stories: Linking to the Four Themes",
    description:
      "Writing learning stories with the updated Aistear: the four Themes, what changed in the December 2024 update, and example links for each Theme.",
    kicker: "Ireland · Aistear",
    heading: "Aistear learning stories that link to the Themes honestly.",
    intro:
      "The updated Aistear, published by the NCCA in December 2024 and in use from September 2025, kept its four Themes and cut back the learning goals. Learning stories are one of the most natural ways to show those Themes in a child's day, because they start from what the child actually did. This guide covers linking a story to Wellbeing, Identity and Belonging, Communicating, and Exploring and Thinking without turning it into a checklist.",
    reviewedAt: "2026-10-13",
    sections: [
      {
        title: "What changed in the update",
        body:
          "The four Themes were kept and updated. There are fewer learning goals within each aim, and they are no longer numbered. The principles went from twelve to nine, and everyone using the framework, including parents and childminders, is now called an educator.",
      },
      {
        title: "Who it is for",
        body:
          "Aistear covers all children from birth to six in every setting other than primary and special schools. The updated framework puts relationships at the heart of learning, with a stronger focus on play, assessing and planning, transitions and outdoor learning.",
      },
      {
        title: "Where StoryLoop fits",
        body:
          "Type a few rough lines about what a child did and said. StoryLoop drafts the learning story with links to the Aistear Themes the moment actually shows, keeps the child's words exactly as you wrote them, and you edit and decide what is shared with families.",
      },
    ],
    faqs: [
      {
        question: "What are the four Aistear Themes?",
        answer:
          "Wellbeing; Identity and Belonging; Communicating; and Exploring and Thinking. Each Theme has aims and broad learning goals, which the updated framework describes as observable statements that support children's learning and development.",
      },
      {
        question: "When did the updated Aistear come in?",
        answer:
          "The NCCA published it in December 2024, the first update since 2009, and it came into use from September 2025. Printed copies went to settings through the City and County Childcare Committees in 2025.",
      },
      {
        question: "Should I quote the learning goals in a learning story?",
        answer:
          "There is no need. The updated learning goals are no longer numbered and are broad statements, not a checklist. Name the Theme the moment shows and explain the link in the child's own actions and words.",
      },
      {
        question: "Can StoryLoop write Aistear learning stories?",
        answer:
          "Yes. Choose Aistear · Ireland as the curriculum and StoryLoop links the draft to the four Themes in plain Irish and British English. It keeps any Irish words you wrote exactly as you wrote them and does not add ones you did not use. You check every word before it is shared.",
      },
      {
        question: "Where is the data stored?",
        answer: DATA_ANSWER,
      },
      {
        question: "How much does StoryLoop cost in euro?",
        answer: IE_PRICE_ANSWER,
      },
    ],
    sources: [AISTEAR_NEWS, AISTEAR_BRIEFING],
  },
};

export const INTERNATIONAL_DEEP_DIVES: Record<string, Block[]> = {
  "eyfs-learning-stories": [
    {
      heading: "No written records required. So why write any?",
      paragraphs: [
        "Since the reforms, the EYFS has moved firmly away from evidence-gathering. The September 2026 framework says practitioners should draw on their knowledge of the child and their own professional judgement, and are not required to prove it with physical evidence. If an observation exists only so a folder looks full, stop writing it.",
        "The observations worth keeping do a job. They tell a parent something real about their child's day. They help a key person notice a pattern and plan the next experience. They give you something to look back on when you write the progress check at two. A learning story, which tells one moment as a short narrative with what it shows and what comes next, does all three.",
      ],
    },
    {
      heading: "The seven areas and three characteristics, as the framework names them",
      paragraphs: [
        "Prime areas: communication and language; physical development; personal, social and emotional development. The framework calls these particularly important for learning and forming relationships.",
        "Specific areas: literacy; mathematics; understanding the world; expressive arts and design. They strengthen and build on the prime areas.",
        "Characteristics of effective teaching and learning: playing and exploring, where children investigate and have a go; active learning, where they concentrate and keep trying; and creating and thinking critically, where they have their own ideas, make links and develop strategies.",
      ],
    },
    {
      heading: "Writing the link in one honest sentence",
      paragraphs: [
        "A link should point at something the child did. Compare 'Links to Understanding the world' with 'This links with understanding the world, as Cooper tested how water moved through the funnel and changed his plan when it overflowed.' The second tells a parent what happened and tells a colleague why it matters.",
        "Do the same for the characteristics. 'Shows creating and thinking critically' is a label. 'He tried a smaller jug when the first pour spilled, which is creating and thinking critically: he had an idea, tested it and changed his strategy' is an observation.",
      ],
    },
    {
      heading: "What a daily observation should not do",
      paragraphs: [
        "It should not make Early Learning Goal judgements. Those belong to the EYFS profile at the end of reception, made from what you know of the child across the year, not from one moment at the sand tray.",
        "It should not score a child against Development Matters or Birth to 5 Matters statements. Both are non-statutory guidance. The framework says Development Matters can support a curriculum, and that inspectors do not take it into account.",
      ],
    },
    {
      heading: "Using StoryLoop in an English setting",
      paragraphs: [
        "Choose EYFS · England on the story page. StoryLoop writes in British English, links to the seven areas and the characteristics only where your note supports them, and flags anything it had to assume so you can check it. It will not use Australian or New Zealand framework language in an EYFS draft.",
        "The finished text copies into whatever your setting already uses for learning journals in one tap, so there is nothing to switch and nothing to set up.",
        "Stories are stored in Sydney, Australia, and are never used to train AI models. If your setting needs records kept in the UK, check with whoever handles data protection for you before using full names.",
      ],
    },
  ],

  "eyfs-observation-examples": [
    {
      heading: "Baby room: Isla, 9 months (example)",
      paragraphs: [
        "The note: 'Isla on tummy, ball rolled away, pushed up on arms, reached 3 times, rolled to side and got it. Big smile at me.'",
        "The observation: Isla was on her tummy when the ball rolled just out of reach. She pushed up on her arms and reached for it three times, then rolled onto her side and stretched until she had it. She looked straight at me and smiled.",
        "The link: physical development, as Isla used her arms and a roll to move her body towards something she wanted. It also shows active learning, because she kept trying after the first three reaches did not work.",
        "Next step: place interesting objects just beyond reach during tummy time, and wait a moment longer before helping.",
      ],
    },
    {
      heading: "Toddler room: Theo, 2 years (example)",
      paragraphs: [
        "The note: 'Theo filling red bucket at sand, tipped out, said more sand! 4 times. Got Ava to hold the bucket.'",
        "The observation: Theo filled the red bucket at the sand tray, tipped it out and said 'more sand!' He did this four times. On the last go he handed the bucket to Ava and showed her where to hold it while he filled it.",
        "The link: communication and language, as Theo used a two-word phrase to say what he wanted next. It also links to personal, social and emotional development, because he invited Ava into his play and showed her what to do.",
        "Next step: offer two buckets and a spade so Theo and a friend can take turns filling and tipping, and model words like 'full', 'empty' and 'your turn'.",
      ],
    },
    {
      heading: "Preschool room: Amara, 3 years 8 months (example)",
      paragraphs: [
        "The note: 'Amara block tower, fell over twice, made base wider, said it needs big feet. Counted 7 blocks tall.'",
        "The observation: Amara's tower fell over twice. The third time she put more blocks at the bottom and said, 'It needs big feet.' It stood, and she counted the blocks, touching each one: seven.",
        "The link: creating and thinking critically, as Amara had her own idea about why the tower fell and changed her strategy. Counting each block as she touched it links to mathematics.",
        "Next step: add a few photos of real towers and bridges to the block area, and ask Amara what she thinks makes them stand up.",
      ],
    },
    {
      heading: "Pre-reception: Leo, 4 years 6 months (example)",
      paragraphs: [
        "The note: 'Leo made a sign for the shop, wrote L and O, asked me how to write open. Told Sam the shop is closed for lunch.'",
        "The observation: Leo made a sign for the role-play shop. He wrote an L and an O, then asked me how to write 'open'. Later he told Sam, 'The shop is closed for lunch,' and turned the sign over.",
        "The link: literacy, as Leo used letters he knows and asked for help to write a word with a purpose. It also shows playing and exploring, because he used the sign to move his shop story along.",
        "Next step: put clipboards, card and pens in the shop so Leo and his friends can write prices, lists and signs.",
      ],
    },
    {
      heading: "What the four have in common",
      paragraphs: [
        "Each one starts from what the child did and said, keeps their words exactly, names one or two areas, and says why in the child's own actions. None of them makes a judgement about whether the child is on track. That is a decision for you, from everything you know about them.",
      ],
    },
  ],

  "aistear-learning-stories": [
    {
      heading: "What the December 2024 update changed",
      paragraphs: [
        "The Department of Children, Equality, Disability, Integration and Youth summarised the changes for the sector when the updated framework was published. The four Themes were retained and updated. The number of learning goals within each aim was reduced, and they remain broad, observable statements. The principles of early learning and development went from twelve to nine.",
        "The update brings in new ideas including agency, global citizenship, sustainability and slow relational pedagogy, and gives a stronger focus to play, assessing and planning, transitions and outdoor learning. Irish words and phrases are used throughout the framework to connect children and families with the language and heritage of Ireland.",
      ],
    },
    {
      heading: "An example link for each Theme",
      paragraphs: [
        "These are written by us to show the shape, not about real children.",
        "Wellbeing: 'Saoirse climbed to the top of the frame for the first time, looked down and called, \"I did it!\" This links with Wellbeing, as she took a safe risk and was proud of what her body could do.'",
        "Identity and Belonging: 'Tomás showed the group the photo of his grandad's farm and told us the names of the cows. This links with Identity and Belonging, as he shared something important from home and the group listened.'",
        "Communicating: 'Mia used the puppet to tell Ella the bear was sad because he lost his hat. This links with Communicating, as she used a story and a character to share an idea and a feeling.'",
        "Exploring and Thinking: 'Cian poured water through the funnel, saw it overflow and tried a smaller jug. This links with Exploring and Thinking, as he tested an idea and changed what he did next.'",
      ],
    },
    {
      heading: "The learning goals are not a checklist",
      paragraphs: [
        "The updated learning goals are fewer, broad and no longer numbered. A learning story does not need to quote them. Name the Theme the moment shows and explain the link in what the child did and said, in a sentence a family can understand.",
        "One or two Themes is usually right for one moment. The Themes are interconnected, so a strong story will often touch more than one, but listing all four for a single moment at the water tray tells nobody anything.",
      ],
    },
    {
      heading: "Irish words and family languages",
      paragraphs: [
        "If you use Irish words with the children, keep them in the story exactly as you would say them. If a child speaks another language at home and used it in the moment, write it down as they said it. StoryLoop keeps the words you wrote and does not add Irish words you did not use.",
      ],
    },
    {
      heading: "Using StoryLoop in Ireland",
      paragraphs: [
        "Choose Aistear · Ireland on the story page. StoryLoop writes in plain Irish and British English, links to the four Themes only where your note supports them, and flags anything it had to assume so you can check it. It mentions Síolta only if you do, and never uses Australian, New Zealand or English framework language in an Aistear draft.",
        "The finished text copies into whatever your service already uses to share with families. StoryLoop does not connect directly to other apps, so it is a copy and paste.",
        "Stories are stored in Sydney, Australia, and are never used to train AI models. If your service needs records kept in the EU, check with whoever handles data protection for you before using full names.",
      ],
    },
  ],
};

/** Which curriculum each international guide's live demo writes in. */
export const INTERNATIONAL_SLUG_FRAMEWORK: Record<string, "UK" | "IE"> = {
  "eyfs-learning-stories": "UK",
  "eyfs-observation-examples": "UK",
  "aistear-learning-stories": "IE",
};
