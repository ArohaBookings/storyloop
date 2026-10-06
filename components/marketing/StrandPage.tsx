import type { Metadata } from "next";
import Link from "next/link";
import GuideProof from "@/components/marketing/GuideProof";
import { GuideCta, GuideFaq, GuideHero, GuidePage, GuideSection, GuideSources, RELATED, RelatedGuides } from "@/components/marketing/Guide";
import { OUTCOMES_LEAD, TE_WHARIKI_SOURCES, TE_WHARIKI_STRANDS, realExampleForStrand, strandBySlug } from "@/lib/te-whariki-strands";

export function strandMetadata(slug: string): Metadata {
  const strand = strandBySlug(slug);
  if (!strand) return {};
  const url = `https://storyloop.space/${strand.slug}`;
  const title = `${strand.maori} (${strand.english}): Meaning, Goals and Outcomes`;
  const description = `${strand.maori} | ${strand.english} in Te Whāriki: its ${strand.goals.length} goals and ${strand.outcomes.length} learning outcomes in the curriculum's own words, and what it looks like in play.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article" },
  };
}

export default function StrandPage({ slug }: { slug: string }) {
  const strand = strandBySlug(slug);
  if (!strand) return null;
  const real = realExampleForStrand(strand);
  const others = TE_WHARIKI_STRANDS.filter((other) => other.slug !== strand.slug);

  const faqs = [
    {
      q: `What does ${strand.maori} mean?`,
      a: `${strand.maori} | ${strand.english} is strand ${strand.n} of the five Te Whāriki strands. Te Whāriki describes it as: "${strand.english} | ${strand.statementEn}" and "${strand.maori} | ${strand.statementMi}". Each strand has an English and a Māori name; Te Whāriki notes that while closely related, different cultural connotations mean the two are not equivalents.`,
    },
    {
      q: `What are the learning outcomes for ${strand.maori} | ${strand.english}?`,
      a: `There are ${strand.outcomes.length}. ${OUTCOMES_LEAD} ${strand.outcomes.map((outcome) => `${outcome.en.charAt(0).toLowerCase()}${outcome.en.slice(1)} (${outcome.mi})`).join("; ")}.`,
    },
    {
      q: `What are the goals of ${strand.maori} | ${strand.english}?`,
      a: `${strand.goalsLead} ${strand.goals.map((goal) => `${goal.charAt(0).toLowerCase()}${goal.slice(1)}`).join("; ")}. The goals are for kaiako: they describe the environment and teaching that support this learning.`,
    },
    {
      q: `How do I link a learning story to ${strand.maori} | ${strand.english}?`,
      a: `Name the strand, and the learning outcome when one fits closely, then say in a sentence what the child did that shows it. Link only where the moment genuinely shows the learning; one honest link says more to whānau than five loose ones.`,
    },
  ];

  return (
    <GuidePage>
      <GuideHero
        kicker={`Te Whāriki · Strand ${strand.n} of 5`}
        updated="6 October 2026"
        title={<>{strand.maori}{"\u00a0"}| <span className="italic text-clay-700">{strand.english}</span></>}
        answer={
          <>
            <p><strong>{strand.english}</strong> | {strand.statementEn}.</p>
            <p className="mt-2"><strong>{strand.maori}</strong> | {strand.statementMi}.</p>
            <p className="mt-3">In plain words: {strand.plain.charAt(0).toLowerCase()}{strand.plain.slice(1)} It has {strand.goals.length} goals for kaiako and {strand.outcomes.length} learning outcomes.</p>
          </>
        }
      />

      <GuideSection id="outcomes" kicker="Learning outcomes" title={`The ${strand.outcomes.length} learning outcomes`}>
        <p>{OUTCOMES_LEAD}</p>
        <div className="overflow-x-auto rounded-3xl border border-clay-100 bg-paper">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-50 text-xs uppercase tracking-wider text-ink-500">
              <tr><th className="px-4 py-3" scope="col">Learning outcome</th><th className="hidden px-4 py-3 sm:table-cell" scope="col">Te reo Māori</th></tr>
            </thead>
            <tbody className="divide-y divide-clay-100">
              {strand.outcomes.map((outcome) => (
                <tr key={outcome.mi} className="align-top">
                  <th scope="row" className="px-4 py-3 font-normal text-ink-800">{outcome.en}<span className="mt-1 block italic text-ink-600 sm:hidden">{outcome.mi}</span></th>
                  <td className="hidden px-4 py-3 italic text-ink-600 sm:table-cell">{outcome.mi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-ink-500">Wording from Te Whāriki (2017), pages 24 and 25.</p>
      </GuideSection>

      <GuideSection id="goals" tone="white" kicker="Goals for kaiako" title="The goals">
        <p>{strand.goalsLead}</p>
        <ul className="list-disc space-y-1.5 pl-6">
          {strand.goals.map((goal) => <li key={goal}>{goal}</li>)}
        </ul>
        <p>The strand as a whole: <em>{strand.aim}</em></p>
      </GuideSection>

      <GuideSection id="in-play" kicker="In everyday play" title="What it can look like">
        <p>{strand.looks}</p>
        <p className="text-sm text-ink-500">StoryLoop&apos;s examples, not curriculum text. Every child shows this learning in their own way and time.</p>
      </GuideSection>

      {real && (
        <GuideSection id="real-example" tone="white" kicker="From a real draft" title="How a real learning story linked this strand">
          <p>The note a kaiako typed:</p>
          <blockquote className="rounded-3xl border border-clay-200 bg-cream-50 p-5 font-mono text-[15px] leading-relaxed text-ink-800">{real.example.note}</blockquote>
          <p>The link StoryLoop wrote in the draft, unedited:</p>
          <blockquote className="story-safe rounded-3xl border border-clay-100 bg-paper p-5 font-display text-lg leading-relaxed text-ink-800">{real.paragraph}</blockquote>
          <p>
            <Link href={`/examples#${real.example.slug}`} className="font-semibold text-clay-700 underline">Read the full draft</Link>.
          </p>
        </GuideSection>
      )}

      <GuideProof framework="NZ" />

      <GuideSection id="faq" title="Questions kaiako ask">
        <GuideFaq items={faqs} />
      </GuideSection>

      <GuideSection id="other-strands" tone="cream" kicker="Te Whāriki" title="The other four strands">
        <ul className="space-y-2">
          {others.map((other) => (
            <li key={other.slug}>
              <Link href={`/${other.slug}`} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4">
                {other.maori} | {other.english}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/te-whariki-learning-outcomes-guide" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4">All 20 learning outcomes on one page</Link>
          </li>
        </ul>
      </GuideSection>

      <GuideSources sources={TE_WHARIKI_SOURCES} />
      <GuideCta heading="Drafts with honest Te Whāriki links, from your own notes" />
      <RelatedGuides links={[RELATED.teWhariki, RELATED.teWhPrinciples, RELATED.teWhPdf, RELATED.template, RELATED.examples, RELATED.whatIs]} />
    </GuidePage>
  );
}
