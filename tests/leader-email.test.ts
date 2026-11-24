import assert from "node:assert/strict";
import test from "node:test";
import { canSendLeaderEmail, cleanLeaderAddress, reminderDue, senderFirstName, stopToken, verifyStopToken, type SendFacts } from "../lib/leader-email";
import { renderLeaderEmail } from "../lib/email/leader-check";

const facts = (over: Partial<SendFacts> = {}): SendFacts => ({ switchOn: true, address: "jo@kowhai.nz", ownEmail: "sam@x.nz", firstName: "Sam", suppressed: false, sentLast24h: 0, alreadyForThisLink: false, paused: false, ...over });

test("every reason an email is held", () => {
  assert.deepEqual(canSendLeaderEmail(facts()), { ok: true });
  assert.deepEqual(canSendLeaderEmail(facts({ switchOn: false })), { ok: false, reason: "off" });
  assert.deepEqual(canSendLeaderEmail(facts({ address: "" })), { ok: false, reason: "invalid" });
  assert.deepEqual(canSendLeaderEmail(facts({ address: "sam@x.nz" })), { ok: false, reason: "own" });
  assert.deepEqual(canSendLeaderEmail(facts({ alreadyForThisLink: true })), { ok: false, reason: "duplicate" });
  assert.deepEqual(canSendLeaderEmail(facts({ firstName: "" })), { ok: false, reason: "no_name" });
  assert.deepEqual(canSendLeaderEmail(facts({ suppressed: true })), { ok: false, reason: "suppressed" });
  assert.deepEqual(canSendLeaderEmail(facts({ paused: true })), { ok: false, reason: "paused" });
  assert.deepEqual(canSendLeaderEmail(facts({ sentLast24h: 3 })), { ok: false, reason: "cap" });
  assert.deepEqual(canSendLeaderEmail(facts({ sentLast24h: 2 })), { ok: true });
});

test("addresses and the sender's first name", () => {
  assert.equal(cleanLeaderAddress(" Jo@Kowhai.NZ "), "jo@kowhai.nz");
  assert.equal(cleanLeaderAddress("jo@kowhai"), "");
  assert.equal(cleanLeaderAddress("jo kowhai@x.nz"), "");
  assert.equal(senderFirstName("Sam Taylor", "sam.t@x.nz"), "Sam");
  assert.equal(senderFirstName("samt", "samt@x.nz"), "", "the start of her address is not a name");
  assert.equal(senderFirstName("sam@x.nz", "sam@x.nz"), "");
  assert.equal(senderFirstName(null, "sam@x.nz"), "");
});

test("the reminder: due at 48 hours, never when opened, answered, cancelled, ended, stopped, paused or already sent", () => {
  const sent = "2026-11-25T00:00:00Z";
  const row = { status: "sent", first_sent_at: sent, reminder_sent_at: null };
  const f = { openedAt: null, answered: false, revokedAt: null, expiresAt: "2026-12-09T00:00:00Z", suppressed: false, paused: false };
  const at = (h: number) => new Date(Date.parse(sent) + h * 3_600_000);
  assert.equal(reminderDue(row, f, at(47.9)), false);
  assert.equal(reminderDue(row, f, at(48)), true);
  assert.equal(reminderDue(row, { ...f, openedAt: sent }, at(49)), false);
  assert.equal(reminderDue(row, { ...f, answered: true }, at(49)), false);
  assert.equal(reminderDue(row, { ...f, revokedAt: sent }, at(49)), false);
  assert.equal(reminderDue(row, { ...f, expiresAt: at(48.5).toISOString() }, at(49)), false);
  assert.equal(reminderDue(row, { ...f, suppressed: true }, at(49)), false);
  assert.equal(reminderDue(row, { ...f, paused: true }, at(49)), false);
  assert.equal(reminderDue({ ...row, reminder_sent_at: at(48).toISOString() }, f, at(49)), false);
  assert.equal(reminderDue({ ...row, status: "stopped" }, f, at(49)), false);
});

test("the stop token: any change fails, case does not matter", () => {
  const token = stopToken("Jo@Kowhai.NZ");
  assert.equal(verifyStopToken(token), "jo@kowhai.nz");
  const value = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  assert.equal(verifyStopToken(Buffer.from(JSON.stringify({ ...value, e: "someone@else.nz" })).toString("base64url")), null);
  assert.equal(verifyStopToken(Buffer.from(JSON.stringify({ ...value, e: "JO@KOWHAI.NZ" })).toString("base64url")), "jo@kowhai.nz");
  assert.equal(verifyStopToken("nonsense"), null);
  assert.equal(verifyStopToken(undefined), null);
});

// The render takes no child, note or story at all; "Mihi" stands for any child name.
const LINK = "https://storyloop.space/check#abcdefghijklmnopqrstuvwxyz012345";
const base = { firstName: "Sam", centreName: "Kowhai Kindergarten", kind: "story" as const, pieces: 1, linkUrl: LINK, stopUrl: "https://storyloop.space/stop?t=xyz", expiresAt: "2026-12-09T00:00:00Z", reminder: false };

test("the email names no child, quotes no note, shows no price or offer, tracks nothing", () => {
  for (const input of [base, { ...base, kind: "set" as const, pieces: 12 }, { ...base, reminder: true, linkUrl: "", sentAt: "2026-11-25T00:00:00Z" }]) {
    const { subject, html, text } = renderLeaderEmail(input);
    const all = `${subject}\n${html}\n${text}`;
    for (const banned of ["Mihi", "$", "NZ$", "A$", "free", "Free", "trial", "price", "/api/email/c", "/api/email/o", "—"]) assert.ok(!all.includes(banned), `no ${banned}`);
    assert.ok(!/<img/i.test(html), "no pixel, no image");
    assert.ok(all.includes("ariacareapp@gmail.com"));
    assert.ok(all.includes("about two minutes"));
    assert.ok(all.includes("If you do not know Sam, ignore this."));
    assert.ok(all.includes("Replies to this email go to StoryLoop, not to Sam. Please answer on the page."));
    assert.ok(html.includes("https://storyloop.space/stop?t=xyz") && text.includes("Stop these emails: https://storyloop.space/stop?t=xyz"));
  }
  const first = renderLeaderEmail(base);
  assert.equal(first.html.split(LINK).length - 1, 1, "the private link exactly once in the html");
  assert.equal(first.text.split(LINK).length - 1, 1, "and once in the text");
  assert.equal(first.subject, "Sam asked you to check a learning story");
  assert.ok(first.text.includes("Sam at Kowhai Kindergarten"));
  assert.equal(renderLeaderEmail({ ...base, kind: "set", pieces: 12 }).subject, "Sam asked you to check 12 statements");
  const reminder = renderLeaderEmail({ ...base, reminder: true, linkUrl: "" });
  assert.ok(!reminder.html.includes("/check#"), "the reminder never carries a key: it is not kept");
});
