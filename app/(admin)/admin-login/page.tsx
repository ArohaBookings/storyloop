import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin/AdminLoginForm";
import { verifyAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const session = await verifyAdmin();
  if (session) {
    redirect("/admin");
  }

  return <AdminLoginForm />;
}
