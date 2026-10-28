import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { recoverMangledPath } from "@/lib/mangled-paths";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Pricing from "@/components/landing/Pricing";
import FoundingCentreOffer from "@/components/centre/FoundingCentreOffer";
import PageTracker from "@/components/analytics/PageTracker";
import GuideProof from "@/components/marketing/GuideProof";
import InternationalTry from "@/components/marketing/InternationalTry";
import TransitionDemo from "@/components/marketing/TransitionDemo";
import type { TransitionFramework, TransitionMode } from "@/lib/ai/transition-draft";
import PrintableCard from "@/components/marketing/PrintableCard";
import { RelatedGuides } from "@/components/marketing/Guide";
import { SLUG_PRINTABLES, relatedFor } from "@/components/marketing/guide-links";
import { INTERNATIONAL_SLUG_FRAMEWORK } from "@/lib/seo-pages-international";

// Guides a director reads. They get the founding-centre offer under the hero
// and a primary button that starts a centre's free month, not an individual
// free account.
const CENTRE_SLUGS = new Set([
  "for-centres",
  "learning-story-software-cost-for-centres",
  "early-childhood-centre-roi-dashboard",
  "assessment-and-rating-evidence",
  "room-planning-brief-early-childhood",
  "acecqa-documentation-guidance",
  "nqs-standard-1-3-assessment-and-planning",
  "ero-early-childhood-regulation-2026",
]);
// Every guide shows a real note and the real draft written from it, right under
// the hero (see components/marketing/GuideProof). These pages are Australian, so
// they show the EYLF example; everything else shows the Te Whāriki one.
const AU_SLUGS = new Set([
  "australia-eylf-learning-stories",
  "eylf-learning-stories",
  "eylf-planning-cycle",
  "acecqa-documentation-guidance",
  "nqs-standard-1-3-assessment-and-planning",
  "assessment-and-rating-evidence",
  "eylf-principles-and-practices",
  "eylf-v2-changes",
  "tlds-examples",
  "summative-assessment-examples",
  "nsw-transition-to-school-statement",
  "qld-kindergarten-transition-statement",
  "transition-statement-consent-form",
]);
// Aotearoa-only guides: their "try your own note" draft is always Te Whāriki.
// Every other guide that is not in AU_SLUGS serves both countries, so the
// visitor's country picks the curriculum for their own draft.
const NZ_SLUGS = new Set([
  "nz-learning-stories",
  "te-whariki-learning-stories",
  "ero-early-childhood-regulation-2026",
  "te-whariki-principles",
  "te-whariki-pdf",
]);
// Term 4 guides whose readers came to finish one job: a TLDS, a transition
// statement or end-of-year summaries (19 Oct 2026). They get a no-signup draft
// of that job at the top (components/marketing/TransitionDemo), not only the
// learning-story demo further down, which was not what they came for.
const TRANSITION_DEMOS: Record<string, {
  framework: TransitionFramework;
  mode: TransitionMode;
  choices?: TransitionFramework[];
  button: string;
  heading: string;
  intro: string;
}> = {
  "tlds-examples": {
    framework: "VEYLDF",
    mode: "transition",
    button: "Draft your TLDS outcomes from your notes, no signup",
    heading: "Draft Section 1.1 from your own notes",
    intro: "Paste what you have documented about one child. StoryLoop drafts a strengths-based line for each of the five VEYLDF outcomes and an intentional teaching strategy the Prep teacher can use, from your notes. It is told to write only from what you give it and to leave an outcome for you when your notes show nothing.",
  },
  "transition-to-school-statement": {
    framework: "EYLF",
    mode: "transition",
    choices: ["VEYLDF", "EYLF", "QKLG", "TW"],
    button: "Draft a transition statement from your notes, no signup",
    heading: "Draft the outcomes from your own notes",
    intro: "Pick where you teach and paste what you have documented about one child. StoryLoop drafts what your notes show for each outcome and a strategy the school teacher can use, from your notes. It is told to write only from what you give it and to leave an outcome for you when your notes show nothing.",
  },
  "end-of-year-learning-summary": {
    framework: "EYLF",
    mode: "summary",
    choices: ["EYLF", "TW", "VEYLDF"],
    button: "Draft an end-of-year summary from your notes, no signup",
    heading: "Draft a summary from your own notes",
    intro: "Paste a few moments you documented about one child this year. StoryLoop drafts what they show for each outcome and a next step, from your notes. It is told to write only from what you give it and to leave an outcome for you when your notes show nothing.",
  },
  "nsw-transition-to-school-statement": {
    framework: "EYLF",
    mode: "transition",
    button: "Draft the outcomes from your notes, no signup",
    heading: "Draft the learning and development section from your notes",
    intro: "Paste what you have documented about one child. StoryLoop drafts what your notes show for each of the five EYLF V2.0 outcomes and a strategy the Kindergarten teacher can use, from your notes. It is told to write only from what you give it and to leave an outcome for you when your notes show nothing.",
  },
  "qld-kindergarten-transition-statement": {
    framework: "QKLG",
    mode: "transition",
    button: "Draft the five areas from your notes, no signup",
    heading: "Draft the five QKLG areas from your notes",
    intro: "Paste what you have documented about one child. StoryLoop drafts what your notes show for identity, connectedness, wellbeing, active learning and communicating, with a suggestion for continuity for each, from your notes. It is told to write only from what you give it and to leave an area for you when your notes show nothing.",
  },
  "summative-assessment-examples": {
    framework: "EYLF",
    mode: "summary",
    choices: ["EYLF", "VEYLDF"],
    button: "Draft a summative assessment from your notes, no signup",
    heading: "Draft a summative assessment from your own notes",
    intro: "Paste three or four dated moments you documented about one child this term. StoryLoop drafts what they show for each outcome and a next step, from your notes. It is told to write only from what you give it and to leave an outcome for you when your notes show nothing.",
  },
  "transition-statement-consent-form": {
    framework: "EYLF",
    mode: "transition",
    choices: ["EYLF", "QKLG", "VEYLDF"],
    button: "Draft a transition statement from your notes, no signup",
    heading: "Consent sorted? Draft the outcomes from your notes",
    intro: "Pick where you teach and paste what you have documented about one child. StoryLoop drafts what your notes show for each outcome and a strategy the school teacher can use, from your notes. It is told to write only from what you give it and to leave an outcome for you when your notes show nothing.",
  },
};
// Pages with their own job: prices first, or a list of answers.
const NO_PROOF_SLUGS = new Set(["pricing", "faq"]);
// Regulation guides shared in educator Facebook groups. Directors read them
// too, but most visitors are educators: 79 landed on the ERO guide in a day
// and none clicked "Start your centre's free month". They get the individual
// free start first, with the centre option beside it.
const EDUCATOR_FIRST_SLUGS = new Set([
  "ero-early-childhood-regulation-2026",
  "acecqa-documentation-guidance",
  "nqs-standard-1-3-assessment-and-planning",
]);
import { DEDICATED_ROUTE_SLUGS, SEO_PAGES, SEO_PAGE_SLUGS } from "@/lib/seo-pages";
import { PenLine, ShieldCheck } from "lucide-react";

const SITE_URL = "https://storyloop.space";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SEO_PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = DEDICATED_ROUTE_SLUGS.has(slug) ? undefined : SEO_PAGES[slug];
  if (!page) return {};

  // Google cuts titles at about 60 characters and shows the site name on its
  // own line, so a long guide title drops the " | StoryLoop" tail rather than
  // losing its last words.
  const fitsWithBrand = `${page.title} | StoryLoop`.length <= 60;
  return {
    title: fitsWithBrand ? page.title : { absolute: page.title },
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `${SITE_URL}/${page.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
    },
  };
}

export default async function SeoPage({ params }: PageProps) {
  const { slug } = await params;
  const page = DEDICATED_ROUTE_SLUGS.has(slug) ? undefined : SEO_PAGES[slug];

  if (!page) {
    // A link that lost the space after it in a post (/examplesIf) goes to the page it meant.
    const meant = recoverMangledPath(slug);
    if (meant) permanentRedirect(meant);
    notFound();
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
  const articleJsonLd = page.reviewedAt
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: page.title,
        description: page.description,
        dateModified: page.reviewedAt,
        author: { "@type": "Person", "@id": `${SITE_URL}/#leo`, name: "Leo" },
        publisher: { "@type": "Organization", name: "StoryLoop", url: SITE_URL },
        mainEntityOfPage: `${SITE_URL}/${page.slug}`,
        inLanguage: INTERNATIONAL_SLUG_FRAMEWORK[page.slug] === "UK" ? "en-GB" : INTERNATIONAL_SLUG_FRAMEWORK[page.slug] === "IE" ? "en-IE" : "en-AU",
        isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
        citation: page.sources?.map((source) => source.url),
      }
    : null;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "StoryLoop", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: page.title, item: `${SITE_URL}/${page.slug}` },
    ],
  };

  // The page has a "try your own note" demo (GuideProof or InternationalTry, both at #try).
  const hasTry = !NO_PROOF_SLUGS.has(page.slug) || Boolean(INTERNATIONAL_SLUG_FRAMEWORK[page.slug]);

  return (
    <div className="min-h-screen bg-paper">
      {/* Every guide records its visit and where it came from. These pages had
          no tracker, so search and campaign visitors who landed on a guide were
          invisible, and their source was lost before they reached signup. */}
      <PageTracker />
      <Navbar />
      <main className="pt-28">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        {articleJsonLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
        <section className="pb-16 paper-texture">
          <div className="wide-shell">
            <p className="section-title mb-4">{page.kicker}</p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-ink-900 tracking-tight max-w-5xl">
              {page.heading}
            </h1>
            <p className="mt-6 text-lg text-ink-600 max-w-3xl leading-relaxed">{page.intro}</p>
            {/* Buttons straight under the intro, so they are on a phone's first
                screen. Below the tips they started at 932px on an 844px phone. */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              {TRANSITION_DEMOS[page.slug] ? (
                <>
                  <Link href="#transition-try" className="btn-primary justify-center" data-track="guide_hero_transition">
                    {TRANSITION_DEMOS[page.slug].button}
                  </Link>
                  <Link href="/signup" className="btn-secondary justify-center" data-track="guide_hero_start">
                    Start free
                  </Link>
                </>
              ) : EDUCATOR_FIRST_SLUGS.has(page.slug) ? (
                <>
                  <Link href={hasTry ? "#try" : "/signup"} className="btn-primary justify-center" data-track="guide_hero_try">
                    {hasTry ? "Turn a note into a learning story, no signup" : "Try it free on your own notes"}
                  </Link>
                  <Link href="#founding" className="btn-secondary justify-center">
                    Setting it up for a whole centre?
                  </Link>
                </>
              ) : CENTRE_SLUGS.has(page.slug) ? (
                <>
                  <Link href="/signup?plan=centre_starter" className="btn-primary justify-center">
                    Start your centre&apos;s free month
                  </Link>
                  <Link href="#founding" className="btn-secondary justify-center">
                    See the founding offer
                  </Link>
                </>
              ) : hasTry ? (
                <>
                  {/* Search visitors came for an answer, not a form. The demo
                      on this page lets them try a note with no signup, and
                      demo users convert far better than readers, yet it was
                      used 0 times in 111 guide visits (13 to 18 Oct 2026)
                      while the button sent people to a signup form. */}
                  <Link href="#try" className="btn-primary justify-center" data-track="guide_hero_try">
                    {/* Says what the demo makes: on a TLDS or transition guide
                        "try it" alone would promise a transition statement. */}
                    Turn a note into a learning story, no signup
                  </Link>
                  <Link href="/signup" className="btn-secondary justify-center" data-track="guide_hero_start">
                    Start free
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/signup" className="btn-primary justify-center">
                    Start free
                  </Link>
                  <Link href="/learning-story-generator" className="btn-secondary justify-center">
                    See how it works
                  </Link>
                </>
              )}
            </div>
            {/* The search title promises the printable, so it sits on the
                first screen, above the tips and the photo. */}
            {SLUG_PRINTABLES[page.slug] && (
              <div className={`mt-7 grid gap-4 ${SLUG_PRINTABLES[page.slug].length > 1 ? "max-w-4xl md:grid-cols-2" : "max-w-xl"}`}>
                {SLUG_PRINTABLES[page.slug].map((key) => (
                  <PrintableCard key={key} which={key} />
                ))}
              </div>
            )}
            <div className="mt-7 grid max-w-4xl gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-clay-200 bg-white/80 p-4 shadow-soft">
                <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-clay-700" />
                <p className="text-sm leading-relaxed text-ink-700">
                  Start with what actually happened: one action, quote, attempt, change, or question. A polished observation is never required.
                </p>
              </div>
              <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-sage-200 bg-sage-50/80 p-4 shadow-soft">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sage-700" />
                <p className="text-sm leading-relaxed text-ink-700">
                  StoryLoop drafts and checks. The educator reviews, edits, decides what is true, and chooses whether anything is shared.
                </p>
              </div>
            </div>
            {page.reviewedAt && (
              <p className="mt-4 text-xs font-semibold text-clay-700">
                Reviewed {new Date(`${page.reviewedAt}T00:00:00`).toLocaleDateString("en-NZ", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                · Written by Leo, who builds StoryLoop, in Ōtautahi Christchurch
              </p>
            )}
            {page.image && (
              <div className="relative mt-10 aspect-[16/9] max-w-6xl overflow-hidden rounded-3xl border border-clay-100 shadow-[0_30px_60px_-35px_rgba(74,52,34,0.55)] md:aspect-[21/9]">
                <Image src={page.image.src} alt={page.image.alt} fill priority sizes="(min-width: 1280px) 1152px, 100vw" className="object-cover" style={{ objectPosition: page.image.position ?? "center" }} />
              </div>
            )}
          </div>
        </section>

        {/* On /pricing the prices come FIRST. Measured on a 375px phone, the
            table previously began 2.03 screens down: someone who deliberately
            clicked "Pricing" had to scroll past two full screens of prose
            before seeing a number. The explanation is still below, for anyone
            who wants it after they know the price. */}
        {page.slug === "pricing" && <Pricing />}

        {TRANSITION_DEMOS[page.slug] && (
          <section id="transition-try" aria-labelledby="transition-try-title" className="scroll-mt-24 border-y border-clay-100 bg-white py-12 md:py-16">
            <div className="wide-shell">
              <div className="max-w-3xl">
                <p className="section-title mb-3">No signup · first name only · not saved to an account</p>
                <h2 id="transition-try-title" className="font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
                  {TRANSITION_DEMOS[page.slug].heading}
                </h2>
                <p className="mt-3 text-base leading-relaxed text-ink-600 md:text-lg">{TRANSITION_DEMOS[page.slug].intro}</p>
              </div>
              <div className="mt-8">
                <TransitionDemo
                  framework={TRANSITION_DEMOS[page.slug].framework}
                  mode={TRANSITION_DEMOS[page.slug].mode}
                  choices={TRANSITION_DEMOS[page.slug].choices}
                />
              </div>
            </div>
          </section>
        )}

        {/* England and Ireland guides: the demo in their own curriculum. */}
        {INTERNATIONAL_SLUG_FRAMEWORK[page.slug] && (
          <div className="wide-shell pb-10">
            <div className="max-w-xl">
              <PrintableCard which={INTERNATIONAL_SLUG_FRAMEWORK[page.slug] === "UK" ? "eyfs" : "aistear"} />
            </div>
          </div>
        )}
        {INTERNATIONAL_SLUG_FRAMEWORK[page.slug] && <InternationalTry framework={INTERNATIONAL_SLUG_FRAMEWORK[page.slug]} />}


        {!NO_PROOF_SLUGS.has(page.slug) && !INTERNATIONAL_SLUG_FRAMEWORK[page.slug] && (
          <GuideProof
            framework={AU_SLUGS.has(page.slug) ? "AU" : "NZ"}
            demo={AU_SLUGS.has(page.slug) ? "AU" : NZ_SLUGS.has(page.slug) ? "NZ" : "visitor"}
          />
        )}

        {CENTRE_SLUGS.has(page.slug) && <FoundingCentreOffer />}

        <section className="py-16">
          {/* Three across only when the count divides by three; four cards in
              a row of three left one stranded on its own. */}
          <div className={`wide-shell grid gap-5 ${page.sections.length % 3 === 0 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            {page.sections.map((section) => (
              <article key={section.title} className="card p-6">
                <h2 className="font-display text-xl font-bold text-ink-900 mb-3">{section.title}</h2>
                <p className="text-sm text-ink-600 leading-relaxed">{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        {page.deepDive?.length ? (
          <section className="border-y border-clay-100 bg-white py-16 md:py-20">
            <div className="reading-shell">
              <div className="space-y-12">
                {page.deepDive.map((block) => (
                  <div key={block.heading}>
                    <h2 className="font-display text-2xl font-bold text-ink-900 md:text-3xl">{block.heading}</h2>
                    <div className="mt-4 space-y-4 text-[17px] leading-relaxed text-ink-700">
                      {block.paragraphs.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {hasTry && page.deepDive?.length ? (
          // Someone who read to here is at their most interested.
          <section className="pb-4 pt-12">
            <div className="reading-shell">
              <div className="flex flex-col items-start gap-4 rounded-3xl border border-clay-200 bg-cream-50 p-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[15px] leading-relaxed text-ink-800">
                  <strong>Try it on a real note from your week.</strong> StoryLoop writes the learning story, usually in under a minute, with the child&apos;s words kept exactly. No signup.
                </p>
                <Link href="#try" className="btn-primary shrink-0 justify-center" data-track="guide_after_read_try">
                  Try a note
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {page.sources?.length ? (
          <section className="pb-16">
            <div className="reading-shell">
              <div className="rounded-3xl border border-clay-200 bg-white p-6">
                <p className="section-title mb-3">Official references</p>
                <p className="mb-4 text-sm text-ink-600">
                  These sources inform this guide. StoryLoop is independent and does not claim endorsement.
                </p>
                <ul className="space-y-2 text-sm">
                  {page.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900"
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        <section className="py-16 bg-cream-50 border-y border-clay-100">
          <div className="reading-shell">
            <div className="text-center mb-10">
              <p className="section-title mb-3">FAQ</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-ink-900">
                {CENTRE_SLUGS.has(page.slug) ? "Straight answers for directors." : "Straight answers for educators."}
              </h2>
            </div>
            <div className="space-y-3">
              {page.faqs.map((faq) => (
                <details key={faq.question} className="card p-5 group">
                  <summary className="font-semibold text-ink-900 text-sm list-none flex items-center justify-between gap-4 cursor-pointer">
                    {faq.question}
                    <span className="text-clay-500 text-xl flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-ink-600 leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        {/* England and Ireland guides keep their own pages as they are. */}
        {!INTERNATIONAL_SLUG_FRAMEWORK[page.slug] && <RelatedGuides links={relatedFor(page.slug)} />}
      </main>
      <Footer />
    </div>
  );
}
