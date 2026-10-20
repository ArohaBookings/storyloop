import { Resend } from "resend";

import { EMAIL_FROM, EMAIL_REPLY_TO } from "./config";
import { renderLifecycleEmail, type LifecycleEmailType } from "./templates";
import { oneClickUnsubscribeUrl } from "./unsubscribe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

// Every template that is marketing rather than transactional. Kept in one place
// and asserted against the rendered template's own `marketing` flag at send
// time, so a new marketing email cannot be added and silently escape the cap.
// Every one of these honours the unsubscribe list. Each sent one also counts
// toward the weekly cap for the emails that come after it.
export const NUDGE_EMAIL_TYPES: LifecycleEmailType[] = [
  "no_first_story",
  "weekly_value",
  "feedback_request",
  "family_pack_prompt",
  "centre_planning_prompt",
  "went_quiet",
  "winback_offer",
  "referral_invite",
  "checkout_abandoned",
  "two_free_stories_used",
  "free_limit_reached",
];
// The moments someone is deciding whether to pay: one story left, out of free
// stories, left checkout. These used to sit under the weekly cap like a tip,
// so a routine "weekly value" email sent hours earlier swallowed them. In prod
// that happened 16 times between 15 Aug and 16 Oct 2026, including to two
// free educators who had both used every free story. They still respect the
// unsubscribe list and the once-only duplicate check; they are just never
// blocked by a less important email.
export const CAP_EXEMPT_EMAIL_TYPES: LifecycleEmailType[] = [
  "two_free_stories_used",
  "free_limit_reached",
  "checkout_abandoned",
];

/** Whether the weekly marketing cap may hold this email back. */
export function isHeldByFrequencyCap(type: LifecycleEmailType, marketing: boolean) {
  if (CAP_EXEMPT_EMAIL_TYPES.includes(type)) return false;
  return marketing || NUDGE_EMAIL_TYPES.includes(type);
}

// At most one marketing email per user per week. Transactional mail (receipts,
// payment failures, trial ending, password, referral earned) is never capped,
// because withholding those would be worse than sending them.
const NUDGE_COOLDOWN_DAYS = 7;

async function hasRecentNudgeEmail(userId: string, sinceIso: string) {
  const { data } = await createAdminSupabase()
    .from("email_events")
    .select("id")
    .eq("user_id", userId)
    .in("email_type", NUDGE_EMAIL_TYPES)
    .eq("delivery_status", "sent")
    .gte("sent_at", sinceIso)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

type SendLifecycleEmailParams = {
  type: LifecycleEmailType;
  userId: string;
  recipient: string | null | undefined;
  name?: string | null;
  relatedStoryId?: string | null;
  force?: boolean;
  /** A one-off campaign Leo chose to send: skips the five-day nudge cap, never the unsubscribe list or the duplicate check. */
  ignoreFrequencyCap?: boolean;
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

function cleanEmail(email: string | null | undefined) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

async function isUnsubscribed(recipient: string) {
  const sb = createAdminSupabase();
  const { data } = await sb
    .from("email_unsubscribes")
    .select("id")
    .eq("email", recipient)
    .maybeSingle();
  return Boolean(data);
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
  type,
  userId,
  recipient,
  subject,
  relatedStoryId,
  status,
  providerMessageId,
  metadata = {},
}: {
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

  if (!params.force && params.type !== "weekly_value") {
    const duplicate = await hasExistingEmail(params.type, params.userId, params.relatedStoryId, params.dedupeSince);
    if (duplicate) {
      await logEmailEvent({
        type: params.type,
        userId: params.userId,
        recipient,
        subject: email.subject,
        relatedStoryId: params.relatedStoryId,
        status: "skipped_duplicate",
        metadata: params.metadata,
      });
      return { status: "skipped_duplicate" as const };
    }
  }

  if (email.marketing && await isUnsubscribed(recipient)) {
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

  // Anti-spam frequency cap: at most one "nudge" email per user per window.
  if (!params.force && !params.ignoreFrequencyCap && isHeldByFrequencyCap(params.type, email.marketing)) {
    const since = new Date(Date.now() - NUDGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString();
    if (await hasRecentNudgeEmail(params.userId, since)) {
      await logEmailEvent({
        type: params.type,
        userId: params.userId,
        recipient,
        subject: email.subject,
        relatedStoryId: params.relatedStoryId,
        status: "skipped_frequency_cap",
        metadata: params.metadata,
      });
      return { status: "skipped_frequency_cap" as const };
    }
  }

  const apiKey = await getRuntimeSecret("RESEND_API_KEY", "resend_api_key");
  if (!apiKey) {
    await logEmailEvent({
      type: params.type,
      userId: params.userId,
      recipient,
      subject: email.subject,
      relatedStoryId: params.relatedStoryId,
      status: "skipped_unconfigured",
      metadata: params.metadata,
    });
    return { status: "skipped_unconfigured" as const };
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [recipient],
      replyTo: EMAIL_REPLY_TO,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: {
        "Idempotency-Key": `${params.type}-${params.userId}-${params.relatedStoryId ?? "none"}`,
        // One-click / native unsubscribe affordance in Gmail, Apple Mail, etc.
        // Only on marketing mail; transactional account emails omit it.
        ...(email.marketing
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
      type: params.type,
      userId: params.userId,
      recipient,
      subject: email.subject,
      relatedStoryId: params.relatedStoryId,
      status: "sent",
      providerMessageId: data?.id,
      metadata: { ...params.metadata, ctaUrl: email.ctaUrl },
    });
    return { status: "sent" as const, id: data?.id };
  } catch (error) {
    await logEmailEvent({
      type: params.type,
      userId: params.userId,
      recipient,
      subject: email.subject,
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
