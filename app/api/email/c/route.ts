import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/email/config";
import { isEventId, safePath, verifyLink } from "@/lib/email/tracking";

/**
 * A tracked link in a marketing email (lib/email/tracking.ts): note the first
 * click, then go straight to the page. It never errors and never leaves this
 * site; a tampered link goes to the homepage. Clicks in the first minute after
 * sending are ignored, because email security scanners "click" every link the
 * moment a message arrives.
 */
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("e");
  const path = safePath(request.nextUrl.searchParams.get("u"));
  const signature = request.nextUrl.searchParams.get("s") ?? "";
  const valid = Boolean(isEventId(eventId) && path && verifyLink(eventId as string, path, signature));
  const destination = new URL(valid && path ? path : "/", SITE_URL);

  if (valid) {
    try {
      await createAdminSupabase()
        .from("email_events")
        .update({ clicked_at: new Date().toISOString() })
        .eq("id", eventId as string)
        .is("clicked_at", null)
        .lt("sent_at", new Date(Date.now() - 60_000).toISOString());
    } catch (error) {
      console.error("Email click not recorded (the reader still gets the page):", error);
    }
  }

  const response = NextResponse.redirect(destination, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
