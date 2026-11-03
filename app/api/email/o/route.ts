import { NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isEventId, verifyLink } from "@/lib/email/tracking";

// A transparent 1x1 GIF.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/**
 * The open marker in a marketing email (lib/email/tracking.ts). Apple Mail and
 * others load it on the reader's behalf, so an open is a weak signal; the email
 * brain leans on clicks. Always answers with the image.
 */
export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("e");
  const signature = request.nextUrl.searchParams.get("s") ?? "";
  if (isEventId(eventId) && verifyLink(eventId, "open", signature)) {
    try {
      await createAdminSupabase().from("email_events").update({ opened_at: new Date().toISOString() }).eq("id", eventId).is("opened_at", null);
    } catch (error) {
      console.error("Email open not recorded:", error);
    }
  }
  return new Response(PIXEL, {
    headers: { "Content-Type": "image/gif", "Content-Length": String(PIXEL.length), "Cache-Control": "no-store, max-age=0" },
  });
}
