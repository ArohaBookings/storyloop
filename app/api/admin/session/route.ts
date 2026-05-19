import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSessionToken, isAdminEmail } from "@/lib/admin-session";
import { logAdminAction } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminEmail = user?.email ?? null;

    if (!adminEmail || !isAdminEmail(adminEmail)) {
      return NextResponse.redirect(new URL("/admin-login", request.url), 303);
    }

    const token = await createAdminSessionToken(adminEmail);
    await logAdminAction("admin_session_granted", "system", adminEmail, {});

    const response = NextResponse.redirect(new URL("/admin", request.url), 303);
    response.cookies.set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Admin session route error:", error);
    return NextResponse.redirect(new URL("/admin-login", request.url), 303);
  }
}
