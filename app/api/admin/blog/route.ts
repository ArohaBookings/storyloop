import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { slugify } from "@/lib/blog";

/** All blog writes are admin-only; verified on every request, not just the page. */
async function requireAdmin() {
  const session = await verifyAdmin();
  return Boolean(session);
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createAdminSupabase()
    .from("blog_posts")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "A title is required" }, { status: 400 });

  const admin = createAdminSupabase();
  const publishing = body.published === true;

  const payload: Record<string, unknown> = {
    title,
    slug: (typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(title)) || `post-${Date.now()}`,
    excerpt: typeof body.excerpt === "string" ? body.excerpt.trim() : null,
    body_markdown: typeof body.body_markdown === "string" ? body.body_markdown : "",
    category: typeof body.category === "string" ? body.category : "article",
    region: typeof body.region === "string" ? body.region : "both",
    tags: Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === "string").slice(0, 12) : [],
    cover_emoji: typeof body.cover_emoji === "string" ? body.cover_emoji.slice(0, 8) : null,
    seo_title: typeof body.seo_title === "string" ? body.seo_title.trim() || null : null,
    seo_description: typeof body.seo_description === "string" ? body.seo_description.trim() || null : null,
    published: publishing,
  };

  if (body.id) {
    // Keep the original publish date on re-publish so the article does not look
    // brand new to search engines every time it is edited.
    const { data: existing } = await admin.from("blog_posts").select("published_at").eq("id", body.id).maybeSingle();
    payload.published_at = publishing ? existing?.published_at ?? new Date().toISOString() : null;
    const { data, error } = await admin.from("blog_posts").update(payload).eq("id", body.id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ post: data });
  }

  payload.published_at = publishing ? new Date().toISOString() : null;
  const { data, error } = await admin.from("blog_posts").insert(payload).select("*").single();
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "That slug is already used. Change the title or slug." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ post: data });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await createAdminSupabase().from("blog_posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
