import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import GuideProof from "@/components/marketing/GuideProof";
import { GuideCta, GuideFaq, GuideHero, GuidePage, GuideSection, GuideSources, RELATED, RelatedGuides } from "@/components/marketing/Guide";
import { EYLF_OUTCOMES, EYLF_SOURCE, eylfOutcomeBySlug, realExampleForOutcome } from "@/lib/eylf-outcomes";

type PageProps = { params: Promise<{ outcome: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return EYLF_OUTCOMES.map((outcome) => ({ outcome: outcome.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const outcome = eylfOutcomeBySlug((await params).outcome);
  if (!outcome) return {};
  const url = `https://storyloop.space/eylf-learning-outcomes/${outcome.slug}`;
  const title = `EYLF Outcome ${outcome.n}: ${outcome.short}, Sub-Outcomes and Examples`;
  const description = `EYLF V2.0 Outcome ${outcome.n}, "${outcome.title}": all ${outcome.subs.length} sub-outcomes, with examples for babies, toddlers and preschoolers.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article" },
  };
}

export default async function EylfOutcomePage({ params }: PageProps) {
  const outcome = eylfOutcomeBySlug((await params).outcome);
  if (!outcome) notFound();
  const real = realExampleForOutcome(outcome.n);
  const others = EYLF_OUTCOMES.filter((other) => other.n !== outcome.n);

  const faqs = [
    {
      q: `What is EYLF Outcome ${outcome.n}?`,
      a: `Outcome ${outcome.n} of the Early Years Learning Framework V2.0 is "${outcome.title}". In plain terms: ${outcome.plain.charAt(0).toLowerCase()}${outcome.plain.slice(1)}`,
    },
    {
      q: `What are the sub-outcomes of Outcome ${outcome.n}?`,
      a: `There are ${outcome.subs.length}: ${outcome.subs.map((sub) => `${sub.code} ${sub.text}`).join("; ")}.`,
    },
    {
      q: `What are examples of EYLF Outcome ${outcome.n}?`,
      a: `With babies: ${outcome.ages.babies} With toddlers: ${outcome.ages.toddlers} With preschoolers: ${outcome.ages.preschoolers}`,
    },
    {
      q: `How do I link a learning story to Outcome ${outcome.n}?`,
      a: `Name the outcome, or the sub-outcome when one fits closely, then say in one sentence what the child did that shows it. Link only when the moment genuinely shows the learning; one or two strong links say more to a family than five weak ones.`,
    },
  ];

  return (
    <GuidePage>
      <GuideHero
        kicker={`EYLF V2.0 · Learning Outcome ${outcome.n} of 5`}
        updated="6 October 2026"
        title={<>Outcome {outcome.n}: {outcome.title}</>}
        answer={
          <>
            <p>{outcome.plain} The framework breaks it into {outcome.subs.length} sub-outcomes:</p>
            <ul className="mt-3 list-disc space-y-1 pl-6 text-ink-900">
              {outcome.subs.map((sub) => <li key={sub.code}><span className="font-bold tabular-nums text-clay-700">{sub.code}</span> {sub.text}</li>)}
            </ul>
          </>
        }
      />

      <GuideSection id="sub-outcomes" kicker={`Outcome ${outcome.n}`} title="Each sub-outcome, and what it can look like">
        <p>The left column is the framework&apos;s own wording. The right column is StoryLoop&apos;s everyday example, not framework text.</p>
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
      </GuideSection>

      <GuideSection id="ages" tone="white" kicker="By age" title={`Outcome ${outcome.n} with babies, toddlers and preschoolers`}>
        <p><strong>Babies.</strong> {outcome.ages.babies}</p>
        <p><strong>Toddlers.</strong> {outcome.ages.toddlers}</p>
        <p><strong>Preschoolers.</strong> {outcome.ages.preschoolers}</p>
        <p className="text-sm text-ink-500">These are StoryLoop&apos;s examples of what the learning can look like, not a checklist. Every child shows it in their own way and time.</p>
      </GuideSection>

      {real && (
        <GuideSection id="real-example" kicker="From a real draft" title={`How a real learning story linked Outcome ${outcome.n}`}>
          <p>The note an educator typed:</p>
          <blockquote className="rounded-3xl border border-clay-200 bg-cream-50 p-5 font-mono text-[15px] leading-relaxed text-ink-800">{real.example.note}</blockquote>
          <p>The curriculum link StoryLoop wrote in the draft, unedited:</p>
          <blockquote className="story-safe rounded-3xl border border-clay-100 bg-paper p-5 font-display text-lg leading-relaxed text-ink-800">{real.line}</blockquote>
          <p>
            It names the outcome, then says in one sentence what the child did that shows it.{" "}
            <Link href={`/examples#${real.example.slug}`} className="font-semibold text-clay-700 underline">Read the full draft</Link>.
          </p>
        </GuideSection>
      )}

      <GuideProof framework="AU" />

      <GuideSection id="faq" title="Questions educators ask">
        <GuideFaq items={faqs} />
      </GuideSection>

      <GuideSection id="other-outcomes" tone="cream" kicker="EYLF V2.0" title="The other four learning outcomes">
        <ul className="space-y-2">
          {others.map((other) => (
            <li key={other.n}>
              <Link href={`/eylf-learning-outcomes/${other.slug}`} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4">
                Outcome {other.n}: {other.title}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/eylf-learning-outcomes" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4">All five outcomes and 20 sub-outcomes on one page</Link>
          </li>
        </ul>
      </GuideSection>

      <GuideSources sources={[EYLF_SOURCE]} />
      <GuideCta heading={`Drafts that link Outcome ${outcome.n} from your own notes`} />
      <RelatedGuides links={[RELATED.eylf, RELATED.eylfV2, RELATED.eylfPrinciples, RELATED.template, RELATED.examples, RELATED.whatIs]} />
    </GuidePage>
  );
}
