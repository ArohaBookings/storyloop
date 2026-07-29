import { redirect } from "next/navigation";
import TodayLoopBoard from "@/components/app/TodayLoopBoard";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import {
  monthStartIso,
  todayCaptureAllowance,
  type DailyCapture,
  type TodayChild,
  type TodayStory,
} from "@/lib/today-loop";

export const metadata = { title: "Today Loop" };

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(user);
  const [{ data: children }, { data: stories }, { data: captures }, { count }] = await Promise.all([
    supabase
      .from("child_profiles")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("stories")
      .select("id, child_id, child_name, next_steps, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("daily_captures")
      .select("id, child_id, child_name, note, status, observed_at, created_at, updated_at")
      .eq("user_id", user.id)
      .in("status", ["captured", "planned"])
      .order("observed_at", { ascending: false })
      .limit(100),
    supabase
      .from("daily_captures")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", monthStartIso()),
  ]);
  const params = await searchParams;
  const requestedChildId = (children ?? []).some((child) => child.id === params.child) ? params.child ?? "" : "";

  return (
    <TodayLoopBoard
      initialCaptures={(captures ?? []) as DailyCapture[]}
      childProfiles={(children ?? []) as TodayChild[]}
      stories={(stories ?? []) as TodayStory[]}
      initialAllowance={todayCaptureAllowance(profile.plan, count ?? 0)}
      requestedChildId={requestedChildId}
    />
  );
}
