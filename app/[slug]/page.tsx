import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Pricing from "@/components/landing/Pricing";
import { SEO_PAGES, SEO_PAGE_SLUGS } from "@/lib/seo-pages";

const SITE_URL = "https://storyloop.space";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SEO_PAGE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = SEO_PAGES[slug];
  if (!page) return {};

  return {
    title: page.title,
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
  const page = SEO_PAGES[slug];

  if (!page) {
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

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="pt-28">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <section className="pb-16 paper-texture">
          <div className="wide-shell">
            <p className="section-title mb-4">{page.kicker}</p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-ink-900 tracking-tight max-w-5xl">
              {page.heading}
            </h1>
            <p className="mt-6 text-lg text-ink-600 max-w-3xl leading-relaxed">{page.intro}</p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="btn-primary justify-center">
                Start free
              </Link>
              <Link href="/learning-story-generator" className="btn-secondary justify-center">
                See how it works
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="wide-shell grid md:grid-cols-3 gap-5">
            {page.sections.map((section) => (
              <article key={section.title} className="card p-6">
                <h2 className="font-display text-xl font-bold text-ink-900 mb-3">{section.title}</h2>
                <p className="text-sm text-ink-600 leading-relaxed">{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        {page.slug === "pricing" && <Pricing />}

        <section className="py-16 bg-cream-50 border-y border-clay-100">
          <div className="reading-shell">
            <div className="text-center mb-10">
              <p className="section-title mb-3">FAQ</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-ink-900">Straight answers for educators.</h2>
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
      </main>
      <Footer />
    </div>
  );
}
