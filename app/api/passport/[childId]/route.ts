import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { localDate } from "@/lib/terms";
import { isMissingTermSettingsColumn, parseTermSettings } from "@/lib/term-settings";
import { packStoryFromRow } from "@/lib/transition-pack";
import {
  buildLearningRecord,
  passportFilename,
  renderPassportHtml,
  type PassportOwnWords,
} from "@/lib/learning-passport";

/**
 * Hand the family their child's record, as a file.
 *
 * Returns one self-contained HTML document as a download. There is no stored
 * copy and no URL that serves it to anybody else: the educator generates it,
 * the family receives it, and from then on it is theirs and it works without
 * us. See lib/learning-passport.ts for why that is the shape.
 */

export const dynamic = "force-dynamic";

// Enough to cover a child's whole time at a service.
const STORY_LIMIT = 300;

export async function GET(_request: Request, { params }: { params: Promise<{ childId: string }> }) {
  const { childId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getOrCreateProfile(user);
  if (!hasFeatureAccess(profile.plan, "learningPassport")) {
    return NextResponse.json({ error: "The learning passport is on paid plans." }, { status: 403 });
  }

  // Row level security restricts this to the educator's own child, and the
  // explicit user_id keeps it true even if a policy is ever loosened.
  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, name, age_group, interests, home_languages, notes, developmental_focus, whanau_aspirations")
    .eq("id", childId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!child) return NextResponse.json({ error: "That child could not be found." }, { status: 404 });

  const { data: termRow, error: termError } = await supabase
    .from("profiles").select("term_settings").eq("id", user.id).maybeSingle();
  const defaultFramework = (profile.story_preferences as { defaultFramework?: string } | null)?.defaultFramework ?? null;
  const settings = parseTermSettings(
    termError && isMissingTermSettingsColumn(termError) ? null : termRow?.term_settings,
    defaultFramework,
  );

  const [storiesRes, wordsRes] = await Promise.all([
    supabase
      .from("stories")
      .select("id, created_at, next_steps, metadata")
      .eq("user_id", user.id)
      .eq("child_id", childId)
      .order("created_at", { ascending: false })
      .limit(STORY_LIMIT),
    supabase
      .from("child_voice_notes")
      .select("words, provenance, said_at")
      .eq("user_id", user.id)
      .eq("child_id", childId)
      .order("said_at", { ascending: false })
      .limit(50),
  ]);

  const stories = (storiesRes.data ?? []).map((row) =>
    packStoryFromRow({
      id: row.id as string,
      date: localDate(row.created_at as string, settings.jurisdiction) ?? String(row.created_at).slice(0, 10),
      next_steps: row.next_steps,
      metadata: row.metadata,
    }),
  );

  const ownWords: PassportOwnWords[] = (wordsRes.data ?? []).map((row) => ({
    words: row.words as string,
    saidAt: row.said_at as string,
    provenance: row.provenance as PassportOwnWords["provenance"],
  }));

  const record = buildLearningRecord({
    child: {
      name: child.name as string,
      ageGroup: (child.age_group as string | null) ?? null,
      interests: (child.interests as string[] | null) ?? null,
      homeLanguages: (child.home_languages as string[] | null) ?? null,
      notes: (child.notes as string | null) ?? null,
      developmentalFocus: (child.developmental_focus as string | null) ?? null,
      whanauAspirations: (child.whanau_aspirations as string | null) ?? null,
    },
    stories,
    ownWords,
    generatedAt: new Date().toISOString(),
  });

  return new NextResponse(renderPassportHtml(record), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `attachment; filename="${passportFilename(record).replace(/"/g, "")}"`,
      // A child's record is never cached by anything between here and them.
      "cache-control": "no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
