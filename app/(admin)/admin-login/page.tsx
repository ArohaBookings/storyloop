import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { verifyAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await verifyAdmin();
  if (session) {
    redirect("/admin");
  }

  // Already signed in to StoryLoop as the admin: one click, no second password.
  let appAdminEmail: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email && isAdminEmail(user.email)) appAdminEmail = user.email;
  } catch {
    appAdminEmail = null;
  }

  return <AdminLoginForm appAdminEmail={appAdminEmail} />;
}
