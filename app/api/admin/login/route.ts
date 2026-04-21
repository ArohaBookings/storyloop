import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { createAdminSupabase } from "@/lib/supabase/admin";

// Env-stored admin credentials — on first login, if ADMIN_PASSWORD_HASH is not set,
// we hash ADMIN_PASSWORD_PLAIN once and tell user to put the hash in env vars.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "leoanthonybons@gmail.com";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim() : "";
    const submittedPassword = typeof password === "string" ? password.trim() : "";
    if (!normalizedEmail || !submittedPassword) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    if (normalizedEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
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
    } else {
      return NextResponse.json({ error: "Admin not configured. Set ADMIN_PASSWORD_PLAIN in env vars." }, { status: 500 });
    }

    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // Sign JWT for admin session (7 days)
    const secret = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET ?? "fallback-change-me");
    const token = await new SignJWT({ admin: true, email: normalizedEmail })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .setIssuedAt()
      .sign(secret);

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
