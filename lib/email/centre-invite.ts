import { Resend } from "resend";

import { EMAIL_FROM, EMAIL_REPLY_TO, SITE_URL } from "./config";
import { getRuntimeSecret } from "@/lib/runtime-secrets";

/**
 * Centre invitations.
 *
 * Deliberately NOT part of the lifecycle email system. That system keys
 * everything on a user id, for dedupe, unsubscribe and frequency capping, and
 * an invitee usually has no account yet. Password reset has the same shape and
 * is also standalone; this follows it.
 *
 * It is transactional: someone asked for it to be sent, to a named address, in
 * response to an action. There is no unsubscribe link for the same reason there
 * is none on a password reset.
 */

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendCentreInviteEmail(opts: {
  to: string;
  centreName: string;
  inviterName: string | null;
  token: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = await getRuntimeSecret("RESEND_API_KEY", "resend_api_key");
  if (!apiKey) return { sent: false, reason: "unconfigured" };

  const url = `${SITE_URL}/centre/join?token=${encodeURIComponent(opts.token)}`;
  const inviter = opts.inviterName?.trim() || "A colleague";
  const centre = opts.centreName.trim() || "their centre";

  const subject = `${inviter} invited you to ${centre} on StoryLoop`;

  const html = `<!doctype html><html><body style="margin:0;background:#f6f1e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e8;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border:1px solid #efe3d7;border-radius:18px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <tr><td style="padding:28px 28px 18px;border-bottom:1px solid #efe3d7;background:linear-gradient(135deg,#fffaf1,#f4eadf);">
          <img src="${SITE_URL}/images/logo-email.png" width="40" height="40" alt="StoryLoop" style="display:block;width:40px;height:40px;border:0;margin:0 0 12px;border-radius:9px;" />
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#9a6b46;">StoryLoop</p>
          <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;line-height:1.15;color:#1f1b18;">You have been invited to ${esc(centre)}</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <div style="font-size:15px;line-height:1.72;color:#3a332f;">
            <p style="margin:0 0 14px;">${esc(inviter)} has invited you to join <strong>${esc(centre)}</strong> on StoryLoop, which turns a rough observation or a voice note into an editable learning story draft.</p>
            <p style="margin:0 0 14px;"><strong>Your drafts stay yours.</strong> Joining a centre lets leadership see that you are writing and when. It does not let them read what you wrote, unless you turn sharing on yourself, and you can turn it off again whenever you like.</p>
          </div>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;">
            <tr><td style="border-radius:999px;background:#7a4f34;">
              <a href="${url}" style="display:inline-block;padding:13px 22px;border-radius:999px;color:#fffaf1;text-decoration:none;font-size:14px;font-weight:800;">Join ${esc(centre)}</a>
            </td></tr>
          </table>
          <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#6f6660;">This invitation expires in 14 days. If you were not expecting it, you can ignore this email and nothing happens.</p>
        </td></tr>
        <tr><td style="padding:22px 28px;background:#fbf6ee;border-top:1px solid #efe3d7;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#6f6660;">StoryLoop by Aria Care. Reply to this email and it will reach ${esc(EMAIL_REPLY_TO)}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;

  const text = [
    `${inviter} has invited you to join ${centre} on StoryLoop.`,
    "",
    "StoryLoop turns a rough observation or voice note into an editable learning story draft.",
    "",
    "Your drafts stay yours. Joining a centre lets leadership see that you are writing and when.",
    "It does not let them read what you wrote unless you turn sharing on yourself.",
    "",
    `Join here: ${url}`,
    "",
    "This invitation expires in 14 days. If you were not expecting it, ignore this email.",
  ].join("\n");

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: opts.to,
      replyTo: EMAIL_REPLY_TO,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("Centre invite email failed:", error);
      return { sent: false, reason: "send_failed" };
    }
    return { sent: true };
  } catch (error) {
    console.error("Centre invite email threw:", error);
    return { sent: false, reason: "threw" };
  }
}
