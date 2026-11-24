import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { canSendLeaderEmail } from "../lib/leader-email";

// Lane A's switch readers with their switch off (25 Nov 2026). With
// LEADER_EMAIL_ON and CLASS_SET_ON false the leader path is the 24 Nov one:
// no email is ever sent, no class set is collected, the statement page and
// the panel look as they did.
const read = (file: string) => readFileSync(file, "utf8");

test("LEADER_EMAIL_ON off: no first email, no reminder, no email box, no resend door", () => {
  assert.deepEqual(canSendLeaderEmail({ switchOn: false, address: "jo@k.nz", ownEmail: null, firstName: "Sam", suppressed: false, sentLast24h: 0, alreadyForThisLink: false, paused: false }), { ok: false, reason: "off" });
  assert.match(read("lib/email/leader-check.ts"), /switchOn: LEADER_EMAIL_ON/);
  assert.match(read("lib/email/leader-check.ts"), /export async function sendLeaderReminders\([\s\S]{0,120}?\{\s*if \(!LEADER_EMAIL_ON\) return \{ checked: 0, reminded: 0, forgotten: 0 \};/);
  assert.match(read("app/api/leader-email/route.ts"), /if \(!LEADER_EMAIL_ON\) return NextResponse\.json\(\{ error: "Not found\." \}, \{ status: 404 \}\);/);
  const panel = read("components/app/SendToLeader.tsx");
  assert.match(panel, /\{LEADER_EMAIL_ON && \(\s*<>\s*<label htmlFor=\{`leader-email-/, "the email box only with the switch on");
  assert.match(panel, /\{LEADER_EMAIL_ON && typed \? \(/, "off: the only button makes the link, as before");
  assert.match(panel, /\{LEADER_EMAIL_ON && \(\s*<label[^>]*>\s*<input[^\n]*leader-join-consent/, "no join tick when off");
});

test("CLASS_SET_ON off: nothing collected, no panel, no set route", () => {
  assert.match(read("components/marketing/TransitionDemo.tsx"), /if \(inApp && CLASS_SET_ON\) \{\s*const d = data\.draft as TransitionDraft;\s*addToClassSet\(/);
  assert.match(read("app/(app)/statement/page.tsx"), /\{CLASS_SET_ON && <ClassSetPanel \/>\}/);
  const route = read("app/api/leader-sets/route.ts");
  assert.equal((route.match(/if \(!CLASS_SET_ON\) return NextResponse\.json\(\{ error: "Not found\." \}, \{ status: 404 \}\);/g) ?? []).length, 2, "GET and POST");
});
