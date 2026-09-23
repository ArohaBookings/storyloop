import { NextRequest, NextResponse } from "next/server";
import { PWNED_PASSWORD_MESSAGE, pwnedCount } from "@/lib/pwned-passwords";
import { consumeRateLimit } from "@/lib/rate-limit";

/**
 * Checks a new password against known breaches before the reset page saves it.
 * The password is hashed here and only a five-character hash prefix is sent
 * on; see lib/pwned-passwords.ts. Nothing is stored or logged.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await consumeRateLimit({ scope: "password-check", key: ip, limit: 20, windowSeconds: 600 }))) {
    return NextResponse.json({ ok: true, checked: false });
  }
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  const count = await pwnedCount(password);
  if (count && count > 0) return NextResponse.json({ ok: false, error: PWNED_PASSWORD_MESSAGE });
  return NextResponse.json({ ok: true, checked: count !== null });
}
