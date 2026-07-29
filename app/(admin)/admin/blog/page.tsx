"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { BLOG_CATEGORIES, slugify } from "@/lib/blog";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_markdown: string;
  category: string;
  region: string;
  tags: string[];
  cover_emoji: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published: boolean;
  published_at: string | null;
  updated_at: string;
};

const BLANK = {
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  body_markdown: "",
  category: "guide",
  region: "both",
  cover_emoji: "📝",
  seo_title: "",
  seo_description: "",
  tags: "",
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ ...BLANK });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog");
      const data = await res.json();
      if (res.ok) setPosts(data.posts ?? []);
      else setError(data.error ?? "Could not load posts");
    } catch {
      setError("Could not load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const edit = (post: Post) => {
    setForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      body_markdown: post.body_markdown,
      category: post.category,
      region: post.region,
      cover_emoji: post.cover_emoji ?? "📝",
      seo_title: post.seo_title ?? "",
      seo_description: post.seo_description ?? "",
      tags: (post.tags ?? []).join(", "),
    });
    setMessage(""); setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (published: boolean) => {
    setSaving(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/admin/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          id: form.id || undefined,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
          published,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      setMessage(published ? "Published. It is live on /blog now." : "Draft saved.");
      setForm((f) => ({ ...f, id: data.post.id, slug: data.post.slug }));
      await load();
    } catch {
      setError("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/blog?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (form.id === id) setForm({ ...BLANK });
    await load();
  };

  const field = "w-full rounded-xl border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white placeholder-ink-400 focus:border-clay-400 focus:outline-none";

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">Write a guide</h1>
          <Link href="/blog" target="_blank" className="text-xs text-clay-400 hover:text-clay-300">View public blog →</Link>
        </div>
        <p className="mt-1 text-sm text-ink-300">
          Every published guide is a page Google and AI answer engines can find and cite. Write the thing educators
          keep asking about.
        </p>

        <section className="mt-6 rounded-2xl border border-ink-700 bg-ink-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-300">
              {form.id ? "Editing" : "New post"}
            </h2>
            {form.id && (
              <button type="button" onClick={() => setForm({ ...BLANK })} className="inline-flex items-center gap-1.5 text-xs text-ink-300 hover:text-white">
                <Plus className="h-3.5 w-3.5" /> Start a new one
              </button>
            )}
          </div>

          <div className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-[6rem_1fr]">
              <input className={field} value={form.cover_emoji} onChange={(e) => setForm({ ...form, cover_emoji: e.target.value })} placeholder="📝" aria-label="Cover emoji" />
              <input
                className={field}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })}
                placeholder="How to write a learning story in 10 minutes"
                aria-label="Title"
              />
            </div>
            <input className={field} value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder="url-slug" aria-label="Slug" />
            <textarea className={field} rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="One or two sentences that appear on the blog index and in search results." aria-label="Excerpt" />

            <div className="grid gap-3 sm:grid-cols-3">
              <select className={field} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} aria-label="Category">
                {BLOG_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <select className={field} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} aria-label="Region">
                <option value="both">NZ + AU</option>
                <option value="NZ">New Zealand</option>
                <option value="AU">Australia</option>
              </select>
              <input className={field} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="te whāriki, observation" aria-label="Tags" />
            </div>

            <textarea
              className={`${field} font-mono leading-relaxed`}
              rows={16}
              value={form.body_markdown}
              onChange={(e) => setForm({ ...form, body_markdown: e.target.value })}
              placeholder={"## A heading\n\nNormal paragraph text. **Bold**, *italic*, `code`, and [links](https://example.com).\n\n- bullet\n- bullet\n\n> A quote"}
              aria-label="Body"
            />
            <p className="text-[11px] text-ink-400">
              Markdown: ## headings, **bold**, *italic*, - bullets, 1. numbered, &gt; quotes, [links](url).
            </p>

            <details className="rounded-xl border border-ink-700 p-3">
              <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-ink-300">SEO overrides (optional)</summary>
              <div className="mt-3 grid gap-3">
                <input className={field} value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} placeholder="Custom <title> — defaults to the post title" aria-label="SEO title" />
                <textarea className={field} rows={2} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} placeholder="Custom meta description — defaults to the excerpt" aria-label="SEO description" />
              </div>
            </details>

            {error && <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p>}
            {message && <p className="rounded-xl border border-sage-500/40 bg-sage-500/10 px-3 py-2 text-xs text-sage-200">{message}</p>}

            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving || !form.title} onClick={() => save(true)} className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-clay-500 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Publish
              </button>
              <button type="button" disabled={saving || !form.title} onClick={() => save(false)} className="inline-flex items-center gap-2 rounded-xl border border-ink-700 px-4 py-2.5 text-sm font-bold text-ink-200 hover:border-clay-500 disabled:opacity-50">
                <Save className="h-4 w-4" /> Save as draft
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-300">All posts</h2>
          {loading ? (
            <p className="text-sm text-ink-300"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading…</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-ink-300">Nothing written yet.</p>
          ) : (
            <ul className="divide-y divide-ink-700 overflow-hidden rounded-2xl border border-ink-700">
              {posts.map((post) => (
                <li key={post.id} className="flex flex-wrap items-center gap-3 bg-ink-900 px-4 py-3">
                  <span className="text-lg" aria-hidden="true">{post.cover_emoji ?? "📝"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{post.title}</p>
                    <p className="truncate text-[11px] text-ink-400">/blog/{post.slug}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${post.published ? "bg-sage-500/20 text-sage-300" : "bg-ink-700 text-ink-300"}`}>
                    {post.published ? "Live" : "Draft"}
                  </span>
                  <button type="button" onClick={() => edit(post)} className="text-xs text-clay-400 hover:text-clay-300">Edit</button>
                  <button type="button" onClick={() => remove(post.id)} aria-label={`Delete ${post.title}`} className="text-ink-400 hover:text-red-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
