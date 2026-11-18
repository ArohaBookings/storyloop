import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageTracker from "@/components/analytics/PageTracker";
import StoryDemo from "@/components/landing/StoryDemo";
import PolicyGenerator from "@/components/policy/PolicyGenerator";
import OfferText from "@/components/offer/OfferText";
import AnswerList from "@/components/buyer/AnswerList";
import CentreStart from "@/components/buyer/CentreStart";
import CopyMessage from "@/components/buyer/CopyMessage";
import ProofChip from "@/components/buyer/ProofChip";
import VisitorProof from "@/components/buyer/VisitorProof";
import { answerBlocks } from "@/lib/answer-blocks";
import { BUYER_PAGES, type BuyerPage as BuyerPageDefinition, type BuyerSlug } from "@/lib/buyer-pages";
import { draftSection, heroNoteProof, outcomeNoteProof, realExample } from "@/lib/buyer-proof";
import { fillOfferText } from "@/lib/offer-wording";
import { ORGANIZATION_REF } from "@/lib/site-identity";

const SITE_URL = "https://storyloop.space";

/** The leader's message to her team (CopyMessage fills {greeting}). */
export const LEADER_MESSAGE =
  "{greeting} team, for this week's story check: could you write one learning story from a quick note in StoryLoop (free for 3 a month) and send it to me with Send this story to your leader? I'll read it with your note beside it. storyloop.space/for-educators?utm_source=leader_checklist";

/**
 * The parent's message to her centre. It links /for-centres with a campaign
 * tag, not ?ref=: ref is the referral code a signup credits, and "family"
 * would be read as one.
 */
export const PARENT_MESSAGE =
  "{greeting}, I love getting learning stories about [your child's name]. I came across StoryLoop, which helps teachers write learning stories from a quick note, during the day. It is free for teachers to try, and there is a centre plan. Might it help the team? storyloop.space/for-centres?utm_source=family&utm_medium=ask_your_centre";

export function buyerMetadata(slug: BuyerSlug): Metadata {
  const page = BUYER_PAGES[slug];
  // The same rule as the guides: the brand only when the whole title still fits Google's ~60 characters.
  const fitsWithBrand = `${page.title} | StoryLoop`.length <= 60;
  return {
    title: fitsWithBrand ? page.title : { absolute: page.title },
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: { title: page.title, description: page.description, url: `${SITE_URL}/${page.slug}`, type: "article" },
    twitter: { card: "summary_large_image", title: page.title, description: page.description },
  };
}

function structuredData(page: BuyerPageDefinition) {
  const questions = [
    ...answerBlocks(page.answers).map((block) => ({ q: block.question, a: block.answer })),
    ...page.faqs,
  ];
  const url = `${SITE_URL}/${page.slug}`;
  return [
    questions.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: questions.map((item) => ({
            "@type": "Question",
            name: item.q,
            // Built ahead of time, so the wording that is true on every date.
            acceptedAnswer: { "@type": "Answer", text: fillOfferText(item.a, new Date(), { evergreen: true }) },
          })),
        }
      : null,
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: page.title,
      description: page.description,
      dateModified: page.reviewedAt,
      author: { "@type": "Person", "@id": `${SITE_URL}/#leo`, name: "Leo" },
      publisher: ORGANIZATION_REF,
      mainEntityOfPage: url,
      inLanguage: page.slug.includes("nz") ? "en-NZ" : "en-AU",
      isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
      ...(page.sources?.length ? { citation: page.sources.map((source) => source.url) } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "StoryLoop", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: page.title, item: url },
      ],
    },
  ].filter(Boolean);
}

/** The first screen's action, the thing the page exists for. */
function Action({ page }: { page: BuyerPageDefinition }) {
  const action = page.action;
  switch (action.kind) {
    case "note":
      return (
        <div id="try" className="min-w-0 scroll-mt-24" data-testid="buyer-action">
          <StoryDemo compact surface="guide" framework={action.framework} />
          <p className="mt-2 text-xs leading-relaxed text-ink-500">
            Free for 3 stories a month, no card. Demo notes are not saved to any account and are never used to train AI.
          </p>
        </div>
      );
    case "centre":
      return (
        <div className="min-w-0" data-testid="buyer-action">
          <CentreStart secondary={page.example ? { href: "#real-story", label: "Or see it in a real story first" } : undefined} />
        </div>
      );
    case "leader_ask":
      return (
        <div className="min-w-0 rounded-3xl border border-clay-200 bg-white p-4 shadow-soft sm:p-5" data-testid="buyer-action">
          <p className="text-sm leading-relaxed text-ink-700">
            With StoryLoop she taps <strong className="text-ink-900">Send this story to your leader</strong>. You see her note beside the story and answer in
            about two minutes. You do not need an account.
          </p>
          <div className="mt-3">
            <CopyMessage
              message={LEADER_MESSAGE}
              page={`/${page.slug}`}
              action="leader_ask"
              copyLabel="Copy a message for your team"
              hint="Paste it into your team chat or email. Nothing is sent from this page."
            />
          </div>
        </div>
      );
    case "parent_ask":
      return (
        <div className="min-w-0" data-testid="buyer-action">
          <CopyMessage
            message={PARENT_MESSAGE}
            page={`/${page.slug}`}
            action="ask_centre"
            copyLabel="Copy the message"
            editable
            emailSubject="Learning stories"
            hint="Change anything you like. Nothing you type here is sent to StoryLoop."
          />
        </div>
      );
    case "policy":
      return (
        <div className="min-w-0" data-testid="buyer-action">
          <PolicyGenerator />
        </div>
      );
  }
}

function Proof({ page }: { page: BuyerPageDefinition }) {
  if (page.action.kind !== "note") return null;
  if (page.action.proof === "visitor") return <VisitorProof au={heroNoteProof("AU")} nz={heroNoteProof("NZ")} />;
  if (page.slug === "ai-childcare-observations") {
    const proof = outcomeNoteProof();
    return proof ? <ProofChip proof={proof} wroteLabel="The EYLF link StoryLoop wrote" /> : null;
  }
  return <ProofChip proof={heroNoteProof(page.action.proof)} />;
}

function RealStory({ page }: { page: BuyerPageDefinition }) {
  const example = page.example ? realExample(page.example.slug) : null;
  if (!page.example || !example) return null;
  return (
    <section id="real-story" aria-labelledby="real-story-title" className="scroll-mt-24 py-12 md:py-16 print:hidden">
      <div className="reading-shell">
        <h2 id="real-story-title" className="font-display text-2xl font-bold text-ink-900 md:text-3xl">{page.example.heading}</h2>
        <figure className="mt-5 rounded-3xl border border-sage-200 bg-paper p-5 md:p-6" data-testid="buyer-real-story">
          <p className="font-display text-xl font-bold text-ink-900">{example.title}</p>
          <div className="mt-3 space-y-4 text-base leading-relaxed text-ink-700">
            {page.example.headings.map((heading) => (
              <div key={heading}>
                <p className="font-semibold text-ink-900">{heading}</p>
                {draftSection(example.story, heading).map((paragraph) => (
                  <p key={paragraph} className="mt-1">{paragraph}</p>
                ))}
              </div>
            ))}
          </div>
          <figcaption className="mt-4 border-t border-sage-100 pt-3 text-sm leading-relaxed text-ink-600">
            {page.example.caption}{" "}
            <Link href={`/examples#${example.slug}`} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2" data-track="buyer_real_story_full">
              Read the whole draft
            </Link>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/**
 * A page for one of the three buyers (lib/buyer-pages.ts). The first screen
 * is the H1 and the page's one action; on a 393 by 673 phone the action is
 * inside it (tests/buyer-pages.test.ts and the t84 end-to-end suite check).
 */
export default function BuyerPage({ slug }: { slug: BuyerSlug }) {
  const page = BUYER_PAGES[slug];
  const policy = page.action.kind === "policy";
  const note = page.action.kind === "note";
  const blocks = answerBlocks(page.answers);
  // What prints: the H1 and these sections (a leader printing her checklist), or else only the action.
  const printable = new Set(page.printSections ?? []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper print:bg-white">
      {structuredData(page).map((data, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      ))}
      <div className="print:hidden">
        <PageTracker />
        <Navbar />
      </div>
      <main>
        <section className="paper-texture pb-10 pt-[72px] sm:pb-14 sm:pt-28 print:p-0" data-testid="buyer-hero">
          <div className="wide-shell">
            <div
              className={
                policy
                  ? ""
                  : note
                    ? "grid min-w-0 gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-12"
                    : "grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-12"
              }
            >
              <div className={`min-w-0 ${printable.size ? "" : "print:hidden"}`}>
                <p className="section-title mb-1.5 sm:mb-3 print:hidden">{page.kicker}</p>
                <h1 className="max-w-4xl font-display text-[1.65rem] font-bold leading-[1.12] tracking-tight text-ink-900 text-balance sm:text-5xl lg:text-[3.25rem]">
                  {page.h1}
                </h1>
                {page.lead && <p className="mt-2.5 max-w-2xl text-base leading-relaxed text-ink-700 sm:mt-4 sm:text-lg print:hidden">{page.lead}</p>}
                {note && (
                  <div className="mt-3 max-w-xl sm:mt-5">
                    <Proof page={page} />
                  </div>
                )}
              </div>
              <div className={`${policy ? "mt-4 sm:mt-8" : "min-w-0"} ${printable.size ? "print:hidden" : ""}`}>
                <Action page={page} />
              </div>
            </div>
          </div>
        </section>

        <section className={`py-12 md:py-16 ${printable.size ? "print:py-2" : "print:hidden"}`}>
          <div className="reading-shell space-y-10 print:space-y-5">
            {page.sections.map((section) => (
              <div key={section.id} id={section.id} className={`scroll-mt-24 ${printable.has(section.id) ? "" : "print:hidden"}`}>
                <h2 className="font-display text-2xl font-bold text-ink-900 md:text-3xl">{section.heading}</h2>
                {section.list && (
                  <ul className="mt-4 space-y-2.5">
                    {section.list.map((item) => (
                      <li key={item} className="flex gap-3 text-base leading-relaxed text-ink-700">
                        <Check className="mt-1 h-4 w-4 flex-none text-sage-600" aria-hidden="true" />
                        <span className="min-w-0"><OfferText text={item} /></span>
                      </li>
                    ))}
                  </ul>
                )}
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-base leading-relaxed text-ink-700 md:text-[17px]">
                    <OfferText text={paragraph} />
                  </p>
                ))}
                {section.link && (
                  <Link href={section.link.href} className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900 print:hidden" data-track={`buyer_link_${section.id.replace(/-/g, "_")}`}>
                    {section.link.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>

        <RealStory page={page} />
        <AnswerList blocks={blocks} />

        {page.faqs.length > 0 && (
          <section className="bg-cream-50 py-12 md:py-16 print:hidden">
            <div className="reading-shell">
              <h2 className="font-display text-2xl font-bold text-ink-900 md:text-3xl">Questions</h2>
              <div className="mt-6 space-y-3">
                {page.faqs.map((faq) => (
                  <details key={faq.q} className="card group p-5">
                    <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-ink-900">
                      {faq.q}
                      <span className="flex-shrink-0 text-xl text-clay-500 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                    </summary>
                    <p className="mt-3 text-base leading-relaxed text-ink-700"><OfferText text={faq.a} /></p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {page.sources?.length ? (
          <section className="py-10 print:hidden">
            <div className="reading-shell">
              <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">Sources</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {page.sources.map((source) => (
                  <li key={source.url} className="min-w-0 break-words">
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900">
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-500">
                Checked{" "}
                {new Date(`${page.reviewedAt}T00:00:00`).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" })}. StoryLoop is
                independent and does not claim endorsement.
              </p>
            </div>
          </section>
        ) : null}

        <section className="border-t border-clay-100 bg-cream-50/60 py-12 print:hidden">
          <div className="wide-shell">
            <h2 className="font-display text-2xl font-bold text-ink-900">Keep reading</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {page.related.map((link) => (
                <li key={link.href} className="min-w-0">
                  <Link href={link.href} className="group flex h-full flex-col rounded-3xl border border-clay-100 bg-paper p-5 transition-colors hover:border-clay-300">
                    <span className="font-display text-lg font-bold text-ink-900 group-hover:text-clay-800">{link.title}</span>
                    <span className="mt-1.5 text-sm leading-relaxed text-ink-600">{link.body}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
