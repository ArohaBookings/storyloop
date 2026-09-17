import type { ReactNode } from "react";
import ChildProfileManager from "@/components/app/ChildProfileManager";
import QuietChildRadarPanel from "@/components/app/QuietChildRadarPanel";
import type { ChildProfile } from "@/lib/children";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { buildQuietChildRadar } from "@/lib/quiet-radar";
import { isMissingTermSettingsColumn, parseTermSettings } from "@/lib/term-settings";
import { redirect } from "next/navigation";

export const metadata = { title: "Child learning profiles" };

// Far enough back to find the last moment for a child who has been quiet a
// while, bounded so a long-standing account never scans its whole history.
const LOOKBACK_DAYS = 150;

export default async function ChildrenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("child_profiles")
    .select("id, name, age_group, interests, developmental_focus, notes, whanau_aspirations, home_languages, created_at, updated_at")
    .eq("user_id", user.id)
    .order("name");
  const children = (data ?? []) as ChildProfile[];

  // Everything below is the radar. It is best-effort: any failure here leaves
  // the child profiles page exactly as it was, never broken.
  let radarPanel: ReactNode = null;
  try {
    const profile = await getOrCreateProfile(user);
    const hasAccess = hasFeatureAccess(profile.plan, "quietChildRadar");

    // term_settings is read on its own, never through the shared profile
    // loader, so this page still works before its migration has been applied.
    const { data: termRow, error: termError } = await supabase
      .from("profiles")
      .select("term_settings")
      .eq("id", user.id)
      .maybeSingle();
    const settingsAvailable = !(termError && isMissingTermSettingsColumn(termError));
    const defaultFramework = (profile.story_preferences as { defaultFramework?: string } | null)?.defaultFramework ?? null;
    const settings = parseTermSettings(settingsAvailable ? termRow?.term_settings : null, defaultFramework);

    if (hasAccess) {
      let radar = null;
      if (children.length > 0) {
        const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
        const [storiesRes, capturesRes] = await Promise.all([
          supabase.from("stories").select("child_id, created_at").eq("user_id", user.id).gte("created_at", since).limit(5000),
          supabase.from("daily_captures").select("child_id, observed_at").eq("user_id", user.id).gte("observed_at", since).limit(5000),
        ]);
        const moments = [
          ...(storiesRes.data ?? []).map((row) => ({ childId: row.child_id as string | null, createdAt: row.created_at as string })),
          ...(capturesRes.data ?? []).map((row) => ({ childId: row.child_id as string | null, createdAt: row.observed_at as string })),
        ];
        radar = buildQuietChildRadar(
          children.map((child) => ({ id: child.id, name: child.name })),
          moments,
          { today: new Date(), jurisdiction: settings.jurisdiction, followsSchoolTerms: settings.followsSchoolTerms },
        );
      }
      radarPanel = (
        <QuietChildRadarPanel radar={radar} settings={settings} hasAccess settingsAvailable={settingsAvailable} />
      );
    } else if (children.length >= 2) {
      // Only offer it once it would actually be useful to them.
      radarPanel = (
        <QuietChildRadarPanel radar={null} settings={settings} hasAccess={false} settingsAvailable={settingsAvailable} />
      );
    }
  } catch (error) {
    console.error("Quiet child radar failed; child profiles unaffected:", error);
    radarPanel = null;
  }

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      {radarPanel}
      <ChildProfileManager initialChildren={children} />
    </div>
  );
}
