import { Resend } from "resend";

import { EMAIL_FROM, EMAIL_REPLY_TO } from "./config";
import { renderLifecycleEmail, type LifecycleEmailType } from "./templates";
import { oneClickUnsubscribeUrl } from "./unsubscribe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

// The recurring "nudge" emails — the ones that can feel like spam if they
// stack. We never send more than one of these to a user within the cooldown
// window, so an active educator can't get several tips/reminders in a few days.
// Time-sensitive account emails (welcome, first story, limit reached, payment)
// are deliberately NOT in this list and always send.
const NUDGE_EMAIL_TYPES: LifecycleEmailType[] = [
  "no_first_story",
  "weekly_value",
  "feedback_request",
  "family_pack_prompt",
  "centre_planning_prompt",
];
const NUDGE_COOLDOWN_DAYS = 5;

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
  metadata?: Record<string, unknown>;
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

async function hasExistingEmail(type: LifecycleEmailType, userId: string, relatedStoryId?: string | null) {
  let query = createAdminSupabase()
    .from("email_events")
    .select("id")
    .eq("user_id", userId)
    .eq("email_type", type)
    .in("delivery_status", ["sent", "skipped_unconfigured"]);

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
  });

  if (!params.force && params.type !== "weekly_value") {
    const duplicate = await hasExistingEmail(params.type, params.userId, params.relatedStoryId);
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
  if (!params.force && NUDGE_EMAIL_TYPES.includes(params.type)) {
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
