import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("a leader's 'Stop these emails' is not counted as a marketing unsubscribe (R1-10)", () => {
  assert.match(read("lib/email/brain-state.ts"), /\["bounced", "complained", "leader_stop"\]\.includes/);
});

test("the stop page promises only what the code does (R4-3)", () => {
  const page = read("app/stop/page.tsx");
  assert.doesNotMatch(page, /never email this address again|will not email this address for anyone/);
  assert.match(page, /will not send this address another check request or reminder, from anyone/);
});

test("the leader's address is dropped on the first open (R4-1)", () => {
  assert.match(read("lib/story-check-server.ts"), /await forgetLeaderAddressOnOpen\(\{ checkId: check\.id \}\)/);
  assert.match(read("lib/leader-sets-server.ts"), /await forgetLeaderAddressOnOpen\(\{ setId: set\.id \}\)/);
});

test("the data sheet says StoryLoop emails a leader, and lists her address (R4-2)", () => {
  const sheet = read("app/data-sheet/page.tsx");
  assert.match(sheet, /If an educator asks, StoryLoop emails her leader one link to check, and at most one reminder/);
  assert.match(sheet, /the leader's email address, kept for about two days at most/);
  assert.doesNotMatch(sheet, /within 7 days of it ending/);
  assert.doesNotMatch(read("app/privacy/page.tsx"), /within 7 days of the link ending|only until the link is opened or ends/);
});

test("the email-link signup also skips the name (R1-13)", () => {
  assert.match(read("app/api/auth/signup-link/route.ts"), /name_skipped: true/);
});

test("an existing leader link still opens if the 25 Nov columns are missing (R1-7)", () => {
  const src = read("lib/story-check-server.ts");
  assert.match(src, /if \(error\?\.code === "42703"\)/);
  assert.match(src, /CHECK_COLUMNS_BEFORE = "id, story_id, user_id, status, leader_name, comment, created_at, opened_at, decided_at, expires_at, revoked_at, centre_name, share_counts"/);
});

test("the switches file says what turning them off does not undo (R1-8)", () => {
  const src = read("lib/build-switches.ts");
  assert.doesNotMatch(src, /With all five\s+\*?\s*false the site behaves exactly as/);
  assert.match(src, /NOT behind a switch/);
  for (const part of ["B4", "B5", "B1", "founder", "migration"]) assert.match(src, new RegExp(part));
});

test("a lost start-free answer never leads to a second centre subscription (R1-9)", () => {
  const route = read("app/api/centres/start-free/route.ts");
  assert.match(route, /const started = customerId \? await liveStartFree\(stripe, customerId\)/);
  assert.match(route, /idempotencyKey: `start-free-price-\$\{plan\}-\$\{currency\}-\$\{cents\}/);
  const checkout = read("app/api/stripe/checkout/route.ts");
  assert.match(checkout, /if \(CENTRE_START_NO_CHECKOUT && liveCentre && !offer\)/);
});

test("the leader preview sits above the app header and Escape closes it (R3-1); one Cancel after sending (R3-4)", () => {
  const panel = read("components/app/SendToLeader.tsx");
  assert.match(panel, /createPortal\(/);
  assert.match(panel, /event\.key === "Escape"/);
  const host = read("components/app/LeaderCheck.tsx");
  assert.match(host, /\(waiting \|\| answered\) && !sendDone/);
  assert.match(host, /waiting && !sendDone/);
});

test("the cookie sheet is not asked on the leader's answer page or the stop page (R3-5)", () => {
  assert.match(read("components/consent/CookieBanner.tsx"), /"\/unsubscribe", "\/check", "\/stop"\]/);
});

test("copy fixes: one ask on /intentional-teaching, one name for the TLDS system, expired sets named (R3-7, R3-8, R4-7, R4-10)", () => {
  assert.doesNotMatch(read("lib/seo-pages.ts"), /Got a story to write about it\? Put your note in the box\./);
  assert.match(read("lib/guide-product.ts"), /copy it into the Online TLDS \(in Insight\)/);
  assert.match(read("lib/statement-guide-forms.ts"), /copy it into the Online TLDS \(in Insight\)/);
  assert.match(read("components/marketing/LeaderCheckPage.tsx"), /Links to check a story or statements last/);
});

test("from Ask my centre to pay, the panel says the leader is asked to check, not to pay (R3-3, R4-8)", () => {
  assert.match(read("components/app/SendToLeader.tsx"), /place === "wall" && \(/);
});
