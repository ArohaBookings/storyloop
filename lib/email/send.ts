import { Resend } from "resend";

import { EMAIL_FROM, EMAIL_REPLY_TO } from "./config";
import { renderLifecycleEmail, type LifecycleEmailType } from "./templates";
import { oneClickUnsubscribeUrl } from "./unsubscribe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getRuntimeSecret } from "@/lib/runtime-secrets";
import { randomUUID } from "crypto";
import { gateEmail, isMarketing, timezoneFor, type HoldReason } from "./brain";
import { loadGlobalEmailState, loadUserHistory, noteMarketingSent } from "./brain-state";
import { withTracking } from "./tracking";

// Which emails count as marketing, how many may go and when, is decided by the
// email brain (lib/email/brain.ts, 3 Nov 2026): never more than two
// non-billing emails to one person in 30 days, the most valuable one first,
// and nothing at all while bounces or complaints are high. Transactional mail
// (receipts, payment and trial notices, referral credits) is never held.

type SendLifecycleEmailParams = {
  type: LifecycleEmailType;
  userId: string;
  recipient: string | null | undefined;
  name?: string | null;
  relatedStoryId?: string | null;
  force?: boolean;
  /**
   * A one-off campaign Leo chose to send: skips the spacing and quiet-hours
   * rules, never the two-a-month limit, the daily ceiling, a pause, the
   * unsubscribe list or the duplicate check.
   */
  ignoreFrequencyCap?: boolean;
  /** Sent because of something the person just did (wrote a story, hit the limit): no quiet hours. */
  triggeredByUser?: boolean;
  /** Their curriculum setting (NZ, AU, UK, IE), for their local time. */
  defaultFramework?: string | null;
  /** When the same email can rightly go twice in a day (two friends joining), a key per send. */
  idempotencyKey?: string;
  /**
   * Work worth doing only once this email is cleared to go (a referral code,
   * an offer grant). Returning null stops the send: an offer email must never
   * go out without its offer.
   */
  prepare?: () => Promise<Parameters<typeof renderLifecycleEmail>[0]["context"] | null>;
  /**
   * For emails meant to repeat on a schedule (went_quiet every 21 days,
   * winback every 90): only an earlier send after this time counts as a
   * duplicate. Without it the once-ever check blocked every repeat, so a
   * paying customer who went quiet a second time heard nothing.
   */
  dedupeSince?: string;
  metadata?: Record<string, unknown>;
  // Optional billing/referral values the template can weave in. The template
  // must still render correctly if this is absent.
  context?: Parameters<typeof renderLifecycleEmail>[0]["context"];
};

type EmailStatus = "sent" | "skipped_unconfigured" | "skipped_unsubscribed" | "skipped_duplicate" | "skipped_frequency_cap" | "failed";

/** Held by the brain this run: the person keeps their place and a later run tries again. */
export type HeldResult = { status: "skipped_frequency_cap"; reason: HoldReason; detail: string };

function cleanEmail(email: string | null | undefined) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

async function isUnsubscribed(recipient: string) {
  const sb = createAdminSupabase();
  // limit(1), not maybeSingle(): an address listed twice made maybeSingle()
  // error, which read as "not unsubscribed" (found 3 Nov 2026).
  const { data, error } = await sb
    .from("email_unsubscribes")
    .select("id")
    .eq("email", recipient)
    .limit(1);
  // If the list cannot be read, treat the address as unsubscribed.
  if (error) return true;
  return Boolean(data?.length);
}

async function hasExistingEmail(type: LifecycleEmailType, userId: string, relatedStoryId?: string | null, sinceIso?: string) {
  let query = createAdminSupabase()
    .from("email_events")
    .select("id")
    .eq("user_id", userId)
    .eq("email_type", type)
    .in("delivery_status", ["sent", "skipped_unconfigured"]);
  if (sinceIso) query = query.gte("sent_at", sinceIso);

  query = relatedStoryId ? query.eq("related_story_id", relatedStoryId) : query.is("related_story_id", null);

  const { data } = await query.limit(1).maybeSingle();
  return Boolean(data);
}

async function logEmailEvent({
  id,
  type,
  userId,
  recipient,
  subject,
  relatedStoryId,
  status,
  providerMessageId,
  metadata = {},
}: {
  id?: string;
  type: LifecycleEmailType;
  userId: string;
  recipient: string;
  subject: string;
  relatedStoryId?: string | null;
  status: EmailStatus;
  providerMessageId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const sb = createAdminSupabase();
  await sb.from("email_events").insert({
    ...(id ? { id } : {}),
    email_type: type,
    user_id: userId,
    recipient,
    subject,
    provider_message_id: providerMessageId ?? null,
    delivery_status: status,
    related_story_id: relatedStoryId ?? null,
    metadata,
    sent_at: new Date().toISOString(),
  });
}

export async function sendLifecycleEmail(params: SendLifecycleEmailParams) {
  const recipient = cleanEmail(params.recipient);
  if (!recipient) return { status: "failed" as const, reason: "missing_recipient" };

  const email = renderLifecycleEmail({
    type: params.type,
    userId: params.userId,
    recipient,
    name: params.name,
    relatedStoryId: params.relatedStoryId,
    context: params.context,
  });
  // The template and the brain must agree; either one calling it marketing is enough.
  const marketing = email.marketing || isMarketing(params.type);

  // Already sent: nothing to do, and nothing worth a row every six hours.
  if (!params.force && params.type !== "weekly_value") {
    const duplicate = await hasExistingEmail(params.type, params.userId, params.relatedStoryId, params.dedupeSince);
    if (duplicate) return { status: "skipped_duplicate" as const };
  }

  if (marketing && await isUnsubscribed(recipient)) {
    await logEmailEvent({
      type: params.type,
      userId: params.userId,
      recipient,
      subject: email.subject,
      relatedStoryId: params.relatedStoryId,
      status: "skipped_unsubscribed",
      metadata: params.metadata,
    });
    return { status: "skipped_unsubscribed" as const };
  }

  // The email brain: two a month at most, spaced out, in waking hours, and
  // nothing while bounces or complaints are high (lib/email/brain.ts).
  if (marketing && !params.force) {
    const now = new Date();
    const [global, history] = await Promise.all([loadGlobalEmailState(now), loadUserHistory(params.userId, now)]);
    if (!history) return { status: "skipped_frequency_cap" as const, reason: "monthly_cap" as HoldReason, detail: "Email history could not be read." };
    const gate = gateEmail({
      type: params.type,
      history,
      global,
      now,
      timeZone: timezoneFor(params.defaultFramework),
      triggeredByUser: params.triggeredByUser,
    });
    const overridable = params.ignoreFrequencyCap && !gate.allow && (gate.reason === "too_soon" || gate.reason === "quiet_hours");
    if (!gate.allow && !overridable) return { status: "skipped_frequency_cap" as const, reason: gate.reason, detail: gate.detail };
  }

  let final = email;
  if (params.prepare) {
    const extra = await params.prepare().catch(() => null);
    if (!extra) {
      await logEmailEvent({ type: params.type, userId: params.userId, recipient, subject: email.subject, relatedStoryId: params.relatedStoryId, status: "failed", metadata: { ...params.metadata, error: "prepare_failed" } });
      return { status: "failed" as const, reason: "prepare_failed" };
    }
    final = renderLifecycleEmail({ type: params.type, userId: params.userId, recipient, name: params.name, relatedStoryId: params.relatedStoryId, context: { ...params.context, ...extra } });
  }

  // Made before sending so marketing links can carry it (lib/email/tracking.ts).
  const eventId = randomUUID();
  const html = marketing ? withTracking(final.html, eventId) : final.html;
  const sentMetadata = { ...params.metadata, ctaUrl: final.ctaUrl, ...(marketing ? { tracked: true } : {}) };

  const apiKey = await getRuntimeSecret("RESEND_API_KEY", "resend_api_key");
  if (!apiKey) {
    await logEmailEvent({
      id: eventId,
      type: params.type,
      userId: params.userId,
      recipient,
      subject: final.subject,
      relatedStoryId: params.relatedStoryId,
      status: "skipped_unconfigured",
      metadata: sentMetadata,
    });
    return { status: "skipped_unconfigured" as const };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [recipient],
      replyTo: EMAIL_REPLY_TO,
      subject: final.subject,
      html,
      text: final.text,
      headers: {
        "Idempotency-Key": params.idempotencyKey ?? `${params.type}-${params.userId}-${params.relatedStoryId ?? "none"}`,
        // One-click / native unsubscribe affordance in Gmail, Apple Mail, etc.
        // Only on marketing mail; transactional account emails omit it.
        ...(marketing
          ? {
              "List-Unsubscribe": `<${oneClickUnsubscribeUrl(params.userId, recipient)}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            }
          : {}),
      },
      tags: [
        { name: "email_type", value: params.type },
        { name: "product", value: "storyloop" },
      ],
    });

    if (error) {
      throw new Error(error.message);
    }

    await logEmailEvent({
      id: eventId,
      type: params.type,
      userId: params.userId,
      recipient,
      subject: final.subject,
      relatedStoryId: params.relatedStoryId,
      status: "sent",
      providerMessageId: data?.id,
      metadata: sentMetadata,
    });
    if (marketing) noteMarketingSent();
    return { status: "sent" as const, id: data?.id };
  } catch (error) {
    await logEmailEvent({
      type: params.type,
      userId: params.userId,
      recipient,
      subject: final.subject,
      relatedStoryId: params.relatedStoryId,
      status: "failed",
      metadata: {
        ...params.metadata,
        error: error instanceof Error ? error.message.slice(0, 400) : "Unknown email send error",
      },
    });
    return { status: "failed" as const };
  }
}
