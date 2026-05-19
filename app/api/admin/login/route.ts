import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { ADMIN_EMAIL, createAdminSessionToken, isAdminEmail } from "@/lib/admin-session";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim() : "";
    const submittedPassword = typeof password === "string" ? password.trim() : "";
    if (!normalizedEmail || !submittedPassword) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    if (!isAdminEmail(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check hash in env (preferred), fallback to plain text comparison if hash not set
    const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
    const plain = process.env.ADMIN_PASSWORD_PLAIN?.trim();

    let ok = false;
    if (hash) {
      ok = await bcrypt.compare(submittedPassword, hash);
    }
    if (!ok && plain) {
      // First-boot: password matches plain, and we generate the hash for user to store
      if (submittedPassword === plain) {
        ok = true;
        const newHash = await bcrypt.hash(plain, 10);
        console.log("====== ADMIN SETUP ======");
        console.log("Set this in your env vars: ADMIN_PASSWORD_HASH=" + newHash);
        console.log("Then you can remove ADMIN_PASSWORD_PLAIN.");
        console.log("=========================");
      }
    }
    if (!ok) {
      const authClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data, error } = await authClient.auth.signInWithPassword({
        email: normalizedEmail,
        password: submittedPassword,
      });
      ok = !error && isAdminEmail(data.user?.email);
    }

    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = await createAdminSessionToken(normalizedEmail);

    // Log login to audit
    const sb = createAdminSupabase();
    await sb.from("admin_audit_log").insert({
      action: "admin_login",
      target_type: "system",
      target_id: normalizedEmail,
      details: { ip: request.headers.get("x-forwarded-for") ?? "unknown" },
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("admin_session", token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, path: "/",
    });
    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
