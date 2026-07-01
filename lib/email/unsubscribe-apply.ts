import { verifyUnsubscribeToken } from "./unsubscribe";
import { createAdminSupabase } from "@/lib/supabase/admin";

// Shared unsubscribe action used by both the human-facing /unsubscribe page
// (GET) and the one-click List-Unsubscribe API route (POST, RFC 8058).
export async function applyUnsubscribe(token?: string) {
  if (!token) return { ok: false, message: "This unsubscribe link is missing its token." };

  const payload = verifyUnsubscribeToken(token);
  if (!payload) return { ok: false, message: "This unsubscribe link is invalid or expired." };

  const sb = createAdminSupabase();
  const now = new Date().toISOString();
  const email = payload.email.toLowerCase();

  await sb.from("email_unsubscribes").upsert(
    {
      user_id: payload.userId,
      email,
      reason: "email_link",
      unsubscribed_at: now,
      metadata: { source: "unsubscribe" },
    },
    { onConflict: "email" }
  );

  await Promise.all([
    sb.from("profiles").update({ marketing_unsubscribed_at: now }).eq("id", payload.userId),
    sb
      .from("email_events")
      .update({ unsubscribed_at: now })
      .eq("user_id", payload.userId)
      .eq("recipient", email)
      .is("unsubscribed_at", null),
  ]);

  return { ok: true, message: "You are unsubscribed from StoryLoop product tips and upgrade nudges." };
}
