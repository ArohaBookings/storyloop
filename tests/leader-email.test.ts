import assert from "node:assert/strict";
import test from "node:test";
import { canSendLeaderEmail, cleanLeaderAddress, firstNameToSave, isStoppedAddress, recipientHash, reminderDue, senderFirstName, stopToken, verifyStopToken, type SendFacts } from "../lib/leader-email";
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

test("the stop token names the send, never the address, and any change fails (MERGE2 2a)", () => {
  const send = "3f2b6c1e-8a4d-4c2b-9e1f-0a1b2c3d4e5f";
  const token = stopToken(send);
  assert.equal(verifyStopToken(token), send);
  assert.equal(verifyStopToken(stopToken(send.toUpperCase())), send);
  // Not the address, not the address encoded: nothing in it decodes to an @.
  assert.ok(!token.includes("@"));
  for (const part of token.split(".")) assert.ok(!Buffer.from(part, "base64url").toString("utf8").includes("@"));
  const [id, signature] = token.split(".");
  assert.equal(verifyStopToken(`${id.replace(/^3/, "4")}.${signature}`), null, "another send with the same signature");
  assert.equal(verifyStopToken(`${id}.${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`), null, "a changed signature");
  assert.equal(verifyStopToken(`${token}.x`), null);
  // The old token shape (the address in base64 with its signature) no longer opens anything.
  assert.equal(verifyStopToken(Buffer.from(JSON.stringify({ e: "jo@kowhai.nz", s: "x" })).toString("base64url")), null);
  assert.equal(verifyStopToken("nonsense"), null);
  assert.equal(verifyStopToken(undefined), null);
});

test("the stop list holds only the hash of the address and matches whatever the case (MERGE2 2a)", () => {
  const list = [recipientHash("jo@kowhai.nz")];
  assert.equal(isStoppedAddress("Jo@Kowhai.NZ", list), true);
  assert.equal(isStoppedAddress(" jo@kowhai.nz ", list), true);
  assert.equal(isStoppedAddress("sam@kowhai.nz", list), false);
  assert.equal(isStoppedAddress("", list), false);
  assert.ok(!list[0].includes("@") && /^[0-9a-f]{64}$/.test(list[0]));
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

test("her first name from the send panel is saved once, and then she is never asked again", async () => {
  // No name on the profile (signup skipped it, 25 Nov B4): the name she typed is saved.
  assert.equal(firstNameToSave("Sam", null, "sam.k@x.nz"), "Sam");
  assert.equal(firstNameToSave("Sam", "", "sam.k@x.nz"), "Sam");
  // An older account whose name is only the start of her email address: that is not a name.
  assert.equal(firstNameToSave("Sam", "samk", "samk@x.nz"), "Sam");
  // Saved: senderFirstName finds it, so the email is not held for no_name and the panel never asks.
  assert.equal(senderFirstName("Sam", "sam.k@x.nz"), "Sam");
  assert.deepEqual(canSendLeaderEmail(facts({ firstName: senderFirstName("Sam", "sam.k@x.nz") })), { ok: true });
  // A name already on her profile is never overwritten, and nothing typed saves nothing.
  assert.equal(firstNameToSave("Jo", "Sam Kele", "sam.k@x.nz"), null);
  assert.equal(firstNameToSave("", null, "sam.k@x.nz"), null);
  assert.equal(firstNameToSave("samk", null, "samk@x.nz"), null, "her email's start typed as a name is not kept");
  // Both doors (the first send and the resend after no_name) go through the one helper that saves.
  const { readFileSync } = await import("node:fs");
  const server = readFileSync("lib/leader-send-server.ts", "utf8");
  assert.match(server, /const toSave = firstNameToSave\(cleanFirstName\(input\.body\.firstName\), fullName, ownEmail\);\s*if \(toSave\) \{\s*const \{ error \} = await admin\.from\("profiles"\)\.update\(\{ full_name: toSave \}\)/);
  assert.match(readFileSync("app/api/leader-email/route.ts", "utf8"), /emailLeaderIfAsked\(/);
  // The panel asks only when the server held the email for no_name.
  assert.match(readFileSync("components/app/SendToLeader.tsx", "utf8"), /outcome\.reason === "no_name"\) \{\s*\/\/[^\n]*\n\s*setAskName\(true\);/);
});

// Review fixes, 25 Nov (R2-5, R1-5/R2-6, R1-11, R2-2/R4-1).
test("one address cannot be mailed past its own cap, from any number of accounts (R2-5)", () => {
  assert.deepEqual(canSendLeaderEmail(facts({ recipientLast24h: 3 })), { ok: false, reason: "recipient_cap" });
  assert.deepEqual(canSendLeaderEmail(facts({ recipientLast7d: 6 })), { ok: false, reason: "recipient_cap" });
  assert.deepEqual(canSendLeaderEmail(facts({ allLast24h: 300 })), { ok: false, reason: "paused" });
  assert.deepEqual(canSendLeaderEmail(facts({ recipientLast24h: 2, recipientLast7d: 5, allLast24h: 299 })), { ok: true });
});

test("the reminder run never picks up rows with no address, oldest due first; a failed insert is not 'already emailed'", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync("lib/email/leader-check.ts", "utf8");
  const query = src.slice(src.indexOf("export async function sendLeaderReminders"), src.indexOf("const rows = (data ?? [])"));
  assert.match(query, /\.not\("recipient", "is", null\)/);
  assert.match(query, /\.order\("reminder_due_at", \{ ascending: true \}\)/);
  assert.match(src, /reason: error\?\.code === "23505" \? "duplicate" : "failed"/);
  // Every place the leader's address is dropped from leader_emails also drops it from email_events.
  assert.match(src, /async function forgetLeaderAddress/);
  assert.doesNotMatch(src, /update\(\{ [^}]*recipient: null[^}]*\}\)\.eq\("id", row\.id\)/, "use forgetLeaderAddress");
  assert.match(src, /from\("email_events"\)\.update\(\{ recipient: null \}\)/);
});
