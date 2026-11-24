import type { SeoPage } from "./seo-pages";

/**
 * Re-aimed guides built and held (25 Nov 2026). Each replaces the live words
 * at the same URL only when its switch in lib/held-pages.ts is on.
 *
 * /eylf-planning-cycle: analysis/search.json new_pages. "planning cycle eylf"
 * is the weekly documentation job itself: every step after observe is the work
 * StoryLoop does. The live page (June 2026) is three short paragraphs. This one
 * carries one example through every step and puts the note box under the
 * intro. The example child and note are made up and say so. Before release,
 * read the results page and Bing's volume for the phrase (search.json asked
 * for that check; the 1K-10K figure was a range on a merged row).
 */
export const EYLF_PLANNING_CYCLE_REAIM: Omit<SeoPage, "faqs"> & { faqs: SeoPage["faqs"] } = {
  slug: "eylf-planning-cycle",
  title: "The EYLF Planning Cycle, With an Example of Each Step",
  description:
    "The EYLF planning cycle step by step: one example from a rough note to a next step, what analysis of learning should say, and what assessors read.",
  kicker: "Educator guide · EYLF V2.0",
  heading: "The EYLF planning cycle, step by step.",
  intro:
    "The planning cycle is the documentation job you do every week: notice something, work out what it shows, plan a response, try it and look back. Below, one made-up example goes through every step. Got a note from this week? Put it in the box and StoryLoop writes the learning story with EYLF V2.0 links and a next step, for you to check.",
  reviewedAt: "2026-11-25",
  sections: [
    {
      title: "The cycle in one line",
      body:
        "Element 1.3.1 of the National Quality Standard describes an ongoing cycle of observation, analysing learning, documentation, planning, implementation and reflection, for each child. The EYLF V2.0 practice of assessment and evaluation for learning sits inside the same loop. It is the order you already think in, written down.",
    },
    {
      title: "Step 1, observe: the rough note",
      body:
        "Example, made up for this page: \"Ruby, water trough, 10.20. Tried the funnel 4 times, water kept spilling over. Got the jug, poured slower. Said: it needs to go slow or it jumps out.\" Write what she did and said, in the order it happened. Keep her words exactly.",
    },
    {
      title: "Step 2, analyse: what it shows",
      body:
        "Analysis of learning says what the moment shows and points at the evidence. For Ruby: she tested an idea, changed her approach when it did not work, and explained why in her own words. That is persistence and a working theory about flow (EYLF V2.0 Outcome 4: children are confident and involved learners). Three habits make analysis strong: name what the child did before what it means, give one outcome with a reason rather than five tags, and leave out what you did not see.",
    },
    {
      title: "Step 3, plan: one next step",
      body:
        "One thing the room can do this week, tied to what she showed. For Ruby: tomorrow, put out two jugs with different spouts and a funnel with a wider neck, and ask her what she thinks will happen before she pours.",
    },
    {
      title: "Step 4, implement: try it",
      body:
        "Do it, and jot what happened in the same plain way as the first note. Did she predict? Did she test the wider funnel? That jotting is the start of the next round.",
    },
    {
      title: "Step 5, reflect: look back",
      body:
        "Look back on the child and on your practice. For Ruby: what did she do with the new jugs, and what next? For the team (element 1.3.2): what did this tell us about how we set up water play, and who else would it suit?",
    },
    {
      title: "Where the learning story fits",
      body:
        "A learning story is steps 1 to 3 written up for the family: what happened, what it shows, and where to next. StoryLoop drafts that part from your own note, with EYLF V2.0 links and a next step, and you check every line before you use it. Steps 4 and 5 stay with you and your team.",
    },
    {
      title: "What the assessor looks for",
      body:
        "At assessment and rating, Quality Area 1 is where your documentation is read most closely. An assessor looks for the cycle in practice for each child: an observation, what it shows, a plan that happened, and reflection that changed something. Element 1.3.3 asks that families are told about the program and their child's progress.",
      links: [
        { label: "The NQS in plain words", href: "/nqs-standards" },
        { label: "Standard 1.3, element by element", href: "/nqs-standard-1-3-assessment-and-planning" },
      ],
    },
  ],
  faqs: [
    {
      question: "What is analysis of learning?",
      answer:
        "The part of the cycle that says what a moment shows about the child's learning, with the evidence. It names what the child did, then the learning, then the outcome it links to and why.",
    },
    {
      question: "Does every observation need all five EYLF outcomes?",
      answer:
        "No. Outcomes are broad and connected, but one clear link with a reason is stronger than five generic tags.",
    },
    {
      question: "How often should the cycle run?",
      answer:
        "There is no set number. Most rooms run it every week for some children, so each child moves through it across a term.",
    },
  ],
  sources: [
    {
      label: "ACECQA: Element 1.3.1 Assessment and planning cycle",
      url: "https://www.acecqa.gov.au/national-quality-framework/guide-nqf/section-3-national-quality-standard-and-assessment-and-rating/quality-area-1-educational-program-and-practice/standard-13-assessment-and-planning/element-131-assessment-and-planning-cycle",
    },
    {
      label: "Australian Government Department of Education: Early Years Learning Framework",
      url: "https://www.education.gov.au/early-childhood/resources/early-years-learning-framework",
    },
  ],
};
