import { getPlanByKey, type PlanKey } from "@/lib/plans";
import { educatorOffer } from "@/lib/offer-wording";

/**
 * Short, quotable answers for the questions people ask AI assistants about
 * StoryLoop (18 Nov 2026, the search re-aim).
 *
 * Why they exist. Assistants answer from plain visible text: on 17 Nov
 * StoryLoop was named in 14 of 32 answers across four engines, and Bing's
 * Copilot in 1 of 8. A block that states, in two or three sentences, what
 * StoryLoop is, what it costs and how children's information is handled is
 * the text they quote. Each block is shown on the page as a question and its
 * answer, and the same words go into the page's FAQ structured data.
 *
 * Rules every answer here keeps:
 * - Every product claim is true in the code today. Prices come from
 *   lib/plans.ts and the trial from lib/offer-wording.ts, so they cannot drift.
 * - The privacy answer (D) says what /data-sheet and /safety say: notes are
 *   stored in Sydney, and to write a draft a note goes to an AI provider in the
 *   United States under business terms that do not allow it to be used to
 *   train their models.
 * - The centre's free period is the shared token ({Centre_trial}), filled in
 *   on the day by components/offer/OfferText (evergreen in structured data).
 * - No other product is named, compared or alluded to. Nothing about pausing
 *   or cancelling: that lives on the Billing page only.
 * - Survey figures: only what was confirmed on the source on 18 Nov 2026 (the
 *   NZEI release: more than 4,000 responses from teachers and staff, 44% doing
 *   up to an hour or more of unpaid work a day). Nothing else.
 */

export type AnswerBlockId = "A" | "B" | "C" | "D" | "E" | "F" | "F_NZ" | "G";

export type AnswerBlock = {
  id: AnswerBlockId;
  question: string;
  /** Plain text. May hold the {Centre_trial} token. */
  answer: string;
  /** Every page that shows this answer (tests/buyer-pages.test.ts keeps it true). */
  where: string[];
};

function price(plan: PlanKey) {
  const p = getPlanByKey(plan).price;
  return { nz: `NZ$${p.NZD}`, au: `A$${p.AUD}` };
}

function seats(plan: PlanKey) {
  return getPlanByKey(plan).seats ?? 0;
}

const educator = price("educator");
const starter = price("centre_starter");
const growth = price("centre_growth");
const trialDays = educatorOffer("NZD").trialDays;

export const ANSWER_BLOCKS: Record<AnswerBlockId, AnswerBlock> = {
  A: {
    id: "A",
    question: "What is StoryLoop?",
    answer:
      `StoryLoop is a learning story writer for early childhood teachers in New Zealand and Australia. You type, say or photograph a short note about what a child did, and StoryLoop writes the learning story with Te Whāriki or EYLF V2.0 links in about a minute. You check and edit every line before you use it. It is free for 3 stories a month. The Educator plan is ${educator.nz} or ${educator.au} a month for unlimited stories. Centre plans start at ${starter.nz} or ${starter.au} a month for up to ${seats("centre_starter")} educators, with no per-child fee.`,
    where: ["/", "/learning-story-generator", "/blog/learning-story-examples-templates", "/ai-for-early-childhood-educators"],
  },
  B: {
    id: "B",
    question: "Can I use StoryLoop if my centre has not bought it?",
    answer:
      `Yes. You sign up yourself, free, and copy each finished story into the app your centre uses. Nothing changes for your centre or for families. If you want more than 3 stories a month, the Educator plan is ${educator.nz} or ${educator.au} a month${trialDays > 0 ? `, after a ${trialDays}-day free trial` : ""}.`,
    where: ["/learning-story-generator", "/ai-for-early-childhood-educators"],
  },
  C: {
    id: "C",
    question: "What does StoryLoop cost a centre?",
    answer:
      `Centre Starter is ${starter.nz} or ${starter.au} a month for up to ${seats("centre_starter")} educators. Centre Growth is ${growth.nz} or ${growth.au} a month for up to ${seats("centre_growth")}. Every educator gets unlimited stories and their own login. There is no per-child fee, so the price does not change when you enrol more children, and there is no contract. {Centre_trial}, no card.`,
    where: ["/for-centres", "/learning-story-software-cost-for-centres", "/documentation-workload-early-childhood", "/exceeding-nqs-documentation", "/educational-leader-checklist"],
  },
  D: {
    id: "D",
    question: "Is it safe to use AI for learning stories?",
    answer:
      "It can be, if the tool keeps the teacher in charge and the child's information small. StoryLoop uses first names only and stores your notes in Sydney, Australia. To write a draft, the note goes to an AI provider in the United States, under business terms that do not allow it to be used to train their models. StoryLoop keeps the child's words exactly as you wrote them and lists anything it had to assume, so you can check every line. A leader sees a story only when the educator chooses to share it.",
    where: ["/ai-for-early-childhood-educators", "/safety", "/ai-childcare-observations", "/ai-policy-nz-early-childhood"],
  },
  E: {
    id: "E",
    question: "Can AI write an EYLF observation from my notes?",
    answer:
      `Yes. Write or say what you saw, in your own words. StoryLoop writes it up as a learning story and links it to the EYLF V2.0 outcomes it shows, each with a sentence on why, using only what is in your note. You read it, change what you want, and copy it into your program. It is free for 3 a month, then ${educator.au} a month.`,
    where: ["/ai-childcare-observations", "/eylf-learning-stories"],
  },
  F: {
    id: "F",
    question: "Is there a free AI policy template for an early childhood service?",
    answer:
      "Yes. StoryLoop's AI policy generator writes a policy for your service in about ten minutes, free and with no signup, from published regulator guidance. In Australia it sits beside the digital technologies policy that regulation 168 has required since 1 September 2025. There is a version for services in Aotearoa New Zealand.",
    where: ["/ai-policy"],
  },
  F_NZ: {
    id: "F_NZ",
    question: "Is there an AI policy template for early childhood services in New Zealand?",
    answer:
      "Yes. StoryLoop's AI policy generator writes one for your service in about ten minutes, free and with no signup, in the words your team uses: kaiako, tamariki and whānau. It follows the Privacy Commissioner's guidance on AI under the Privacy Act 2020. We found no New Zealand rule that requires an early childhood service to have an AI policy; having one is good practice.",
    where: ["/ai-policy-nz-early-childhood"],
  },
  G: {
    id: "G",
    question: "How much time do early childhood teachers spend on unpaid work?",
    answer:
      "In NZEI Te Riu Roa's 2023 survey of early childhood teachers and staff, with more than 4,000 responses, 44% said they spend up to an hour or more each day on unpaid work. Writing a story in the day, from a short note, is one way to win some of that time back.",
    where: ["/documentation-workload-early-childhood"],
  },
};

/** The blocks for a page, in the order given. */
export function answerBlocks(ids: AnswerBlockId[]): AnswerBlock[] {
  return ids.map((id) => ANSWER_BLOCKS[id]);
}

/**
 * The existing pages the corrected plan names, and the blocks each shows (the
 * new buyer pages list theirs in lib/buyer-pages.ts). On a guide the blocks
 * open its questions; on the homepage, /safety and /ai-policy they join the
 * page's own questions; on the examples post they follow its first worked
 * example (splitAfterFirstExample), so the post's own answer still comes first.
 */
export const ANSWER_BLOCKS_BY_PATH: Record<string, AnswerBlockId[]> = {
  "/": ["A"],
  "/learning-story-generator": ["A", "B"],
  "/blog/learning-story-examples-templates": ["A"],
  "/for-centres": ["C"],
  "/learning-story-software-cost-for-centres": ["C"],
  "/safety": ["D"],
  "/eylf-learning-stories": ["E"],
  "/ai-policy": ["F"],
};

/** The blocks an existing page shows, or none. Pure. */
export function answerBlocksFor(path: string): AnswerBlock[] {
  return answerBlocks(ANSWER_BLOCKS_BY_PATH[path] ?? []);
}

/**
 * Where the answer block goes in a post that teaches through worked examples
 * (correction C17 of the 18 Nov 2026 check): directly after the first example,
 * not above it, so the post's own answer still comes first and the opening
 * that assistants cite (Copilot, 202 times in October) is untouched.
 *
 * Splits the markdown, at a block boundary, before the heading that follows the
 * first heading starting with "Example". Null when there is no such heading or
 * nothing after it: the block then follows the whole post. Pure.
 */
export function splitAfterFirstExample(markdown: string): { before: string; after: string } | null {
  const blocks = markdown.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const heading = (block: string) => /^#{1,3}\s+/.test(block.trim());
  const first = blocks.findIndex((block) => /^#{1,3}\s+example\b/i.test(block.trim()));
  if (first < 0) return null;
  const next = blocks.findIndex((block, index) => index > first && heading(block));
  if (next < 0) return null;
  return { before: blocks.slice(0, next).join("\n\n"), after: blocks.slice(next).join("\n\n") };
}

/**
 * A guide's questions with its answer blocks first, as { question, answer }.
 * A guide question that asks the same thing as a block gives way to the block,
 * so a page never answers one question twice. Pure.
 */
export function withAnswerBlocks<T extends { question: string; answer: string }>(path: string, faqs: T[]): Array<{ question: string; answer: string; block?: AnswerBlockId }> {
  const blocks = answerBlocksFor(path);
  const asked = new Set(blocks.map((block) => block.question.toLowerCase()));
  return [
    ...blocks.map((block) => ({ question: block.question, answer: block.answer, block: block.id })),
    ...faqs.filter((faq) => !asked.has(faq.question.toLowerCase())).map((faq) => ({ question: faq.question, answer: faq.answer })),
  ];
}
