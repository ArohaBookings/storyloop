/**
 * The review-visit readiness check: a director answers ten questions about
 * their own documentation and gets back what is solid, what is not, and what
 * to do first.
 *
 * Why it exists. A regulatory authority generally gives one to five days'
 * notice of a site visit (ACECQA's own process page), so the evidence either
 * exists when the call comes or it does not. The fortnight of assembling that
 * most directors remember is a fortnight they did not actually have. A
 * two-minute self-check, done in March, is worth more than a week of
 * scrambling in October.
 *
 * WHAT THIS IS NOT. It is not a rating, a score out of a hundred, or a
 * prediction of any assessment outcome. It reflects a director's own answers
 * back to them in priority order. A tool that implied it could predict a
 * rating would be lying, and directors would know it.
 *
 * Pure functions, no network, no model, no storage: the answers never leave
 * the browser. That is also why it can be free and public with no signup.
 */

export type AnswerValue = "strong" | "partial" | "weak" | "unknown";

export type Question = {
  id: string;
  /** Which part of the cycle this tests, shown as a grouping label. */
  area: "Coverage" | "Planning cycle" | "Critical reflection" | "Family voice" | "Readiness";
  question: string;
  /** The honest reason it matters, in the words a director would use. */
  why: string;
  options: Array<{ value: AnswerValue; label: string }>;
};

const opts = (strong: string, partial: string, weak: string): Question["options"] => [
  { value: "strong", label: strong },
  { value: "partial", label: partial },
  { value: "weak", label: weak },
  { value: "unknown", label: "I am not sure" },
];

export const QUESTIONS: Question[] = [
  {
    id: "coverage-known",
    area: "Coverage",
    question: "Could you list every child and when they were last documented, today?",
    why: "It is the easiest thing for an outsider to check: a list of names and a list of dates. If it cannot be produced quickly, it usually means nobody has looked recently.",
    options: opts("Yes, within a few minutes", "Roughly, with some digging", "Not without going through folders"),
  },
  {
    id: "coverage-gaps",
    area: "Coverage",
    question: "This term, how many children have nothing recorded at all?",
    why: "The quiet child who never causes a fuss is the one who goes unseen, and the gap is visible in ninety seconds to anyone reading a roll against documentation.",
    options: opts("None that I know of", "One or two", "More than that"),
  },
  {
    id: "next-steps-recorded",
    area: "Planning cycle",
    question: "Do stories carry a next step for that child?",
    why: "An observation with no next step stops the cycle at noticing. The planning half of assessment and planning is the half that goes missing.",
    options: opts("Almost always", "Some do", "Rarely"),
  },
  {
    id: "next-steps-revisited",
    area: "Planning cycle",
    question: "When a next step is tried, is what happened written down?",
    why: "This is the part almost nobody records, and it is the part that proves a cycle rather than a pile. Six stories where the loop closes say more than twenty that stop at the plan.",
    options: opts("Yes, we mark what was tried", "Sometimes, informally", "It stays in people's heads"),
  },
  {
    id: "reflection-written",
    area: "Critical reflection",
    question: "Is critical reflection written down anywhere an assessor could see?",
    why: "ACECQA's guidance accepts short jottings and brief notes, not only formal writing. The problem is not the format, it is that the thinking happened in a conversation and left no trace.",
    options: opts("Yes, regularly", "Occasionally", "Almost never"),
  },
  {
    id: "reflection-changed",
    area: "Critical reflection",
    question: "Can you point to something that changed because of reflection?",
    why: "Element 1.3.2 asks whether reflection drives planning. Reflection that never changed anything reads as a writing exercise.",
    options: opts("Yes, more than one example", "One example, maybe", "Not that I could show"),
  },
  {
    id: "family-in-records",
    area: "Family voice",
    question: "Where do family contributions end up?",
    why: "A parent's knowledge that lives in a messaging app is not in the child's documentation, and 1.3.3 is about what families are told and what they contribute.",
    options: opts("In the child's documentation", "Split between there and chat apps", "Mostly in messages and conversations"),
  },
  {
    id: "family-informed",
    area: "Family voice",
    question: "Do families get a point-in-time summary of their child's progress?",
    why: "Assessors may look for summaries and, for children heading to school, transition statements. Photos alone are not progress information.",
    options: opts("Yes, on a regular rhythm", "Sometimes, on request", "Not really"),
  },
  {
    id: "walkthrough",
    area: "Readiness",
    question: "Could an educator walk one child's full cycle in two minutes?",
    why: "This is the actual conversation. An assessor picks a name and asks what you noticed, what you made of it, what you planned, what happened and what the family said.",
    options: opts("Any educator, any child", "Some educators, some children", "It would be a struggle"),
  },
  {
    id: "qip-honest",
    area: "Readiness",
    question: "Does your self-assessment name a real weakness?",
    why: "A QIP claiming no weaknesses is treated worse than one naming a genuine area for improvement and what is being done about it. Self-assessment is meant to be honest, not flattering.",
    options: opts("Yes, with what we are doing about it", "It names something vague", "It reads as all strengths"),
  },
];

export type Answers = Record<string, AnswerValue | undefined>;

export type ReadinessResult = {
  answered: number;
  total: number;
  /** Areas where every answered question came back strong. */
  solid: string[];
  /** What to fix, worst first: the question, and the first move. */
  priorities: Array<{ id: string; area: string; finding: string; firstMove: string }>;
  /** Questions the director could not answer, which is its own finding. */
  unknowns: string[];
  /** One honest sentence about where this service stands. Never a score. */
  summary: string;
};

/** What to do first about each weak answer. Concrete, doable this week. */
const FIRST_MOVES: Record<string, { finding: string; firstMove: string }> = {
  "coverage-known": {
    finding: "Nobody can say quickly when each child was last documented.",
    firstMove: "Build the list once: every child, the date of their last record. Whoever builds it will find the gaps in the process.",
  },
  "coverage-gaps": {
    finding: "Children have nothing recorded this term.",
    firstMove: "Name them, and give each name to the educator who knows that child best. Not a story each by Friday, one noticed moment each.",
  },
  "next-steps-recorded": {
    finding: "Stories stop at the observation, with no next step for the child.",
    firstMove: "Add one line to the end of the story format: what we will try next. One sentence, not a plan document.",
  },
  "next-steps-revisited": {
    finding: "What happened after a next step was tried is not recorded.",
    firstMove: "Pick five open next steps and record the outcome of each in a sentence, including the ones that did not work.",
  },
  "reflection-written": {
    finding: "Critical reflection is not written down anywhere.",
    firstMove: "Start a shared jottings page. Two lines after a session counts, and ACECQA's guidance says so explicitly.",
  },
  "reflection-changed": {
    finding: "No example shows reflection changing what was planned.",
    firstMove: "Take one change your team made this year and write the two lines of thinking behind it. You are recording what already happened.",
  },
  "family-in-records": {
    finding: "Family contributions live in messaging apps rather than in the child's documentation.",
    firstMove: "When a parent tells you something useful, paste it into that child's record the same day, in their words.",
  },
  "family-informed": {
    finding: "Families do not receive a point-in-time summary of progress.",
    firstMove: "Choose a rhythm you can actually keep, even once or twice a year, and tell families what it is.",
  },
  walkthrough: {
    finding: "Walking one child's full cycle out loud would be a struggle.",
    firstMove: "Practise it at a staff meeting with a real child. Where the story breaks down is your actual gap.",
  },
  "qip-honest": {
    finding: "Self-assessment does not name a genuine weakness.",
    firstMove: "Add the one thing everybody already knows needs work, with the step being taken. That reads as a service that knows itself.",
  },
};

const RANK: Record<AnswerValue, number> = { weak: 0, unknown: 1, partial: 2, strong: 3 };

export function assessReadiness(answers: Answers): ReadinessResult {
  const answered = QUESTIONS.filter((q) => answers[q.id]);
  const needsWork = answered
    .filter((q) => answers[q.id] === "weak" || answers[q.id] === "partial")
    .sort((a, b) => RANK[answers[a.id]!] - RANK[answers[b.id]!]);

  const priorities = needsWork.map((q) => ({
    id: q.id,
    area: q.area,
    finding: FIRST_MOVES[q.id].finding,
    firstMove: FIRST_MOVES[q.id].firstMove,
  }));

  const unknowns = answered.filter((q) => answers[q.id] === "unknown").map((q) => q.question);

  const areas = [...new Set(QUESTIONS.map((q) => q.area))];
  const solid = areas.filter((area) => {
    const inArea = answered.filter((q) => q.area === area);
    return inArea.length > 0 && inArea.every((q) => answers[q.id] === "strong");
  });

  let summary: string;
  if (answered.length === 0) {
    summary = "Answer the questions above and this fills itself in.";
  } else if (unknowns.length >= 3) {
    summary =
      "The honest finding here is not a weakness in practice, it is that the documentation cannot currently answer questions about itself. That is worth fixing first, because everything else is guesswork until it is.";
  } else if (priorities.length === 0) {
    summary =
      "Nothing in these answers points to a gap. Worth re-reading in a term, because coverage drifts quietly and the child who slips is never the one you are thinking about.";
  } else if (priorities.length <= 2) {
    summary = `Mostly solid, with ${priorities.length === 1 ? "one area" : "two areas"} worth attention before anyone asks.`;
  } else {
    summary = `${priorities.length} areas need attention. Start at the top: they are ordered by how quickly they would surface in a review conversation.`;
  }

  return { answered: answered.length, total: QUESTIONS.length, solid, priorities, unknowns, summary };
}
