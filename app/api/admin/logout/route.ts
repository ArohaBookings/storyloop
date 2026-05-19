import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/supabase/admin";
import { verifyAdmin } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const session = await verifyAdmin();
    if (session) await logAdminAction("admin_logout", "system", session.email, {});
    const res = NextResponse.redirect(new URL("/admin-login", request.url), 303);
    res.cookies.delete("admin_session");
    return res;
  } catch (error) {
    console.error("Admin logout error:", error);
    const res = NextResponse.redirect(new URL("/admin-login", request.url), 303);
    res.cookies.delete("admin_session");
    return res;
  }
}
