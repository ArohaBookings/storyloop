import { Resend } from "resend";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { getRuntimeSecret } from "@/lib/runtime-secrets";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { EMAIL_FROM, EMAIL_REPLY_TO, SITE_URL } from "./config";

/**
 * A one-tap sign-in link, for people who have forgotten the password they set
 * months ago. Added 24 Sept 2026 after the free-month email: people clicked
 * through to the offer signed out, and a forgotten password stood between them
 * and the claim. Same pattern as the password reset: Supabase issues a
 * single-use token, StoryLoop sends the email through Resend, and
 * /auth/confirm exchanges the token for a session.
 *
 * Only sent to an existing StoryLoop account; the caller always answers the
 * same way, so the form cannot be used to find out who has an account.
 */

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function signInConfirmUrl(tokenHash: string, redirect: string) {
  const next = safeRedirectPath(redirect);
  return `${SITE_URL}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&redirect=${encodeURIComponent(next)}`;
}

export async function sendSignInLinkEmail(email: string, redirect: string) {
  const recipient = email.trim().toLowerCase();
  if (!recipient) return { status: "skipped_no_email" as const };

  const admin = createAdminSupabase();
  const { data: profile } = await admin.from("profiles").select("id, full_name, is_active").eq("email", recipient).maybeSingle();
  if (!profile || profile.is_active === false) return { status: "skipped_no_account" as const };

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: recipient });
  if (error) throw error;
  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) throw new Error("Supabase did not return a sign-in token.");

  const url = signInConfirmUrl(tokenHash, redirect);
  const apiKey = await getRuntimeSecret("RESEND_API_KEY", "resend_api_key");
  if (!apiKey) return { status: "skipped_unconfigured" as const, url };

  const first = String(profile.full_name ?? "").trim().split(/\s+/)[0] || "there";
  const subject = "Your StoryLoop sign-in link";
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
                <h1 style="margin:18px 0 0;font-family:Georgia,serif;font-size:28px;line-height:1.15;color:#1f1b18;">Kia ora ${esc(first)}, here is your sign-in link</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:15px;line-height:1.7;color:#3a332f;">
                <p style="margin:0;">Tap the button to sign in to StoryLoop. No password needed. The link works once, for the next hour.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="border-radius:999px;background:#6f4930;">
                      <a href="${url}" style="display:inline-block;padding:14px 22px;border-radius:999px;color:#fffaf1;text-decoration:none;font-size:15px;font-weight:800;">Sign in to StoryLoop</a>
                    </td>
                  </tr>
                </table>
                <p style="margin-top:22px;font-size:12px;line-height:1.6;color:#6f6660;">If you did not ask for this, you can ignore this email. Nobody can sign in without the link.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 28px;background:#fbf6ee;border-top:1px solid #efe3d7;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6f6660;">StoryLoop by Aria Care. Reply to this email and it will reach ${esc(EMAIL_REPLY_TO)}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  const text = [subject, "", `Kia ora ${first},`, "Tap this link to sign in to StoryLoop. No password needed. It works once, for the next hour:", url, "", "If you did not ask for this, you can ignore this email."].join("\n");

  const resend = new Resend(apiKey);
  const { data: sent, error: sendError } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [recipient],
    replyTo: EMAIL_REPLY_TO,
    subject,
    html,
    text,
    headers: { "Idempotency-Key": `sign-in-link-${recipient}-${tokenHash.slice(0, 12)}` },
    tags: [
      { name: "email_type", value: "sign_in_link" },
      { name: "product", value: "storyloop" },
    ],
  });
  if (sendError) throw new Error(sendError.message);
  return { status: "sent" as const, id: sent?.id };
}
