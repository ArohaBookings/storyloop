import type { Metadata } from "next";
import Link from "next/link";
import GuideProof from "@/components/marketing/GuideProof";
import PrintableCard from "@/components/marketing/PrintableCard";
import { GuideCta, GuideFaq, GuideHero, GuidePage, GuideSection, GuideSources, RELATED, RelatedGuides } from "@/components/marketing/Guide";
import { REAL_EXAMPLES } from "@/lib/real-examples";
import { EYLF_OUTCOMES, EYLF_SOURCE } from "@/lib/eylf-outcomes";
import { ACCURACY_REPORT as R } from "@/lib/accuracy-report";

// A curriculum link exactly as a real draft wrote it (lib/real-examples.ts).
const LINK_EXAMPLE = REAL_EXAMPLES.flatMap((item) => item.story.split("\n"))
  .find((line) => line.startsWith("EYLF Outcome 5:")) ?? null;

export const metadata: Metadata = {
  // 14 Oct 2026: 820 impressions, 0 clicks in 28 days. Google answers these
  // searches itself (AI Overview), so the title promises what it can't give.
  title: { absolute: "EYLF Outcomes and Sub-Outcomes: Free Printable List (V2.0)" },
  description:
    "All 5 EYLF V2.0 learning outcomes and 20 sub-outcomes on one page, in the framework's own words. Free printable PDF, plus an everyday example of each.",
  alternates: { canonical: "https://storyloop.space/eylf-learning-outcomes" },
  openGraph: { title: "EYLF V2.0 outcomes and sub-outcomes: free printable list", description: "All 20 sub-outcomes on one printable page, and what each looks like in play.", url: "https://storyloop.space/eylf-learning-outcomes", type: "article" },
};

// Framework wording lives in lib/eylf-outcomes.ts, shared with the five outcome pages.
const OUTCOMES = EYLF_OUTCOMES;

const FAQS = [
  {
    q: "How many EYLF learning outcomes are there?",
    a: "Five learning outcomes, broken into 20 sub-outcomes in V2.0 (the framework calls them key components): four each under outcomes 1, 2 and 4, three under outcome 3 and five under outcome 5. Outcome 3 grew from two to three in V2.0.",
  },
  {
    q: "What changed in EYLF V2.0?",
    a: "The five outcomes stayed the same. Several sub-outcomes were reworded: 3.1 now includes mental wellbeing, 4.1 adds a growth mindset, and 2.1 speaks of children as active and informed citizens. V2.0 also grew from five principles to eight, adding Aboriginal and Torres Strait Islander perspectives, sustainability, and collaborative leadership and teamwork.",
  },
  {
    q: "How many outcomes should a learning story link to?",
    a: "Usually one or two: the ones the moment genuinely shows. A story that links to all five reads like a checklist and tells a family less. StoryLoop links only where the note supports it, and says why in a sentence.",
  },
  {
    q: "Where do the EYLF outcomes fit in the planning cycle?",
    a: (
      <>
        Observe, analyse (which outcomes the learning shows), plan, act, reflect. A learning story covers the first two and
        the start of planning in its &ldquo;where to next&rdquo;. See the{" "}
        <Link href="/eylf-planning-cycle" className="font-semibold text-clay-700 underline">EYLF planning cycle guide</Link>.
      </>
    ),
  },
  {
    q: "Is there an EYLF learning outcomes cheat sheet?",
    a: "Yes. There's a free one-page printable PDF of all 5 outcomes and 20 sub-outcomes at the top of this page, and the tables below add an everyday example for each sub-outcome.",
  },
];

export default function EylfOutcomesPage() {
  return (
    <GuidePage>
      <GuideHero
        kicker="EYLF V2.0 · Australia"
        updated="6 October 2026"
        title={<>The 5 EYLF learning outcomes, <span className="italic text-clay-700">in plain English</span></>}
        answer={
          <>
            <p>The Early Years Learning Framework (V2.0) sets five learning outcomes for children from birth to five:</p>
            <ol className="mt-3 list-decimal space-y-1 pl-6 font-semibold text-ink-900">
              {OUTCOMES.map((outcome) => (
                <li key={outcome.n}>
                  <a href={`#outcome-${outcome.n}`} className="underline decoration-clay-300 underline-offset-4 hover:text-clay-800">{outcome.title}</a>
                  <span className="font-normal text-ink-600">, {outcome.subs.length} sub-outcomes</span>
                </li>
              ))}
            </ol>
            <p className="mt-3">Each has sub-outcomes, 20 in all (the framework calls them key components), listed below in the framework&apos;s own words with what each can look like in play.</p>
          </>
        }
        image="/images/scenes/team.jpg"
        imageAlt="Three educators planning around a low table with a laptop showing StoryLoop's real example drafts"
      />

      {/* The list most searchers came for ("eylf sub outcomes", "eylf outcomes
          and sub outcomes"), before the demo. In the 28 days to 11 Oct 2026
          this page had 771 Google impressions and no clicks, and its first
          sub-outcome sat below the proof card and demo. */}
      <GuideSection id="all-sub-outcomes" tone="white" kicker="Quick list" title={<>All 20 EYLF sub-outcomes <span className="italic text-clay-700">at a glance</span></>}>
        <div className="gap-8 sm:columns-2">
          {OUTCOMES.map((outcome) => (
            <div key={outcome.n} className="mb-6 min-w-0 break-inside-avoid">
              <p className="font-display text-lg font-bold text-ink-900">Outcome {outcome.n}: {outcome.short}</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {outcome.subs.map(({ code, text }) => (
                  <li key={code}><span className="mr-2 font-bold tabular-nums text-clay-700">{code}</span>{text}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-sm text-ink-600">Each one is below with an everyday example of what it can look like in play.</p>
        <PrintableCard which="eylf" />
      </GuideSection>

      <GuideProof framework="AU" />

      {OUTCOMES.map((outcome, index) => (
        <GuideSection key={outcome.n} id={`outcome-${outcome.n}`} tone={index % 2 ? "white" : "plain"} kicker={`Outcome ${outcome.n}`} title={outcome.title}>
          <p className="text-lg">{outcome.plain}</p>
          <div className="overflow-x-auto rounded-3xl border border-clay-100 bg-paper">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream-50 text-xs uppercase tracking-wider text-ink-500">
                <tr><th className="px-4 py-3" scope="col">Sub-outcome</th><th className="hidden px-4 py-3 sm:table-cell" scope="col">What it can look like</th></tr>
              </thead>
              <tbody className="divide-y divide-clay-100">
                {outcome.subs.map(({ code, text, looks }) => (
                  <tr key={code} className="align-top">
                    <th scope="row" className="px-4 py-3 font-normal text-ink-800"><span className="mr-2 font-bold tabular-nums text-clay-700">{code}</span>{text}<span className="mt-1.5 block text-ink-600 sm:hidden"><span className="font-semibold text-ink-700">Looks like:</span> {looks}</span></th>
                    <td className="hidden px-4 py-3 text-ink-600 sm:table-cell">{looks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <Link href={`/eylf-learning-outcomes/${outcome.slug}`} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4">
              Outcome {outcome.n} in depth: examples for babies, toddlers and preschoolers
            </Link>
          </p>
        </GuideSection>
      ))}

      <GuideSection id="linking" tone="cream" kicker="In a learning story" title="Linking a story to the outcomes honestly">
        <p>
          A curriculum link is a claim: this moment shows this learning. It is only as strong as the evidence in the story.
          Name the outcome, then say in one sentence what the child did that shows it. For example, from a real StoryLoop
          draft:
        </p>
        {LINK_EXAMPLE && (
          <blockquote className="story-safe rounded-3xl border border-clay-100 bg-paper p-5 font-display text-lg leading-relaxed text-ink-800">
            {LINK_EXAMPLE}
          </blockquote>
        )}
        <p>
          StoryLoop writes links this way for Australian services, using V2.0 wording, and never adds Te Whāriki to an
          Australian story. In the latest test, <Link href="/accuracy" className="font-semibold text-clay-700 underline">{R.drafts - R.frameworkMixups} of {R.drafts} drafts</Link> used the right framework for their country.
        </p>
      </GuideSection>

      <GuideSection id="faq" title="Questions educators ask">
        <GuideFaq items={FAQS} />
      </GuideSection>

      <GuideSources sources={[EYLF_SOURCE, { label: "ACECQA: Approved learning frameworks", url: "https://www.acecqa.gov.au/nqf/national-law-regulations/approved-learning-frameworks" }]} />
      <GuideCta heading="Drafts with EYLF V2.0 links, from your own notes" />
      <RelatedGuides links={[RELATED.eylfV2, RELATED.eylfPrinciples, RELATED.whatIs, RELATED.template, RELATED.examples, RELATED.observation]} />
    </GuidePage>
  );
}
