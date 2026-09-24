import { NextRequest, NextResponse } from "next/server";

import { sendSignInLinkEmail } from "@/lib/email/sign-in-link";
import { consumeRateLimit } from "@/lib/rate-limit";

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Emails a one-tap sign-in link. Always answers the same way whether or not the
 * address has an account, so it cannot be used to find out who is a customer.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const redirect = typeof body.redirect === "string" ? body.redirect : "/dashboard";
  if (!email || !email.includes("@") || email.length > 200) {
    return NextResponse.json({ error: "Enter the email address you use for StoryLoop." }, { status: 400 });
  }
  const allowed = await consumeRateLimit({ scope: "sign-in-link", key: `${clientIp(request)}:${email}`, limit: 3, windowSeconds: 15 * 60 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many links requested. Please try again in a few minutes." }, { status: 429 });
  }
  try {
    await sendSignInLinkEmail(email, redirect);
  } catch (error) {
    console.error("Sign-in link error:", error);
    return NextResponse.json({ error: "Could not send the link. Please use your password, or reset it." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
