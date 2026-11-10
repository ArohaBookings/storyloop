import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { SITE_URL } from "@/lib/email/config";
import { familyUrl } from "@/lib/family-link";
import { cancelFamilyLink, createFamilyLink } from "@/lib/family-link-server";

export const maxDuration = 60;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Make a private link for one child's family. The link is returned once and
 * never stored: only its hash is. One link per person ("Mum", "Nana"), so one
 * can be cancelled without touching the others.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

    const allowed = await consumeRateLimit({ scope: "family-link", key: user.id, limit: 40, windowSeconds: 24 * 60 * 60 });
    if (!allowed) return NextResponse.json({ error: "That is a lot of links for one day. Try again tomorrow." }, { status: 429 });

    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const made = await createFamilyLink(user.id, id, { label: body?.label, language: body?.language });
    if (!made.ok) {
      const message = made.reason === "no_child" ? "Child not found." : made.reason === "too_many" ? "This child already has six family links. Cancel one you no longer need first." : "Could not make the link. Try again.";
      return NextResponse.json({ error: message }, { status: made.reason === "no_child" ? 404 : made.reason === "too_many" ? 409 : 500 });
    }
    return NextResponse.json({ url: familyUrl(SITE_URL, made.token), childName: made.childName });
  } catch (error) {
    console.error("Family link create error:", error);
    return NextResponse.json({ error: "Could not make the link. Try again." }, { status: 500 });
  }
}

/** Cancel one link. It stops opening anything straight away. */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const linkId = typeof body?.linkId === "string" ? body.linkId : "";
    if (!/^[0-9a-f-]{36}$/i.test(linkId)) return NextResponse.json({ error: "Link not found." }, { status: 404 });
    if (!(await cancelFamilyLink(user.id, linkId))) return NextResponse.json({ error: "Could not cancel the link." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Family link cancel error:", error);
    return NextResponse.json({ error: "Could not cancel the link." }, { status: 500 });
  }
}
