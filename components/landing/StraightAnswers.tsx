import Link from "next/link";
import { Eye, FileCheck2, Quote, ShieldCheck, Sparkles, UserCheck } from "lucide-react";

/**
 * Cold ECE traffic does not hesitate over features, it hesitates over whether
 * an AI should be writing about a child at all. Every claim here is something
 * the product actually enforces in code, so this section is a promise we keep
 * rather than marketing.
 */
const ANSWERS = [
  {
    icon: UserCheck,
    q: "Does it replace my professional judgement?",
    a: "No. StoryLoop writes the first draft; you decide what is true. Every story arrives with the checks an educator should confirm before sharing, and nothing is published anywhere by us.",
  },
  {
    icon: Quote,
    q: "Will it put words in the child's mouth?",
    a: "Never. A child's quoted words are kept exactly as you wrote them, spelling and all, because how a two-year-old actually said it is the evidence. If you did not record a quote, the story does not invent one.",
  },
  {
    icon: Eye,
    q: "Will it make things up that I did not see?",
    a: "Interpretation is allowed; invention is not. Drafts stay anchored to your observation, and anything the note does not support is raised as an assumption for you to confirm rather than written in as fact.",
  },
  {
    icon: ShieldCheck,
    q: "What about privacy and difficult moments?",
    a: "Every draft is scanned before you see it. Diagnosis language, other children's identifying details, sensitive family information, and physical safety incidents are flagged for your review against your own centre's process.",
  },
  {
    icon: Sparkles,
    q: "Will every story sound the same?",
    a: "They are written to read one of a kind. Run the same note twice and you get two genuinely different stories, because a folder of near-identical documentation helps nobody.",
  },
  {
    icon: FileCheck2,
    q: "Am I locked in?",
    a: "No. Your stories stay yours, editable and exportable into the format your centre already uses. Cancel whenever you like and everything you have written stays in your account.",
  },
];

export default function StraightAnswers() {
  return (
    <section className="border-y border-clay-100 bg-white py-20">
      <div className="wide-shell">
        <div className="mb-12 text-center">
          <p className="section-title mb-3">Straight answers</p>
          <h2 className="mx-auto max-w-3xl font-display text-4xl font-bold text-ink-900 md:text-5xl">
            The questions educators actually ask us.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-ink-600">
            Documentation is professional work about real children. If you are cautious about where AI fits in that,
            you should be. Here is exactly where it fits, and where it does not.
          </p>
        </div>

        <div className="grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ANSWERS.map(({ icon: Icon, q, a }) => (
            <div key={q} className="card min-w-0 p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-sage-700 text-paper shadow-soft">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold leading-snug text-ink-900">{q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <p className="max-w-xl text-sm text-ink-600">
            The fastest way to judge it is to paste one real observation and read what comes back.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="#live-demo" className="btn-secondary">
              Try it with your own note
            </Link>
            <Link href="/signup" className="btn-primary">
              <Sparkles className="h-4 w-4" />
              Start free — 3 stories included
            </Link>
          </div>
          <p className="text-xs text-ink-500">No credit card. Cancel any time.</p>
        </div>
      </div>
    </section>
  );
}
