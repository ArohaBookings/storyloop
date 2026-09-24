import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase, logAdminAction } from "@/lib/supabase/admin";
import { sendLifecycleEmail } from "@/lib/email/send";
import { renderLifecycleEmail } from "@/lib/email/templates";
import {
  PRO_MONTH_CLAIM_DAYS,
  PRO_MONTH_OFFER_ID,
  proMonthAudience,
  proMonthFirstChargeDate,
  proMonthPrices,
  longDay,
} from "@/lib/offers";

export const maxDuration = 60;

/**
 * The "Pro free for a month" campaign, run from the admin.
 *
 *   GET                  audience: who would get it, and who is left out and why
 *   POST {action:"test"}  sends the real email to the admin's own address only
 *   POST {action:"send", limit}  grants the offer and sends, in batches
 *
 * Sending is batched (default 30, at most 40 per call) so one call finishes
 * well inside the function time limit and a day's email quota is never spent in
 * one go. Each person is granted the offer before their email is sent, and the
 * grant row records the send, so a batch that stops half way is simply resumed
 * by the next call: people already offered are skipped.
 */

const day = longDay;

/** Send results that mean this person has had the email (or must never get it). */
const DONE_STATUSES = new Set(["sent", "skipped_duplicate", "skipped_unsubscribed"]);

function emailContext(expiresAt: Date) {
  const prices = proMonthPrices();
  return {
    claimBy: day(expiresAt),
    firstChargeIfToday: day(proMonthFirstChargeDate()),
    proPrice: prices.pro,
    educatorPrice: prices.educator,
  };
}

async function loadAudience() {
  const sb = createAdminSupabase();
  const [profiles, members, unsubscribes, grants] = await Promise.all([
    sb.from("profiles").select("id, email, full_name, plan, subscription_status, stripe_subscription_id, is_internal, is_active, marketing_unsubscribed_at, created_at, total_stories, last_seen_at").limit(5000),
    sb.from("centre_members").select("user_id").eq("status", "active").limit(5000),
    sb.from("email_unsubscribes").select("email").limit(5000),
    sb.from("offer_grants").select("user_id, email_sent_at, email_status, clicked_at, checkout_started_at, redeemed_at").eq("offer_id", PRO_MONTH_OFFER_ID).limit(5000),
  ]);
  if (profiles.error) throw new Error(profiles.error.message);
  const audience = proMonthAudience({
    profiles: profiles.data ?? [],
    centreMemberIds: new Set((members.data ?? []).map((row) => row.user_id)),
    unsubscribedEmails: new Set((unsubscribes.data ?? []).map((row) => String(row.email).toLowerCase())),
    // Only a person whose email actually went (or who already claimed) is done.
    // A grant whose send failed, for example on the daily email limit, is sent
    // again by the next batch instead of being skipped for ever.
    alreadyGranted: new Set((grants.data ?? []).filter((row) => DONE_STATUSES.has(String(row.email_status)) || row.redeemed_at).map((row) => row.user_id)),
  });
  const grantRows = grants.data ?? [];
  return {
    audience,
    funnel: {
      offered: grantRows.length,
      sent: grantRows.filter((row) => row.email_status === "sent").length,
      clicked: grantRows.filter((row) => row.clicked_at).length,
      checkout: grantRows.filter((row) => row.checkout_started_at).length,
      redeemed: grantRows.filter((row) => row.redeemed_at).length,
    },
  };
}

export async function GET() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { audience, funnel } = await loadAudience();
  const expiresAt = new Date(Date.now() + PRO_MONTH_CLAIM_DAYS * 86_400_000);
  const preview = renderLifecycleEmail({
    type: "pro_month_offer",
    userId: "preview",
    recipient: "preview@storyloop.space",
    name: "Aroha",
    context: emailContext(expiresAt),
  });
  return NextResponse.json({
    offer: PRO_MONTH_OFFER_ID,
    toSend: audience.include.length,
    excluded: audience.excluded,
    recipients: audience.include.map((profile) => ({
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      stories: profile.total_stories ?? 0,
      lastSeen: profile.last_seen_at,
    })),
    funnel,
    preview: { subject: preview.subject, html: preview.html },
  });
}

export async function POST(request: NextRequest) {
  const session = await verifyAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const sb = createAdminSupabase();
  const expiresAt = new Date(Date.now() + PRO_MONTH_CLAIM_DAYS * 86_400_000);

  if (body.action === "test") {
    // The admin's own profile, so the unsubscribe link and name are real.
    const { data: me } = await sb.from("profiles").select("id, email, full_name").eq("email", session.email.toLowerCase()).maybeSingle();
    if (!me) return NextResponse.json({ error: "No StoryLoop profile for the admin email." }, { status: 404 });
    const result = await sendLifecycleEmail({
      type: "pro_month_offer",
      userId: me.id,
      recipient: me.email,
      name: me.full_name,
      force: true,
      context: emailContext(expiresAt),
      metadata: { offer: PRO_MONTH_OFFER_ID, test: true },
    });
    await logAdminAction("campaign_test", "offer", PRO_MONTH_OFFER_ID, { to: me.email, status: result.status });
    return NextResponse.json({ ok: result.status === "sent", status: result.status, to: me.email });
  }

  if (body.action === "send") {
    if (body.confirm !== PRO_MONTH_OFFER_ID) {
      return NextResponse.json({ error: "Confirm by sending the offer id." }, { status: 400 });
    }
    const limit = Math.min(40, Math.max(1, Number(body.limit) || 30));
    const { audience } = await loadAudience();
    const batch = audience.include.slice(0, limit);
    const results: Array<{ id: string; status: string }> = [];
    for (const profile of batch) {
      // Grant first: the offer exists for this person even if the send fails,
      // and the next batch will not email them twice.
      const { error: grantError } = await sb.from("offer_grants").upsert(
        { user_id: profile.id, offer_id: PRO_MONTH_OFFER_ID, expires_at: expiresAt.toISOString() },
        { onConflict: "user_id,offer_id", ignoreDuplicates: true },
      );
      if (grantError) {
        results.push({ id: profile.id, status: `grant_failed: ${grantError.message}` });
        continue;
      }
      // A retried send keeps the claim-by date of the original grant.
      const { data: grant } = await sb.from("offer_grants").select("expires_at").eq("user_id", profile.id).eq("offer_id", PRO_MONTH_OFFER_ID).maybeSingle();
      const personExpiry = grant?.expires_at ? new Date(grant.expires_at) : expiresAt;
      const result = await sendLifecycleEmail({
        type: "pro_month_offer",
        userId: profile.id,
        recipient: profile.email,
        name: profile.full_name,
        ignoreFrequencyCap: true,
        context: emailContext(personExpiry),
        metadata: { offer: PRO_MONTH_OFFER_ID },
      });
      await sb
        .from("offer_grants")
        .update({ email_sent_at: new Date().toISOString(), email_status: result.status })
        .eq("user_id", profile.id)
        .eq("offer_id", PRO_MONTH_OFFER_ID);
      results.push({ id: profile.id, status: result.status });
      // Resend allows a few requests a second; stay well under it.
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
    await logAdminAction("campaign_send", "offer", PRO_MONTH_OFFER_ID, {
      batch: batch.length,
      sent: results.filter((row) => row.status === "sent").length,
      remaining: Math.max(0, audience.include.length - batch.length),
    });
    return NextResponse.json({
      sent: results.filter((row) => row.status === "sent").length,
      results,
      remaining: Math.max(0, audience.include.length - batch.length),
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
