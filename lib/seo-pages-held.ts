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
      title: "Three more analysis of learning examples",
      body:
        "Made up for this page, each one line of note and one of analysis. Note: \"Mia, 2, held the gate for Leo three times, said 'you go'.\" Analysis: Mia waited, offered a turn in her own words and kept it up, which shows care for others (Outcome 2: children are connected with and contribute to their world). Note: \"Tom counted the blocks in his tower to 7, then lost track and started again from 1.\" Analysis: Tom knows counting goes in order and checks himself when he loses track (Outcome 4). Note: \"Ava drew lines on her picture and told me 'that says Ava'.\" Analysis: Ava knows marks can carry a message and her name, an early step in writing (Outcome 5: children are effective communicators).",
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
      links: [
        { label: "EYLF observation examples, from the rough note", href: "/eylf-observation-examples" },
        { label: "Observation methods, side by side", href: "/observation-methods-early-childhood" },
        { label: "Intentional teaching examples, by age", href: "/intentional-teaching" },
      ],
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
      question: "What is the EYLF planning cycle, with an example?",
      answer:
        "The planning cycle is five steps you run for each child: observe, analyse, plan, implement and reflect (NQS element 1.3.1). Example: Ruby pours water through a funnel, spills it, then pours slower and says why (observe); that shows persistence and a working theory, Outcome 4 (analyse); tomorrow, offer jugs with different spouts (plan); try it and jot what she does (implement); look back on what changed (reflect). StoryLoop writes the analyse and plan steps up as a learning story from your note, for you to check.",
    },
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

/**
 * /assessment-and-rating-evidence: builder X3, 25 Nov 2026 (growth-ops.json
 * search_next.actions[9], money-seo intent check). The live page already ranks
 * for nothing but sits on the search leaders type: "assessment and rating"
 * and "assessment and rating childcare" (Keyword Planner AU 100-1K a month
 * each, NZ 10-100; low bids), "exceeding nqs" (10-100), and "qip childcare"
 * (AU 100-1K) as one paragraph. The live H1 ("You get a few days' notice")
 * never says the words she typed, so the title, H1, description and first
 * line now do, and the answer comes in the first two paragraphs.
 *
 * The held Exceeding buyer page (exceeding-nqs-documentation) was re-aimed at the same
 * search on 25 Nov morning; it stays held and goes back to Exceeding, so two
 * of our pages never split one search (lib/buyer-pages.ts says so there).
 *
 * Everything the live page says stays, in the same order, after the new
 * opening. Sources and the long read (lib/seo-deep-dives.ts) are kept from the
 * live entry by lib/seo-pages.ts.
 */
export const ASSESSMENT_AND_RATING_REAIM: Pick<SeoPage, "title" | "description" | "heading" | "intro" | "kicker" | "reviewedAt" | "sections" | "faqs"> = {
  title: "Assessment and Rating: The Documentation Assessors Read",
  description:
    "What happens at an assessment and rating visit, what the assessor reads in Quality Area 1, your QIP, and how to get your team's stories ready.",
  kicker: "Director and leader guide · Australia and Aotearoa",
  heading: "Assessment and rating: what your documentation needs to show.",
  intro:
    "What happens at the visit, what the assessor reads in Quality Area 1, and how to get your team's stories ready. ACECQA's process page says regulatory authorities generally give one to five days' notice of a site visit, so the evidence either exists by then or it does not.",
  reviewedAt: "2026-11-25",
  sections: [
    {
      title: "What happens at an assessment and rating visit",
      body:
        "Your regulatory authority tells you the visit is coming and asks for your Quality Improvement Plan. An authorised officer spends time in the rooms: they observe practice, talk it through with your team and sight your documents. A draft report follows three to five weeks later, and you can answer factual errors with evidence. Each quality area is rated, then the service: Significant Improvement Required, Working Towards, Meeting or Exceeding NQS.",
    },
    {
      title: "Quality Area 1: the documentation the assessor reads",
      body:
        "Element 1.3.1, the assessment and planning cycle: show one child's cycle, from a note to a next step that happened. Element 1.3.2, critical reflection: show a team conversation that changed what you offered. Element 1.3.3, information for families: show stories families read and what they said back. ACECQA says there is no required format. The assessor looks for the cycle, not a template.",
      links: [
        { label: "Standard 1.3, element by element", href: "/nqs-standard-1-3-assessment-and-planning" },
        { label: "The NQS in plain words", href: "/nqs-standards" },
      ],
    },
    {
      title: "Your QIP and your stories",
      body:
        "The Quality Improvement Plan is your own self-assessment: strengths, what you will improve, and how. It is not the evidence itself. If your QIP says Quality Area 1 is a strength, the assessor will still ask to see the cycle for one child, so the learning stories your team writes each week are what back the QIP up.",
    },
    {
      title: "What Exceeding looks like in documentation",
      body:
        "A Standard is rated Exceeding only when three themes show in practice: it is embedded in how the service runs, informed by critical reflection, and shaped by real engagement with families or the community. In a learning story that looks like a next step that was tried and written about again, a reflection that changed the room, and a family's words carried into the next story. One story does not show a theme. A pattern across a term does.",
    },
    {
      title: "What the notice period actually is",
      body:
        "One to five days for a site visit, or for a conversation in place of a visit where a partial assessment does not need one. A draft report follows three to five weeks after the visit, and the provider can respond to factual inaccuracies with evidence. So there is a second window, but only for correcting the record, not for creating documentation that should already have existed.",
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
        "ERO reviews early childhood services against Te Whāriki and works from the service's own internal evaluation. The documentation questions land in the same place: can you show what you noticed about a child, what you did in response, what happened, and how whānau contributed. A service prepared for one conversation is largely prepared for the other.",
    },
  ],
  faqs: [
    {
      question: "What documentation do assessors look at for Quality Area 1?",
      answer:
        "For Standard 1.3 they look for the assessment and planning cycle for individual children (element 1.3.1), critical reflection that shapes planning (1.3.2), and how families hear about the program and their child's progress (1.3.3). There is no required format: learning stories with a next step that was tried and revisited show the cycle.",
    },
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
  ],
};
