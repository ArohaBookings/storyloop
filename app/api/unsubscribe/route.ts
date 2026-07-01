import { NextRequest, NextResponse } from "next/server";
import { applyUnsubscribe } from "@/lib/email/unsubscribe-apply";

// One-click unsubscribe endpoint referenced by the List-Unsubscribe header.
// Mail clients (Gmail, Apple Mail) POST here for RFC 8058 one-click; a human
// who follows the header link with a GET is redirected to the friendly page.
export async function POST(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token") ?? undefined;
  const result = await applyUnsubscribe(token);
  return NextResponse.json({ ok: result.ok }, { status: result.ok ? 200 : 400 });
}

export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const target = new URL(`/unsubscribe?token=${encodeURIComponent(token)}`, request.url);
  return NextResponse.redirect(target, 302);
}
