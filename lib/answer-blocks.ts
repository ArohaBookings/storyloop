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
  /** The pages the search plan puts this answer on (for the result and the tests). */
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
    where: ["/", "/learning-story-generator", "/blog/learning-story-examples-templates"],
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
    where: ["/for-centres", "/learning-story-software-cost-for-centres", "/documentation-workload-early-childhood", "/exceeding-nqs-documentation"],
  },
  D: {
    id: "D",
    question: "Is it safe to use AI for learning stories?",
    answer:
      "It can be, if the tool keeps the teacher in charge and the child's information small. StoryLoop uses first names only and stores your notes in Sydney, Australia. To write a draft, the note goes to an AI provider in the United States, under business terms that do not allow it to be used to train their models. StoryLoop keeps the child's words exactly as you wrote them and lists anything it had to assume, so you can check every line. A leader sees a story only when the educator chooses to share it.",
    where: ["/ai-for-early-childhood-educators", "/safety", "/ai-childcare-observations", "/ask-your-centre"],
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
