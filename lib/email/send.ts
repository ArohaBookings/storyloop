import { Resend } from "resend";

import { EMAIL_FROM, EMAIL_REPLY_TO } from "./config";
import { renderLifecycleEmail, type LifecycleEmailType } from "./templates";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

type SendLifecycleEmailParams = {
  type: LifecycleEmailType;
  userId: string;
  recipient: string | null | undefined;
  name?: string | null;
  relatedStoryId?: string | null;
  force?: boolean;
  metadata?: Record<string, unknown>;
};

type EmailStatus = "sent" | "skipped_unconfigured" | "skipped_unsubscribed" | "skipped_duplicate" | "failed";

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
