import { Resend } from "resend";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

/**
 * Resend tells StoryLoop what happened after it accepted each email (3 Nov
 * 2026). Until now every row said only "sent". Each automation run asks Resend
 * about the last four days of sends and records delivered, bounced or
 * complained in the row's metadata (provider_status), plus opens and clicks if
 * Resend tracks them. A bounce or spam complaint takes that address off all
 * marketing email at once (email_unsubscribes), and the email brain pauses or
 * slows everything if they add up (lib/email/brain.ts deliverabilityGuard).
 * No webhook secret is needed; a webhook can be added later on top.
 */

const DAY = 86_400_000;
const FINAL = new Set(["bounced", "complained"]);
/** Resend's API allows two requests a second. */
const SPACING_MS = 520;

export type SyncResult = { checked: number; updated: number; suppressed: number; skipped?: string };

/** Adds an address to the marketing suppression list once, however many times it is reported. */
export async function suppressAddress(input: { userId: string | null; email: string; reason: "bounced" | "complained"; eventId: string }) {
  const sb = createAdminSupabase();
  const email = input.email.trim().toLowerCase();
  const { data: existing } = await sb.from("email_unsubscribes").select("id").eq("email", email).limit(1);
  if (!existing?.length) {
    await sb.from("email_unsubscribes").insert({ user_id: input.userId, email, reason: input.reason, metadata: { source: "resend", email_event_id: input.eventId } });
  }
  if (input.userId) {
    await sb.from("profiles").update({ marketing_unsubscribed_at: new Date().toISOString() }).eq("id", input.userId).is("marketing_unsubscribed_at", null);
  }
}

type Row = { id: string; user_id: string | null; recipient: string; provider_message_id: string; metadata: Record<string, unknown> | null; opened_at: string | null; clicked_at: string | null };

export async function syncDeliveryStatus({ limit = 20, now = new Date() }: { limit?: number; now?: Date } = {}): Promise<SyncResult> {
  const apiKey = await getRuntimeSecret("RESEND_API_KEY", "resend_api_key");
  if (!apiKey) return { checked: 0, updated: 0, suppressed: 0, skipped: "unconfigured" };
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("email_events")
    .select("id, user_id, recipient, provider_message_id, metadata, opened_at, clicked_at")
    .eq("delivery_status", "sent")
    .not("provider_message_id", "is", null)
    .gte("sent_at", new Date(now.getTime() - 4 * DAY).toISOString())
    // Oldest first, so every email is checked within its four days however busy a day gets.
    .order("sent_at", { ascending: true })
    .limit(300);
  if (error) return { checked: 0, updated: 0, suppressed: 0, skipped: error.message };

  // Not settled yet, and not asked about in the last 12 hours.
  const due = ((data ?? []) as Row[]).filter((row) => {
    const meta = row.metadata ?? {};
    if (FINAL.has(String(meta.provider_status ?? ""))) return false;
    const checked = Date.parse(String(meta.provider_checked_at ?? ""));
    return !Number.isFinite(checked) || now.getTime() - checked > 12 * 3_600_000;
  }).slice(0, limit);

  const resend = new Resend(apiKey);
  let checked = 0;
  let updated = 0;
  let suppressed = 0;
  for (const row of due) {
    if (checked > 0) await new Promise((resolve) => setTimeout(resolve, SPACING_MS));
    checked += 1;
    try {
      const { data: email, error: getError } = await resend.emails.get(row.provider_message_id);
      if (getError || !email) {
        // Not found or not answered: try again in 12 hours rather than every run.
        await sb.from("email_events").update({ metadata: { ...(row.metadata ?? {}), provider_checked_at: now.toISOString() } }).eq("id", row.id);
        continue;
      }
      const status = String((email as { last_event?: string }).last_event ?? "");
      if (!status) continue;
      const patch: Record<string, unknown> = { metadata: { ...(row.metadata ?? {}), provider_status: status, provider_checked_at: now.toISOString() } };
      if (status === "opened" && !row.opened_at) patch.opened_at = now.toISOString();
      if (status === "clicked" && !row.clicked_at) patch.clicked_at = now.toISOString();
      await sb.from("email_events").update(patch).eq("id", row.id);
      updated += 1;
      if (status === "bounced" || status === "complained") {
        await suppressAddress({ userId: row.user_id, email: row.recipient, reason: status, eventId: row.id });
        suppressed += 1;
      }
    } catch (syncError) {
      console.error("Delivery status check failed for one email (others continue):", syncError);
    }
  }
  return { checked, updated, suppressed };
}
