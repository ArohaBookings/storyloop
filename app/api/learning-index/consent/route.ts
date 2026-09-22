import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * A service's agreement that aggregated counts may contribute to the Early
 * Learning Index. Off by default, reversible in one press, and never assumed.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("profiles").select("learning_index_consent_at").eq("id", user.id).maybeSingle();
  return NextResponse.json({ consentedAt: data?.learning_index_consent_at ?? null });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { consented?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.consented !== "boolean") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ learning_index_consent_at: body.consented ? new Date().toISOString() : null })
    .eq("id", user.id);

  if (error) {
    console.error("Updating index consent failed:", error);
    return NextResponse.json({ error: "Could not update that." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, consented: body.consented });
}
