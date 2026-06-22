import { Resend } from "resend";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { getRuntimeSecret } from "@/lib/runtime-secrets";
import { EMAIL_FROM, EMAIL_REPLY_TO, SITE_URL } from "./config";

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendPasswordResetEmail(email: string) {
  const recipient = email.trim().toLowerCase();
  if (!recipient) throw new Error("Missing email");

  const { data, error } = await createAdminSupabase().auth.admin.generateLink({
    type: "recovery",
    email: recipient,
  });

  if (error) throw error;

  const tokenHash = data.properties?.hashed_token;
  if (!tokenHash) throw new Error("Supabase did not return a recovery token.");

  const resetUrl = `${SITE_URL}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
  const apiKey = await getRuntimeSecret("RESEND_API_KEY", "resend_api_key");
  if (!apiKey) {
    return { status: "skipped_unconfigured" as const, resetUrl };
  }

  const resend = new Resend(apiKey);
  const subject = "Reset your StoryLoop password";
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
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fffdf8;border:1px solid #eadbcc;border-radius:28px;overflow:hidden;box-shadow:0 18px 45px rgba(64,43,31,.08);">
            <tr>
              <td style="padding:28px;border-bottom:1px solid #efe3d7;background:linear-gradient(135deg,#fffaf1,#f4eadf);">
                <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#9a6b46;">StoryLoop</p>
                <h1 style="margin:0;font-family:Georgia,serif;font-size:30px;line-height:1.1;color:#1f1b18;">Reset your password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;font-size:15px;line-height:1.7;color:#3a332f;">
                <p>You asked to reset your StoryLoop password.</p>
                <p>Use the secure link below to choose a new password. For security, the link can only be used once.</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td style="border-radius:999px;background:#7a4f34;">
                      <a href="${resetUrl}" style="display:inline-block;padding:13px 20px;border-radius:999px;color:#fffaf1;text-decoration:none;font-size:14px;font-weight:800;">Choose a new password</a>
                    </td>
                  </tr>
                </table>
                <p style="margin-top:22px;font-size:12px;line-height:1.6;color:#6f6660;">If you did not request this, you can ignore this email.</p>
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

  const text = [
    subject,
    "",
    "You asked to reset your StoryLoop password.",
    "Use this secure link to choose a new password:",
    resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
    `Reply to ${EMAIL_REPLY_TO}.`,
  ].join("\n");

  const { data: sent, error: sendError } = await resend.emails.send({
    from: EMAIL_FROM,
    to: [recipient],
    replyTo: EMAIL_REPLY_TO,
    subject,
    html,
    text,
    headers: {
      "Idempotency-Key": `password-reset-${recipient}-${tokenHash.slice(0, 12)}`,
    },
    tags: [
      { name: "email_type", value: "password_reset" },
      { name: "product", value: "storyloop" },
    ],
  });

  if (sendError) throw new Error(sendError.message);

  return { status: "sent" as const, id: sent?.id, resetUrl };
}
