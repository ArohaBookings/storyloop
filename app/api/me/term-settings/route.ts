import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMissingTermSettingsColumn, validateTermSettingsUpdate } from "@/lib/term-settings";

/**
 * Save where an educator's service is and whether it follows school terms.
 *
 * Writes through the user's own connection: term_settings is not a billing
 * field, row level security limits the write to their own profile, and the
 * billing guard trigger allows it.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to save term settings." }, { status: 401 });

    const update = validateTermSettingsUpdate(await request.json().catch(() => null));
    if (!update) {
      return NextResponse.json({ error: "Choose a location and whether your service follows school terms." }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ term_settings: update })
      .eq("id", user.id);

    if (error) {
      if (isMissingTermSettingsColumn(error)) {
        return NextResponse.json({ error: "Term settings are not available yet." }, { status: 503 });
      }
      console.error("Term settings save failed:", error.message);
      return NextResponse.json({ error: "Could not save that." }, { status: 500 });
    }

    return NextResponse.json({ termSettings: { ...update, configured: true } });
  } catch (error) {
    console.error("Term settings error:", error);
    return NextResponse.json({ error: "Could not save that." }, { status: 500 });
  }
}
