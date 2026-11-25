import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import { EMAIL_FROM, EMAIL_REPLY_TO, SITE_URL } from "./config";
import { getRuntimeSecret } from "@/lib/runtime-secrets";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { loadGlobalEmailState } from "@/lib/email/brain-state";
import { recordServerEvent } from "@/lib/analytics/server";
import { LEADER_EMAIL_ON } from "@/lib/build-switches";
import { checkUrl, cleanCentreName } from "@/lib/story-check";
import { canSendLeaderEmail, isStoppedAddress, recipientHash, reminderDue, senderFirstName, stopToken, type HeldReason } from "@/lib/leader-email";

/**
 * The leader email and its one reminder (25 Nov 2026, A2).
 *
 * Standalone and transactional, like the centre invitation: the educator asked
 * for it to go to an address she typed and confirmed. Not the lifecycle
 * brain, which keys on an account and caps marketing per person. It still
 * respects the brain's global pause, the suppression list (for ever), and a
 * cap of three a day per educator.
 *
 * Never in it: a child's name, a word of the note or the story, a price, a
 * plan, an offer, the educator's email or surname, a tracked or redirected
 * link, an open pixel. The link carries its key after the #, which a click
 * tracker would copy into a query string, so there is no tracking at all.
 */

export const LEADER_EMAIL_TYPE = "leader_check";
export const LEADER_REMINDER_TYPE = "leader_check_reminder";

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function day(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-NZ", { day: "numeric", month: "long", timeZone: "Pacific/Auckland" });
}

export type LeaderEmailInput = {
  firstName: string;
  centreName: string;
  kind: "story" | "set";
  pieces: number;
  /** The private link. Empty for the reminder: the key is never kept, so the reminder points to the first email. */
  linkUrl: string;
  stopUrl: string;
  expiresAt: string;
  /** When the first email went, for the reminder's wording. */
  sentAt?: string;
  reminder: boolean;
};

/** Subject, html and text. Pure, for the tests. */
export function renderLeaderEmail(input: LeaderEmailInput) {
  const who = input.firstName;
  const at = cleanCentreName(input.centreName);
  const from = at ? `${who} at ${at}` : who;
  const what = input.kind === "set" ? `${input.pieces} ${input.pieces === 1 ? "statement" : "statements"}` : "a learning story";
  const button = input.kind === "set" ? "Open the statements" : "Open the story";
  const until = day(input.expiresAt);
  const subject = input.reminder ? `${who}'s ${input.kind === "set" ? "statements are" : "learning story is"} still waiting for you` : `${who} asked you to check ${what}`;
  const preview = input.reminder ? `Open until ${until}. About two minutes.` : `About two minutes. Nothing to sign up for.`;
  const lines = input.reminder
    ? [
        `${from} sent you ${what} to check on ${day(input.sentAt ?? "") || "two days ago"}. It is still waiting for you, until ${until}.`,
        `Open the first email from ${who} via StoryLoop and tap ${button}. For safety the private link is only ever in that first email.`,
        "It takes about two minutes, and there is nothing to sign up for. This is the only reminder.",
      ]
    : [
        `${from} would like you to check ${what} before ${input.kind === "set" ? "they go" : "it goes"} any further. You will see what ${who} wrote down beside the draft, then choose Looks good or Suggest a change.`,
        "It takes about two minutes, and there is nothing to sign up for.",
      ];
  const after = [
    `If you do not know ${who}, ignore this. The link stops working on ${until}.`,
    `Replies to this email go to StoryLoop, not to ${who}. Please answer on the page.`,
  ];
  const html = `<!doctype html><html><body style="margin:0;background:#f6f1e8;">
  <span style="display:none;max-height:0;overflow:hidden;">${esc(preview)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f1e8;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border:1px solid #efe3d7;border-radius:18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:800;color:#9a6b46;">StoryLoop, for ${esc(who)}</p>
          <h1 style="margin:0;font-family:Georgia,serif;font-size:26px;line-height:1.2;color:#1f1b18;">${esc(subject)}</h1>
        </td></tr>
        <tr><td style="padding:16px 28px 28px;">
          <div style="font-size:15px;line-height:1.7;color:#3a332f;">
            ${lines.map((line) => `<p style="margin:0 0 14px;">${esc(line)}</p>`).join("\n            ")}
          </div>
          ${input.linkUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 18px;">
            <tr><td style="border-radius:999px;background:#7a4f34;">
              <a href="${esc(input.linkUrl)}" style="display:inline-block;padding:13px 24px;border-radius:999px;color:#fffaf1;text-decoration:none;font-size:15px;font-weight:800;">${button}</a>
            </td></tr>
          </table>` : ""}
          ${after.map((line) => `<p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6f6660;">${esc(line)}</p>`).join("\n          ")}
        </td></tr>
        <tr><td style="padding:18px 28px;background:#fbf6ee;border-top:1px solid #efe3d7;border-radius:0 0 18px 18px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#6f6660;">StoryLoop by Aria Care sent this for ${esc(who)}. Questions: ${esc(EMAIL_REPLY_TO)}. <a href="${esc(input.stopUrl)}" style="color:#6f6660;">Stop these emails</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
  const text = [
    ...lines,
    ...(input.linkUrl ? ["", `${button}: ${input.linkUrl}`] : []),
    "",
    ...after,
    "",
    `StoryLoop by Aria Care sent this for ${who}. Questions: ${EMAIL_REPLY_TO}`,
    `Stop these emails: ${input.stopUrl}`,
  ].join("\n");
  return { subject, html, text, fromName: `${who} via StoryLoop` };
}

/** The stop link names the send, never the address (MERGE2 2a). */
export function leaderStopUrl(sendId: string) {
  return `${SITE_URL}/stop?t=${encodeURIComponent(stopToken(sendId))}`;
}

function fromHeader(name: string) {
  // "Sam via StoryLoop <storyloop@ariacare.app>": the address stays StoryLoop's own.
  const address = /<([^>]+)>/.exec(EMAIL_FROM)?.[1] ?? EMAIL_FROM;
  return `${name.replace(/["<>]/g, "")} <${address}>`;
}

/**
 * Held for ever when the leader pressed Stop (the hash on leader_stop_list), or
 * when the address bounced or complained (email_unsubscribes, as for every
 * StoryLoop email). A read that fails holds the email: never send on doubt.
 */
async function isSuppressed(address: string) {
  const sb = createAdminSupabase();
  const [bounced, stopped] = await Promise.all([
    sb.from("email_unsubscribes").select("id").eq("email", address).limit(1),
    sb.from("leader_stop_list").select("recipient_hash").eq("recipient_hash", recipientHash(address)).limit(1),
  ]);
  if (stopped.error) return true;
  return Boolean(bounced.data?.length) || isStoppedAddress(address, (stopped.data ?? []).map((row) => String(row.recipient_hash)));
}

type SendResult = { sent: true } | { sent: false; reason: HeldReason | "failed" };

async function deliver(input: { to: string; rendered: ReturnType<typeof renderLeaderEmail>; idempotencyKey: string; type: string; sendId: string; stopUrl: string }): Promise<{ ok: boolean; eventId: string }> {
  const eventId = randomUUID();
  const apiKey = await getRuntimeSecret("RESEND_API_KEY", "resend_api_key");
  const sb = createAdminSupabase();
  const log = (status: string, providerMessageId: string | null) =>
    sb.from("email_events").insert({
      id: eventId,
      email_type: input.type,
      user_id: null,
      recipient: input.to,
      subject: input.rendered.subject,
      provider_message_id: providerMessageId,
      delivery_status: status,
      metadata: { kind: "leader", send_id: input.sendId },
      sent_at: new Date().toISOString(),
    }).then(undefined, (error: unknown) => console.error("Leader email log failed:", error));
  if (!apiKey) {
    await log("skipped_unconfigured", null);
    return { ok: false, eventId };
  }
  try {
    const { data, error } = await new Resend(apiKey).emails.send({
      from: fromHeader(input.rendered.fromName),
      to: [input.to],
      replyTo: EMAIL_REPLY_TO,
      subject: input.rendered.subject,
      html: input.rendered.html,
      text: input.rendered.text,
      headers: {
        "Idempotency-Key": input.idempotencyKey,
        "List-Unsubscribe": `<${input.stopUrl.replace("/stop?", "/api/email/leader-stop?")}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [{ name: "email_type", value: input.type }, { name: "product", value: "storyloop" }],
    });
    if (error) throw new Error(error.message);
    await log("sent", data?.id ?? null);
    return { ok: true, eventId };
  } catch (error) {
    console.error("Leader email failed:", error);
    await log("failed", null);
    return { ok: false, eventId };
  }
}

/**
 * Send the first email for a link she just made. The link is already made
 * either way: a hold or a failure only means she copies it herself.
 */
export async function sendLeaderEmail(input: {
  userId: string;
  ownEmail: string | null;
  fullName: string | null;
  kind: "story" | "set";
  checkId?: string;
  setId?: string;
  token: string;
  address: string;
  centreName: string;
  pieces: number;
  expiresAt: string;
  now?: Date;
}): Promise<SendResult> {
  const now = input.now ?? new Date();
  const sb = createAdminSupabase();
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const hash = input.address ? recipientHash(input.address) : "";
  const [{ count }, existing, suppressed, global, toAddressDay, toAddressWeek, everyone] = await Promise.all([
    sb.from("leader_emails").select("id", { count: "exact", head: true }).eq("user_id", input.userId).gte("created_at", since),
    input.checkId
      ? sb.from("leader_emails").select("id").eq("check_id", input.checkId).limit(1)
      : sb.from("leader_emails").select("id").eq("set_id", input.setId ?? "").limit(1),
    input.address ? isSuppressed(input.address) : Promise.resolve(false),
    loadGlobalEmailState(now).catch(() => ({ pausedReason: "unknown" })),
    // One address from every account together, and all of StoryLoop's leader email (R2-5).
    sb.from("leader_emails").select("id", { count: "exact", head: true }).eq("recipient_hash", hash).gte("created_at", since),
    sb.from("leader_emails").select("id", { count: "exact", head: true }).eq("recipient_hash", hash).gte("created_at", weekAgo),
    sb.from("leader_emails").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);
  const firstName = senderFirstName(input.fullName, input.ownEmail);
  const verdict = canSendLeaderEmail({
    switchOn: LEADER_EMAIL_ON,
    address: input.address,
    ownEmail: input.ownEmail,
    firstName,
    suppressed,
    sentLast24h: count ?? 0,
    alreadyForThisLink: Boolean(existing.data?.length),
    paused: Boolean(global.pausedReason),
    recipientLast24h: toAddressDay.count ?? 0,
    recipientLast7d: toAddressWeek.count ?? 0,
    allLast24h: everyone.count ?? 0,
  });
  if (!verdict.ok) {
    if (["cap", "recipient_cap", "suppressed", "paused", "no_name", "invalid"].includes(verdict.reason)) {
      await recordServerEvent(sb, { event: "leader_email_held", userId: input.userId, path: "/check", metadata: { reason: verdict.reason } });
    }
    return { sent: false, reason: verdict.reason };
  }
  // The row first: its unique index on the check or set makes a second send impossible.
  const { data: row, error } = await sb
    .from("leader_emails")
    .insert({
      user_id: input.userId,
      check_id: input.checkId ?? null,
      set_id: input.setId ?? null,
      recipient: input.address,
      recipient_hash: recipientHash(input.address),
      status: "sent",
      first_sent_at: now.toISOString(),
      reminder_due_at: new Date(now.getTime() + 48 * 3_600_000).toISOString(),
    })
    .select("id")
    .single();
  // Only the unique index means "already emailed"; any other error is a failure she can retry (R1-11).
  if (error || !row) return { sent: false, reason: error?.code === "23505" ? "duplicate" : "failed" };
  const stopUrl = leaderStopUrl(row.id);
  const rendered = renderLeaderEmail({
    firstName,
    centreName: input.centreName,
    kind: input.kind,
    pieces: input.pieces,
    linkUrl: checkUrl(SITE_URL, input.token),
    stopUrl,
    expiresAt: input.expiresAt,
    reminder: false,
  });
  // Keyed on the link and the address, not the row: if a send that looked failed did
  // leave, a retry to the same address is the same email to Resend and goes once.
  const linkId = input.checkId ?? input.setId ?? row.id;
  const result = await deliver({ to: input.address, rendered, idempotencyKey: `leader-first-${linkId}-${recipientHash(input.address).slice(0, 16)}`, type: LEADER_EMAIL_TYPE, sendId: row.id, stopUrl });
  if (!result.ok) {
    // It did not leave: the row goes, so it is not "already emailed", does not use one
    // of her 3 a day, and no reminder is ever due for it. The email_events row keeps
    // the failure on record.
    await sb.from("leader_emails").delete().eq("id", row.id);
    await sb.from("email_events").update({ recipient: null }).eq("metadata->>send_id", row.id);
    return { sent: false, reason: "failed" };
  }
  await sb.from("leader_emails").update({ first_event_id: result.eventId }).eq("id", row.id);
  await recordServerEvent(sb, { event: "leader_email_sent", userId: input.userId, path: "/check", metadata: { kind: input.kind, reminder: false } });
  return { sent: true };
}

type Admin = ReturnType<typeof createAdminSupabase>;

/**
 * Drop the leader's address from leader_emails AND from the email log
 * (email_events, matched on metadata.send_id), so /privacy and /data-sheet are
 * true: it is kept only while a reminder may still go (R2-2, R4-1).
 */
async function forgetLeaderAddress(sb: Admin, rowId: string, patch: Record<string, unknown>, options: { onlyWaiting?: boolean } = {}) {
  let update = sb.from("leader_emails").update({ ...patch, recipient: null }).eq("id", rowId);
  if (options.onlyWaiting) update = update.eq("status", "sent").is("reminder_sent_at", null);
  await update;
  await sb.from("email_events").update({ recipient: null }).eq("metadata->>send_id", rowId);
}

/** Her leader opened or answered the link: no reminder will go, so the address goes now. Never throws. */
export async function forgetLeaderAddressOnOpen(link: { checkId?: string; setId?: string }) {
  try {
    const sb = createAdminSupabase();
    const query = sb.from("leader_emails").update({ status: "opened", recipient: null }).eq("status", "sent").is("reminder_sent_at", null);
    const { data } = await (link.checkId ? query.eq("check_id", link.checkId) : query.eq("set_id", link.setId ?? "")).select("id");
    for (const row of data ?? []) await sb.from("email_events").update({ recipient: null }).eq("metadata->>send_id", row.id);
  } catch (error) {
    console.error("Leader address drop on open failed (the cron drops it later):", error);
  }
}

type DueRow = { id: string; user_id: string; check_id: string | null; set_id: string | null; recipient: string | null; status: string; first_sent_at: string | null; reminder_sent_at: string | null };

/**
 * The one reminder, from the email cron. A row is claimed with a conditional
 * update before anything is sent, so two runs at once send one reminder.
 * After the reminder, and for every row whose link was opened, answered,
 * stopped or ended, the address is dropped (its hash stays, for counting).
 */
export async function sendLeaderReminders(now = new Date()): Promise<{ checked: number; reminded: number; forgotten: number }> {
  if (!LEADER_EMAIL_ON) return { checked: 0, reminded: 0, forgotten: 0 };
  const sb = createAdminSupabase();
  const { data } = await sb
    .from("leader_emails")
    .select("id, user_id, check_id, set_id, recipient, status, first_sent_at, reminder_sent_at")
    .eq("status", "sent")
    .is("reminder_sent_at", null)
    .lte("reminder_due_at", now.toISOString())
    // Rows whose address was already dropped never come back, so ended links cannot crowd out due ones (R1-5).
    .not("recipient", "is", null)
    .order("reminder_due_at", { ascending: true })
    .limit(50);
  const rows = (data ?? []) as DueRow[];
  const global = await loadGlobalEmailState(now).catch(() => ({ pausedReason: "unknown" }));
  let reminded = 0;
  let forgotten = 0;
  for (const row of rows) {
    try {
      const link = row.check_id
        ? (await sb.from("story_checks").select("status, opened_at, revoked_at, expires_at, centre_name").eq("id", row.check_id).maybeSingle()).data
        : (await sb.from("leader_sets").select("status, opened_at, revoked_at, expires_at, centre_name").eq("id", row.set_id ?? "").maybeSingle()).data;
      if (!row.recipient) continue;
      if (!link) {
        // The link row is gone: no reminder can go, so the address goes too.
        await forgetLeaderAddress(sb, row.id, {});
        forgotten++;
        continue;
      }
      const answered = ["approved", "changes", "answered"].includes(String(link.status));
      const suppressed = await isSuppressed(row.recipient);
      const due = reminderDue(row, { openedAt: link.opened_at, answered, revokedAt: link.revoked_at, expiresAt: link.expires_at, suppressed, paused: Boolean(global.pausedReason) }, now);
      if (!due) {
        // Opened, answered, ended or stopped: no reminder will ever go, so the address is not kept.
        if (link.opened_at || answered || link.revoked_at || suppressed || Date.parse(link.expires_at) <= now.getTime()) {
          await forgetLeaderAddress(sb, row.id, { status: link.opened_at || answered ? "opened" : suppressed ? "stopped" : "sent" }, { onlyWaiting: true });
          forgotten++;
        }
        continue;
      }
      // Claim first: only one run can move this row from sent to reminded.
      const { data: claimed } = await sb.from("leader_emails").update({ reminder_sent_at: now.toISOString(), status: "reminded" }).eq("id", row.id).is("reminder_sent_at", null).eq("status", "sent").select("id").maybeSingle();
      if (!claimed) continue;
      const { data: profile } = await sb.from("profiles").select("full_name, email").eq("id", row.user_id).maybeSingle();
      const firstName = senderFirstName(profile?.full_name ?? null, profile?.email ?? null) || "An educator";
      const pieces = row.set_id ? ((await sb.from("leader_set_items").select("id", { count: "exact", head: true }).eq("set_id", row.set_id)).count ?? 1) : 1;
      const stopUrl = leaderStopUrl(row.id);
      const rendered = renderLeaderEmail({ firstName, centreName: link.centre_name ?? "", kind: row.set_id ? "set" : "story", pieces, linkUrl: "", stopUrl, expiresAt: link.expires_at, sentAt: row.first_sent_at ?? undefined, reminder: true });
      const result = await deliver({ to: row.recipient, rendered, idempotencyKey: `leader-reminder-${row.id}`, type: LEADER_REMINDER_TYPE, sendId: row.id, stopUrl });
      await forgetLeaderAddress(sb, row.id, { reminder_event_id: result.eventId });
      if (result.ok) {
        reminded++;
        await recordServerEvent(sb, { event: "leader_email_sent", userId: row.user_id, path: "/check", metadata: { kind: row.set_id ? "set" : "story", reminder: true } });
      }
    } catch (error) {
      console.error("Leader reminder failed for one row (others continue):", error);
    }
  }
  return { checked: rows.length, reminded, forgotten };
}

/**
 * "Stop these emails" (MERGE2 2a). The token names one send; its address hash
 * goes on leader_stop_list for ever, and every reminder still waiting for that
 * address, from anyone, is cancelled. The address itself is never read or
 * written here. False when the send no longer exists (her account was deleted),
 * so the page can say so honestly.
 */
export async function stopLeaderEmails(sendId: string): Promise<boolean> {
  const sb = createAdminSupabase();
  const { data: send } = await sb.from("leader_emails").select("recipient_hash, set_id").eq("id", sendId).maybeSingle();
  if (!send?.recipient_hash) return false;
  const hash = String(send.recipient_hash);
  const { error } = await sb.from("leader_stop_list").upsert({ recipient_hash: hash }, { onConflict: "recipient_hash", ignoreDuplicates: true });
  if (error) throw new Error(`Leader stop not saved: ${error.message}`);
  const { data: rows } = await sb.from("leader_emails").update({ status: "stopped", recipient: null }).eq("recipient_hash", hash).in("status", ["sent"]).select("id");
  for (const row of rows ?? []) await sb.from("email_events").update({ recipient: null }).eq("metadata->>send_id", row.id);
  await recordServerEvent(sb, { event: "leader_email_stopped", path: "/stop", metadata: { kind: send.set_id ? "set" : "story" } });
  return true;
}
