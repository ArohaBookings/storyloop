import { NextRequest, NextResponse } from "next/server";

import { sendPasswordResetEmail } from "@/lib/email/password-reset";
import { consumeRateLimit } from "@/lib/rate-limit";

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const recipient = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!recipient || !recipient.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const key = `${getClientIp(request)}:${recipient}`;
    const allowed = await consumeRateLimit({
      scope: "password-reset",
      key,
      limit: 3,
      windowSeconds: 15 * 60,
    });

    if (!allowed) {
      return NextResponse.json({ error: "Too many reset requests. Please try again in a few minutes." }, { status: 429 });
    }

    await sendPasswordResetEmail(recipient);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json({ error: "Could not send reset email. Please contact support." }, { status: 500 });
  }
}
