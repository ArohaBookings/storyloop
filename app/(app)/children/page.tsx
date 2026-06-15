import ChildProfileManager from "@/components/app/ChildProfileManager";
import type { ChildProfile } from "@/lib/children";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Child learning profiles" };

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

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      <ChildProfileManager initialChildren={(data ?? []) as ChildProfile[]} />
    </div>
  );
}
