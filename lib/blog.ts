import { createAdminSupabase, hasSupabaseAdminConfig } from "@/lib/supabase/admin";

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_markdown: string;
  category: string;
  tags: string[];
  region: string;
  author_name: string;
  cover_emoji: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published: boolean;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};

export const BLOG_CATEGORIES = [
  { key: "guide", label: "Guide" },
  { key: "article", label: "Article" },
  { key: "news", label: "Product news" },
  { key: "template", label: "Template" },
] as const;

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export function readingMinutes(markdown: string) {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export async function listPublishedPosts(limit = 50) {
  // Runs during static generation of /blog and the sitemap, so it must never
  // throw. If the database is unreachable at build time the blog simply shows
  // nothing rather than failing the whole deploy.
  if (!hasSupabaseAdminConfig()) return [] as BlogPost[];

  try {
    const { data } = await createAdminSupabase()
      .from("blog_posts")
      .select("*")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as BlogPost[];
  } catch (error) {
    console.error("listPublishedPosts failed, returning empty:", error);
    return [] as BlogPost[];
  }
}

export async function getPublishedPost(slug: string) {
  if (!hasSupabaseAdminConfig()) return null;

  try {
    const { data } = await createAdminSupabase()
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    return (data ?? null) as BlogPost | null;
  } catch (error) {
    console.error("getPublishedPost failed:", error);
    return null;
  }
}

/**
 * Minimal, dependency-free Markdown to HTML.
 *
 * Everything is escaped first and only a known-safe set of constructs is then
 * re-introduced, so a post can never inject markup. Posts are authored by the
 * admin, but treating our own input as untrusted costs nothing and removes an
 * entire class of mistake.
 */
export function renderMarkdown(markdown: string) {
  const esc = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const inline = (text: string) =>
    esc(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      // Only http(s) links; anything else is left as plain text.
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener">$1</a>');

  const blocks = markdown.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const html: string[] = [];

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    if (/^###\s+/.test(block)) { html.push(`<h3>${inline(block.replace(/^###\s+/, ""))}</h3>`); continue; }
    if (/^##\s+/.test(block)) { html.push(`<h2>${inline(block.replace(/^##\s+/, ""))}</h2>`); continue; }
    if (/^#\s+/.test(block)) { html.push(`<h2>${inline(block.replace(/^#\s+/, ""))}</h2>`); continue; }
    if (/^>\s+/.test(block)) {
      html.push(`<blockquote>${inline(block.replace(/^>\s+/gm, ""))}</blockquote>`);
      continue;
    }
    if (/^(-|\*)\s+/m.test(block) && block.split("\n").every((line) => /^(-|\*)\s+/.test(line.trim()))) {
      const items = block.split("\n").map((line) => `<li>${inline(line.trim().replace(/^(-|\*)\s+/, ""))}</li>`);
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\d+\.\s+/m.test(block) && block.split("\n").every((line) => /^\d+\.\s+/.test(line.trim()))) {
      const items = block.split("\n").map((line) => `<li>${inline(line.trim().replace(/^\d+\.\s+/, ""))}</li>`);
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    html.push(`<p>${inline(block).replace(/\n/g, "<br />")}</p>`);
  }

  return html.join("\n");
}

/** Plain-text summary for meta descriptions and answer engines. */
export function plainSummary(post: BlogPost, max = 160) {
  const base = post.seo_description || post.excerpt || post.body_markdown.replace(/[#*`>\-]/g, " ");
  return base.replace(/\s+/g, " ").trim().slice(0, max);
}
