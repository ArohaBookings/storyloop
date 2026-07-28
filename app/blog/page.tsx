import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageTracker from "@/components/analytics/PageTracker";
import { listPublishedPosts, readingMinutes, BLOG_CATEGORIES } from "@/lib/blog";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Learning story guides for ECE educators | StoryLoop",
  description:
    "Practical guides on writing learning stories, Te Whāriki and EYLF links, observation technique, and documentation that does not eat your evenings.",
  alternates: { canonical: "https://storyloop.space/blog" },
  openGraph: {
    title: "Learning story guides for ECE educators",
    description: "Practical, plain-English guides to early childhood documentation in New Zealand and Australia.",
    url: "https://storyloop.space/blog",
    type: "website",
  },
};

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogIndex() {
  const posts = await listPublishedPosts();

  // Blog schema helps search and answer engines understand this is an ongoing
  // publication about a specific subject, not a marketing page.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "StoryLoop guides for early childhood educators",
    url: "https://storyloop.space/blog",
    description:
      "Practical guides on learning stories, Te Whāriki and EYLF, observation technique, and early childhood documentation.",
    publisher: { "@type": "Organization", name: "StoryLoop", url: "https://storyloop.space" },
    blogPost: posts.slice(0, 20).map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: `https://storyloop.space/blog/${post.slug}`,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      author: { "@type": "Organization", name: post.author_name },
    })),
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageTracker />
      <Navbar />
      <main>
        <section className="border-b border-clay-100 bg-cream-50 py-16 md:py-20">
          <div className="wide-shell text-center">
            <p className="section-title mb-3">StoryLoop guides</p>
            <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold text-ink-900 md:text-5xl">
              Documentation advice written for the floor, not the office.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-ink-600">
              Plain-English guides on learning stories, Te Whāriki and EYLF links, observation technique, and
              getting your evenings back. Written for kaiako and educators in Aotearoa and Australia.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="wide-shell">
            {posts.length === 0 ? (
              <div className="card mx-auto max-w-xl p-8 text-center">
                <p className="font-display text-xl font-bold text-ink-900">First guides are on the way.</p>
                <p className="mt-2 text-sm text-ink-600">
                  We are writing these with educators rather than about them. If there is something you wish
                  someone would explain properly, tell us and we will write it.
                </p>
                <Link href="/signup" className="btn-primary mt-6">Start free</Link>
              </div>
            ) : (
              <div className="grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => {
                  const label = BLOG_CATEGORIES.find((c) => c.key === post.category)?.label ?? "Article";
                  return (
                    <Link
                      key={post.id}
                      href={`/blog/${post.slug}`}
                      className="card group flex min-w-0 flex-col p-6 transition-all hover:-translate-y-1 hover:border-clay-300 hover:shadow-clay"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <span className="text-2xl" aria-hidden="true">{post.cover_emoji ?? "📝"}</span>
                        <span className="rounded-full border border-clay-200 bg-cream-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-clay-700">
                          {label}
                        </span>
                        {post.region !== "both" && (
                          <span className="rounded-full border border-sage-200 bg-sage-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sage-700">
                            {post.region}
                          </span>
                        )}
                      </div>
                      <h2 className="font-display text-lg font-bold leading-snug text-ink-900 group-hover:text-clay-800">
                        {post.title}
                      </h2>
                      {post.excerpt && <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{post.excerpt}</p>}
                      <p className="mt-4 text-[11px] text-ink-500">
                        {formatDate(post.published_at)} · {readingMinutes(post.body_markdown)} min read
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
