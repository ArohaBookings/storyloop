import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardNav from "@/components/app/DashboardNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, plan, stories_this_month")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex h-screen bg-paper overflow-hidden">
      <DashboardNav
        userEmail={user.email ?? ""}
        userName={profile?.full_name ?? user.email ?? ""}
        plan={profile?.plan ?? "free"}
        storiesUsed={profile?.stories_this_month ?? 0}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
