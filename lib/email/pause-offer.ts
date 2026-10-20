import { Resend } from "resend";
import type Stripe from "stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getRuntimeSecret } from "@/lib/runtime-secrets";
import { chargeDay, createPauseToken, loadPauseView } from "@/lib/billing-pause";
import { EMAIL_FROM, EMAIL_REPLY_TO, SITE_URL } from "./config";

/**
 * "Want to pause?" for a paying educator who has not written a story yet
 * (Oct 2026). Offered, never forced: the button opens /pause, which changes
 * nothing until they press pause there. Sent one at a time by Leo's decision,
 * never by automation.
 */

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function money(cents: number, currency: string) {
  const c = currency.toLowerCase();
  const symbol = c === "nzd" ? "NZ$" : c === "aud" ? "A$" : `${currency.toUpperCase()} `;
  return `${symbol}${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

export function pauseUrl(token: string) {
  return `${SITE_URL}/pause?token=${encodeURIComponent(token)}&utm_source=storyloop_email&utm_medium=account&utm_campaign=pause_offer`;
}

export function renderPauseOfferEmail(input: { name?: string | null; amount: number; currency: string; nextChargeAt: string; url: string }) {
  const first = String(input.name ?? "").trim().split(/\s+/)[0] || "there";
  const greeting = input.currency.toLowerCase() === "nzd" ? `Kia ora ${first}` : `Hi ${first}`;
  const price = money(input.amount, input.currency);
  const day = chargeDay(input.nextChargeAt, input.currency);
  const subject = "Want to pause StoryLoop for a while?";
  const lines = [
    `${greeting},`,
    `You have not written a story with StoryLoop yet, and your next payment of ${price} is due on ${day}.`,
    "If now is not the right time, you can pause. Pausing skips your next payment and keeps your account just as it is. It restarts by itself after the time you choose, and you can restart it sooner.",
    `Pause my payments: ${input.url}`,
    "If you want to keep going, you do not need to do anything. And if you would like a hand with your first story, reply to this email.",
    "Leo",
    "StoryLoop, Christchurch",
  ];
  const html = `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>${esc(subject)}</title>
  </head>
  <body style="margin:0;background:#f8f1e7;font-family:Inter,Manrope,Arial,sans-serif;color:#24201d;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f1e7;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fffdf8;border:1px solid #eadbcc;border-radius:28px;overflow:hidden;">
            <tr>
              <td style="padding:28px;border-bottom:1px solid #efe3d7;background:#fffaf1;">
                <img src="${SITE_URL}/brand/storyloop-logo-email.png" width="190" height="44" alt="StoryLoop" style="display:block;border:0;" />
                <h1 style="margin:18px 0 0;font-family:Georgia,serif;font-size:26px;line-height:1.2;color:#1f1b18;">${esc(greeting)}, want to pause for a while?</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:15px;line-height:1.7;color:#3a332f;">
                <p style="margin:0 0 14px;">You have not written a story with StoryLoop yet, and your next payment of <strong>${esc(price)}</strong> is due on <strong>${esc(day)}</strong>.</p>
                <p style="margin:0 0 14px;">If now is not the right time, you can pause. Pausing skips your next payment and keeps your account just as it is. It restarts by itself after the time you choose, and you can restart it sooner.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;">
                  <tr>
                    <td style="border-radius:999px;background:#6f4930;">
                      <a href="${input.url}" style="display:inline-block;padding:14px 22px;border-radius:999px;color:#fffaf1;text-decoration:none;font-size:15px;font-weight:800;">Pause my payments</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 14px;">If you want to keep going, you do not need to do anything. And if you would like a hand with your first story, reply to this email.</p>
                <p style="margin:0;">Leo<br /><span style="color:#6f6660;">StoryLoop, Christchurch</span></p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px;background:#fbf6ee;border-top:1px solid #efe3d7;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6f6660;">An account email about your StoryLoop plan. Nothing changes unless you press pause on the page the button opens. Replies reach ${esc(EMAIL_REPLY_TO)}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return { subject, html, text: lines.join("\n\n") };
}

/** Sends the pause offer to one paying account, once. Returns why when it does not. */
export async function sendPauseOfferEmail(stripe: Stripe, userId: string, options: { dryRun?: boolean } = {}) {
  const admin = createAdminSupabase();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, email, full_name, stripe_customer_id, stripe_subscription_id, is_active, is_internal, total_stories")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.email || !profile.stripe_customer_id || profile.is_active === false) return { status: "skipped_no_subscription" as const };
  // The email says they have not written a story yet, so it must be true; and never to a team account.
  if (profile.is_internal) return { status: "skipped_internal" as const };
  if ((profile.total_stories ?? 0) > 0) return { status: "skipped_has_stories" as const };

  const { data: earlier } = await admin.from("email_events").select("id").eq("user_id", userId).eq("email_type", "pause_offer").eq("delivery_status", "sent").limit(1).maybeSingle();
  if (earlier) return { status: "skipped_duplicate" as const };

  const { view } = await loadPauseView(stripe, profile.stripe_customer_id, profile.stripe_subscription_id ?? null);
  if (view.status !== "can_pause" || !view.nextChargeAt || view.amount == null || !view.currency) return { status: "skipped_not_pausable" as const, view: view.status };

  const url = pauseUrl(createPauseToken(profile.id));
  const email = renderPauseOfferEmail({ name: profile.full_name, amount: view.amount, currency: view.currency, nextChargeAt: view.nextChargeAt, url });
  if (options.dryRun) return { status: "dry_run" as const, email, url };

  const apiKey = await getRuntimeSecret("RESEND_API_KEY", "resend_api_key");
  if (!apiKey) return { status: "skipped_unconfigured" as const };
  const { data, error } = await new Resend(apiKey).emails.send({
    from: EMAIL_FROM,
    to: [profile.email],
    replyTo: EMAIL_REPLY_TO,
    subject: email.subject,
    html: email.html,
    text: email.text,
    headers: { "Idempotency-Key": `pause-offer-${profile.id}` },
    tags: [{ name: "email_type", value: "pause_offer" }, { name: "product", value: "storyloop" }],
  });
  await admin.from("email_events").insert({
    email_type: "pause_offer",
    user_id: profile.id,
    recipient: profile.email,
    subject: email.subject,
    provider_message_id: data?.id ?? null,
    delivery_status: error ? "failed" : "sent",
    metadata: error ? { error: error.message.slice(0, 300) } : { trigger: "leo_pause_offer" },
    sent_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return { status: "sent" as const, id: data?.id };
}
