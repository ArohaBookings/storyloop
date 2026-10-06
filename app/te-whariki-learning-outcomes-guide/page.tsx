import type { Metadata } from "next";
import Link from "next/link";
import GuideProof from "@/components/marketing/GuideProof";
import { GuideCta, GuideFaq, GuideHero, GuidePage, GuideSection, GuideSources, RELATED, RelatedGuides } from "@/components/marketing/Guide";
import { OUTCOMES_LEAD, TE_WHARIKI_SOURCES, TE_WHARIKI_STRANDS, realExampleForStrand } from "@/lib/te-whariki-strands";

const PAGE_URL = "https://storyloop.space/te-whariki-learning-outcomes-guide";
const TITLE = "Te Whāriki Learning Outcomes: All 20, by Strand, With Examples";
const DESCRIPTION =
  "All 20 Te Whāriki learning outcomes in the curriculum's own words, in English and te reo Māori, by strand, with how to link a learning story honestly.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: PAGE_URL, type: "article" },
};

// A strand link exactly as a real New Zealand draft wrote it (lib/real-examples.ts).
const LINK_EXAMPLE = realExampleForStrand(TE_WHARIKI_STRANDS[4]);

const TOTAL_GOALS = TE_WHARIKI_STRANDS.reduce((sum, strand) => sum + strand.goals.length, 0);
const TOTAL_OUTCOMES = TE_WHARIKI_STRANDS.reduce((sum, strand) => sum + strand.outcomes.length, 0);

const FAQS = [
  {
    q: "How many learning outcomes are in Te Whāriki?",
    a: `${TOTAL_OUTCOMES}, spread across the five strands: ${TE_WHARIKI_STRANDS.map((strand) => `${strand.outcomes.length} in ${strand.maori} | ${strand.english}`).join(", ")}. The strands also have ${TOTAL_GOALS} goals between them.`,
  },
  {
    q: "What is the difference between a goal and a learning outcome?",
    a: "Te Whāriki says the goals describe characteristics of ECE environments and pedagogies that are conducive to learning and development, and that the goals are for kaiako. The learning outcomes are broad statements of the knowledge, skills, attitudes and dispositions that children develop over time. Goals describe what kaiako provide; learning outcomes describe what children become increasingly capable of.",
  },
  {
    q: "Are Exploration and Communication learning outcomes?",
    a: "No, they are the English names of two strands: Mana aotūroa | Exploration and Mana reo | Communication. Each strand contains several learning outcomes. Exploration has four, Communication has six.",
  },
  {
    q: "Should a learning story link to every outcome it could fit?",
    a: "No. Link the one or two the moment genuinely shows, and say in a sentence what the child did that shows it. One honest link tells whānau more than five loose ones, and it is what makes the story useful assessment.",
  },
  {
    q: "Where does Kōwhiti Whakapae fit?",
    a: "Kōwhiti Whakapae is a Ministry of Education resource that supports planning, formative assessment and teaching practice within Te Whāriki, in social and emotional learning, oral language and literacy, and maths. It works alongside the learning outcomes; it does not replace them.",
  },
];

export default function TeWharikiOutcomesPage() {
  return (
    <GuidePage>
      <GuideHero
        kicker="Te Whāriki · Aotearoa New Zealand"
        updated="6 October 2026"
        title={<>Te Whāriki learning outcomes, <span className="italic text-clay-700">all {TOTAL_OUTCOMES} by strand</span></>}
        answer={
          <>
            <p>Te Whāriki (2017) has five strands, each with goals for kaiako and learning outcomes for children, {TOTAL_OUTCOMES} learning outcomes in all:</p>
            <ol className="mt-3 list-decimal space-y-1 pl-6 font-semibold text-ink-900">
              {TE_WHARIKI_STRANDS.map((strand) => (
                <li key={strand.slug}>
                  <a href={`#${strand.slug}`} className="underline decoration-clay-300 underline-offset-4 hover:text-clay-800">{strand.maori} | {strand.english}</a>
                  <span className="font-normal text-ink-600">, {strand.outcomes.length} outcomes</span>
                </li>
              ))}
            </ol>
            <p className="mt-3">Each is listed below in the curriculum&apos;s own words, in English and te reo Māori, with a page for every strand.</p>
          </>
        }
      />

      <GuideProof framework="NZ" />

      {TE_WHARIKI_STRANDS.map((strand, index) => (
        <GuideSection key={strand.slug} id={strand.slug} tone={index % 2 ? "white" : "plain"} kicker={`Strand ${strand.n}`} title={<>{strand.maori}{"\u00a0"}| <span className="italic text-clay-700">{strand.english}</span></>}>
          <p className="text-lg">{strand.statementEn}. {strand.plain}</p>
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
          <p><strong>In everyday play:</strong> {strand.looks} <span className="text-sm text-ink-500">(StoryLoop&apos;s examples, not curriculum text.)</span></p>
          <p>
            <Link href={`/${strand.slug}`} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4">
              {strand.maori} | {strand.english} in depth: its {strand.goals.length} goals and what it looks like in play
            </Link>
          </p>
        </GuideSection>
      ))}

      <GuideSection id="linking" tone="cream" kicker="In a learning story" title="Linking a story to the outcomes honestly">
        <p>
          A curriculum link is a claim: this moment shows this learning. Start with what the child actually did or said, then
          name the strand, and the learning outcome when one fits closely, and say in a sentence why. For example, from a real
          StoryLoop draft:
        </p>
        {LINK_EXAMPLE && (
          <blockquote className="story-safe rounded-3xl border border-clay-100 bg-paper p-5 font-display text-lg leading-relaxed text-ink-800">
            {LINK_EXAMPLE.paragraph}
          </blockquote>
        )}
        <p>
          Assessment is useful when it helps kaiako respond, so the link should lead somewhere: revisiting an interest,
          changing resources, inviting whānau knowledge, or noticing how a working theory develops.{" "}
          <Link href="/examples" className="font-semibold text-clay-700 underline">Read 12 real drafts</Link> to see links like this in full stories.
        </p>
      </GuideSection>

      <GuideSection id="faq" title="Questions kaiako ask">
        <GuideFaq items={FAQS} />
      </GuideSection>

      <GuideSources
        sources={[
          ...TE_WHARIKI_SOURCES,
          { label: "Te Whāriki Online: Kōwhiti Whakapae", url: "https://tewhariki.tahurangi.education.govt.nz/k-whiti-whakapae-strengthening-progress-through-practice/5637184340.p" },
          { label: "Education Review Office: Te Ara Poutama indicators of quality", url: "https://www.ero.govt.nz/how-ero-reviews/early-childhood-services/akarangi-quality-evaluation/te-ara-poutama-indicators-of-quality-for-early-childhood-education-what-matters" },
        ]}
      />
      <GuideCta heading="Drafts with honest Te Whāriki links, from your own notes" />
      <RelatedGuides links={[RELATED.teWhPrinciples, RELATED.teWhPdf, RELATED.template, RELATED.whatIs, RELATED.examples, RELATED.observation]} />
    </GuidePage>
  );
}
