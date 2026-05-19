import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNav from "@/components/app/DashboardNav";
import { getOrCreateProfile } from "@/lib/supabase/profiles";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(user);

  if (profile.is_active === false) {
    redirect("/login?disabled=1");
  }

  return (
    <div className="flex h-screen bg-paper overflow-hidden">
      <DashboardNav
        userEmail={user.email ?? ""}
        userName={profile?.full_name ?? user.email ?? ""}
        plan={profile?.plan ?? "free"}
        storiesUsed={profile?.stories_this_month ?? 0}
        monthlyStoryLimitOverride={profile?.monthly_story_limit_override ?? null}
        appliedAccessCode={profile?.applied_access_code ?? null}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
