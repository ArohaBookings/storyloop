import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageTracker from "@/components/analytics/PageTracker";
import { getPublishedPost, listPublishedPosts, renderMarkdown, readingMinutes, plainSummary } from "@/lib/blog";

export const revalidate = 300;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Not found | StoryLoop" };

  const title = post.seo_title || `${post.title} | StoryLoop`;
  const description = plainSummary(post);
  const url = `https://storyloop.space/blog/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

function formatDate(value: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const others = (await listPublishedPosts(4)).filter((p) => p.slug !== post.slug).slice(0, 3);
  const url = `https://storyloop.space/blog/${post.slug}`;

  // Article schema so search engines and answer engines can attribute and cite
  // this correctly, which is what actually earns a mention in an AI answer.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: plainSummary(post),
    datePublished: post.published_at,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: post.author_name, url: "https://storyloop.space" },
    publisher: {
      "@type": "Organization",
      name: "StoryLoop",
      url: "https://storyloop.space",
      logo: { "@type": "ImageObject", url: "https://storyloop.space/logo.svg" },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: post.tags.join(", "),
    inLanguage: post.region === "AU" ? "en-AU" : "en-NZ",
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageTracker />
      <Navbar />
      <main>
        <article className="py-14 md:py-20">
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
            <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
              <ArrowLeft className="h-3.5 w-3.5" /> All guides
            </Link>

            <div className="mt-6 mb-8">
              {post.cover_emoji && <p className="mb-3 text-4xl" aria-hidden="true">{post.cover_emoji}</p>}
              <h1 className="font-display text-3xl font-bold leading-tight text-ink-900 md:text-5xl">{post.title}</h1>
              {post.excerpt && <p className="mt-4 text-lg leading-relaxed text-ink-600">{post.excerpt}</p>}
              <p className="mt-4 text-xs text-ink-500">
                {formatDate(post.published_at)} · {readingMinutes(post.body_markdown)} min read · {post.author_name}
              </p>
            </div>

            <div
              className="story-prose max-w-none text-ink-700"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body_markdown) }}
            />

            <div className="mt-12 rounded-3xl border border-clay-200 bg-gradient-to-br from-cream-50 via-white to-sage-50 p-6 text-center md:p-8">
              <h2 className="font-display text-2xl font-bold text-ink-900">Stop starting from a blank page.</h2>
              <p className="mx-auto mt-2 max-w-lg text-sm text-ink-600">
                Turn a rough note or a voice memo into an editable learning story draft with Te Whāriki or EYLF
                links already mapped. You review and edit every word.
              </p>
              <Link href="/signup" className="btn-primary mt-5">
                <Sparkles className="h-4 w-4" /> Try 3 stories free
              </Link>
              <p className="mt-2 text-[11px] text-ink-500">No credit card required.</p>
            </div>

            {others.length > 0 && (
              <div className="mt-14">
                <p className="section-title mb-4">Keep reading</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {others.map((other) => (
                    <Link key={other.id} href={`/blog/${other.slug}`} className="card p-4 transition-all hover:border-clay-300">
                      <p className="mb-1 text-xl" aria-hidden="true">{other.cover_emoji ?? "📝"}</p>
                      <p className="font-display text-sm font-bold leading-snug text-ink-900">{other.title}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
