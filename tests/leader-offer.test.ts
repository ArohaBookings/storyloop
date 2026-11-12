import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  CENTRE_FREE_UNTIL,
  CENTRE_LONG_TRIAL_CUTOFF,
  CENTRE_TRIAL_DAYS,
  centreTrialDays,
  centreTrialEnd,
  centreTrialWords,
  centreTrialWordsCapital,
  checkoutTerms,
} from "../lib/centre-offer";
import { checkoutAuthorisationMessage, checkoutTermsMessage } from "../lib/stripe-branding";
import { formatDate } from "../lib/email/billing";
import { buildNotifications, formatDay, type NotificationFacts } from "../lib/notifications";
import { renderLifecycleEmail } from "../lib/email/templates";
import {
  CENTRE_NAME_MAX,
  canUseOffer,
  checkExpiry,
  cleanCentreName,
  leaderCounts,
  leaderCountsSentence,
  leaderView,
  looksLikeCheckToken,
  looksLikeOfferRef,
  offerRefFromHash,
  offerSignupHref,
  type CheckRow,
} from "../lib/story-check";
import { hashCheckToken, hashOfferRef, newCheckToken, offerRefFor } from "../lib/story-check-token";
import { CENTRE_MESSAGE, CENTRE_MESSAGE_MAX_WORDS } from "../lib/centre-message";
import { rivalNames } from "../lib/blog-topics";
import { checkoutNow } from "../lib/stripe-client";

// The three starts the release has to get right, at an ordinary time of day in Auckland.
const NOV_13 = new Date("2026-11-13T10:00:00+13:00");
const DEC_31 = new Date("2026-12-31T10:00:00+13:00");
const JAN_2 = new Date("2027-01-02T10:00:00+13:00");
const DAY = 86_400_000;

// ---------------------------------------------------------------- the free period

test("a centre that starts in 2026 is free until the end of 31 January 2027, New Zealand time", () => {
  assert.equal(CENTRE_FREE_UNTIL.toISOString(), "2027-01-31T10:59:59.000Z", "23:59:59 on 31 January in Auckland (NZDT)");
  assert.equal(CENTRE_LONG_TRIAL_CUTOFF.toISOString(), "2026-12-31T11:00:00.000Z", "midnight starting 1 January in Auckland");
  for (const at of [NOV_13, DEC_31, new Date("2026-12-31T23:59:59+13:00")]) {
    assert.equal(centreTrialEnd(at)?.getTime(), CENTRE_FREE_UNTIL.getTime(), at.toISOString());
    assert.equal(centreTrialWords(at), "free until 31 January");
  }
  assert.equal(centreTrialDays(NOV_13), 80, "13 Nov: 79 days and 14 hours, counted as 80");
  assert.equal(centreTrialDays(DEC_31), 32, "31 Dec: 31 days and 14 hours, counted as 32");
});

test("from 1 January 2027 (New Zealand time) it is 30 days again, and never fewer than 30", () => {
  for (const at of [CENTRE_LONG_TRIAL_CUTOFF, JAN_2, new Date("2027-06-01T00:00:00Z"), new Date("2030-01-01T00:00:00Z")]) {
    assert.equal(centreTrialEnd(at), null, at.toISOString());
    assert.equal(centreTrialDays(at), CENTRE_TRIAL_DAYS);
    assert.equal(centreTrialWords(at), "30 days free");
    assert.equal(centreTrialWordsCapital(at), "30 days free", "a number needs no capital");
  }
  assert.equal(centreTrialWordsCapital(NOV_13), "Free until 31 January");
  // Already 1 January in Auckland while still 31 December in Sydney and in UTC: the 30 days apply.
  assert.equal(centreTrialEnd(new Date("2026-12-31T23:30:00+11:00")), null);
  // Every moment from now to well past the cut-off: never fewer than 30 days, never a free period ending before 30 days.
  for (let t = new Date("2026-11-01T00:00:00Z").getTime(); t < new Date("2027-03-01T00:00:00Z").getTime(); t += 3 * 3600_000) {
    const at = new Date(t);
    assert.ok(centreTrialDays(at) >= CENTRE_TRIAL_DAYS, at.toISOString());
    const end = centreTrialEnd(at);
    if (end) assert.ok(end.getTime() - t >= CENTRE_TRIAL_DAYS * DAY, at.toISOString());
  }
  assert.equal(centreTrialDays(new Date("not a date")), CENTRE_TRIAL_DAYS);
});

test("checkout's terms follow the date; individual plans and returning centres do not change", () => {
  const terms = (plan: "centre_starter" | "educator", now: Date, hadCentreBefore = false) =>
    checkoutTerms({ plan, spotsLeft: 3, hadCentreBefore, couponId: "c", now });
  assert.equal(terms("centre_starter", NOV_13).trialDays, 80);
  assert.equal(terms("centre_starter", DEC_31).trialDays, 32);
  assert.equal(terms("centre_starter", JAN_2).trialDays, 30);
  for (const at of [NOV_13, DEC_31, JAN_2]) {
    assert.deepEqual(terms("educator", at), { trialDays: 7, noCardNeeded: false, foundingCoupon: null }, "an educator's trial is untouched");
    assert.deepEqual(terms("centre_starter", at, true), { trialDays: 0, noCardNeeded: false, foundingCoupon: null }, "one free period per centre");
    assert.equal(terms("centre_starter", at).foundingCoupon, "c", "the founding discount is unchanged");
  }
});

test("what checkout says, for a centre started on 13 November, 31 December and 2 January", () => {
  const say = (now: Date) =>
    checkoutTermsMessage({ plan: "centre_starter", currency: "NZD", trialDays: centreTrialDays(now), noCardNeeded: true, founding: true, offer: null, trialEndsAt: centreTrialEnd(now), now });
  for (const at of [NOV_13, DEC_31]) {
    const message = say(at);
    assert.match(message, /^Free until 31 January 2027 with no card\./, message);
    assert.match(message, /first three paid months are half price at NZ\$54\.50, then NZ\$109 a month/);
    assert.match(message, /nothing is charged/);
    assert.doesNotMatch(message, /\d+ days free/);
  }
  const january = say(JAN_2);
  assert.match(january, /^30 days free with no card\. To keep going after 1 February 2027/, january);
  // No card is saved on a centre's free period, so there is no authorisation line at all.
  assert.equal(checkoutAuthorisationMessage({ trialDays: centreTrialDays(NOV_13), noCardNeeded: true, now: NOV_13 }), null);
  // An individual's message is exactly as before.
  const educator = checkoutTermsMessage({ plan: "educator", currency: "NZD", trialDays: 7, noCardNeeded: false, founding: false, offer: null, now: NOV_13 });
  assert.match(educator, /7-day free trial starts today\. Nothing is charged until 20 November 2026/);
});

test("the dates in the emails, the bell and Billing name the same day as checkout, on any server clock", () => {
  // 13 Nov and 31 Dec: Stripe is given the end of 31 January.
  assert.equal(formatDate(CENTRE_FREE_UNTIL.getTime() / 1000), "31 January 2027");
  assert.equal(formatDay(CENTRE_FREE_UNTIL, "Pacific/Auckland"), "Sunday 31 January");
  // 2 Jan: 30 days from 10am, so 10am on 1 February in Auckland, still 31 January in UTC.
  const janEnd = new Date(JAN_2.getTime() + 30 * DAY);
  assert.equal(janEnd.toISOString(), "2027-01-31T21:00:00.000Z");
  assert.equal(formatDate(janEnd.getTime() / 1000), "1 February 2027", "the reminder email, which used to read 31 January on a UTC server");
  assert.equal(formatDay(janEnd, "Pacific/Auckland"), "Monday 1 February");
  const facts: NotificationFacts = {
    now: new Date(janEnd.getTime() - 2 * DAY), plan: "centre_starter", subscriptionStatus: "trialing", trialEndsAt: janEnd.toISOString(), trialCardOnFile: false,
    storiesThisMonth: 0, usageResetAt: null, monthlyLimit: null, referrals: [], quiet: null, wall: null, term: null, invites: [],
  };
  assert.equal(buildNotifications(facts)[0]?.title, "Your centre's free month ends Monday 1 February");
  // The reminder and the lapsed email no longer state a length.
  const lapsed = renderLifecycleEmail({ type: "subscription_cancelled", userId: "u", recipient: "a@b.nz", name: "Aroha", context: { trialLapsed: true } });
  assert.doesNotMatch(lapsed.text + lapsed.html, /30-day/);
  assert.match(lapsed.text, /free trial of StoryLoop has ended/);
});

test("an abandoned centre checkout is answered with today's terms", () => {
  const render = (words?: string) =>
    renderLifecycleEmail({ type: "checkout_abandoned", userId: "u", recipient: "a@b.nz", name: "Aroha", context: { planLabel: "Centre Starter", centreTrial: true, trialDays: 80, ...(words ? { centreTrialWords: words } : {}) } });
  assert.match(render(centreTrialWords(NOV_13)).text, /It is free until 31 January with no card needed/);
  assert.match(render(centreTrialWords(JAN_2)).text, /It is 30 days free with no card needed/);
  assert.doesNotMatch(render(centreTrialWords(NOV_13)).text, /80 days/);
});

test("the test clock is honoured only against the local payments mock, never on Vercel", () => {
  const local = { STRIPE_API_BASE_FOR_TESTS: "http://127.0.0.1:12112", NODE_ENV: "production", ALLOW_STRIPE_TEST_SERVER: "1" };
  assert.equal(checkoutNow("2026-12-31T10:00:00+13:00", local).toISOString(), DEC_31.toISOString());
  for (const env of [
    {},
    { ...local, VERCEL: "1" },
    { ...local, VERCEL_ENV: "production" },
    { STRIPE_API_BASE_FOR_TESTS: "http://127.0.0.1:12112", NODE_ENV: "production" },
    { ...local, STRIPE_API_BASE_FOR_TESTS: "https://api.stripe.com" },
  ]) {
    const now = checkoutNow("2026-12-31T10:00:00+13:00", env as Record<string, string>);
    assert.ok(Math.abs(now.getTime() - Date.now()) < 5000, JSON.stringify(env));
  }
  assert.ok(Math.abs(checkoutNow("nonsense", local).getTime() - Date.now()) < 5000);
});

test("the checkout route gives Stripe the exact end, and the 30 days as before", () => {
  const route = readFileSync("app/api/stripe/checkout/route.ts", "utf8");
  assert.match(route, /trial_end: Math\.floor\(trialEndsAt\.getTime\(\) \/ 1000\)/);
  assert.match(route, /trial_period_days: terms\.trialDays/);
  assert.match(route, /checkoutNow\(request\.headers\.get\("x-storyloop-test-now"\)\)/);
  assert.equal(Math.floor(CENTRE_FREE_UNTIL.getTime() / 1000), 1801393199);
});

// ---------------------------------------------------------------- what the educator sends

test("the centre name is plain words, at most 80 characters", () => {
  assert.equal(cleanCentreName("  Little   Kiwis  Early Learning "), "Little Kiwis Early Learning");
  assert.equal(cleanCentreName("Te Kōhanga Reo o Ngā Kākano"), "Te Kōhanga Reo o Ngā Kākano");
  assert.equal(cleanCentreName("St Mary's (Kindy) & Nursery"), "St Mary's (Kindy) & Nursery");
  assert.equal(cleanCentreName("Sunny <script>alert(1)</script>"), "Sunny script alert(1) script");
  assert.equal(cleanCentreName("Call 021 555 1234 or boss@kindy.nz"), "Call or");
  assert.equal(cleanCentreName("See https://example.com now"), "See now");
  assert.equal(cleanCentreName("x".repeat(200)).length, CENTRE_NAME_MAX);
  for (const empty of [undefined, null, 42, {}, "   "]) assert.equal(cleanCentreName(empty), "");
});

const NOW = new Date("2026-11-13T00:00:00Z"); // 1pm Friday 13 Nov in Auckland, Term 4
const iso = (date: string) => new Date(`${date}T01:00:00Z`).toISOString();

test("the numbers: fewer than three stories in 30 days says nothing at all", () => {
  const opts = { now: NOW, jurisdiction: "NZ" as const, followsSchoolTerms: true };
  assert.equal(leaderCounts([], opts), null);
  assert.equal(leaderCounts([{ child_name: "Ruby", created_at: iso("2026-11-10") }, { child_name: "Tama", created_at: iso("2026-11-11") }], opts), null);
  // Old stories do not count towards the three.
  assert.equal(leaderCounts([
    { child_name: "Ruby", created_at: iso("2026-11-10") }, { child_name: "Tama", created_at: iso("2026-11-11") },
    { child_name: "Mia", created_at: iso("2026-09-01") }, { child_name: "Ari", created_at: iso("2026-08-01") },
  ], opts), null);
});

test("the numbers: stories, different children by first name, and children quiet for 10 working days this term", () => {
  const opts = { now: NOW, jurisdiction: "NZ" as const, followsSchoolTerms: true };
  const stories = [
    { child_name: "Ruby Smith", created_at: iso("2026-11-12") },
    { child_name: "ruby", created_at: iso("2026-11-02") },
    { child_name: "Tama", created_at: iso("2026-11-11") },
    { child_name: "Mia", created_at: iso("2026-10-20") }, // Term 4 began 13 Oct: in term, quiet since
    { child_name: "Ari", created_at: iso("2026-10-14") },
    { child_name: "Leo", created_at: iso("2026-09-15") }, // last term: not "this term", not in 30 days
  ];
  const counts = leaderCounts(stories, opts);
  assert.deepEqual(counts, { stories30: 5, children30: 4, quietThisTerm: 2 });
  const sentence = leaderCountsSentence("Sam", counts!);
  assert.equal(sentence, "In the last 30 days Sam saved 5 stories about 4 different children, and 2 of the children Sam has written about this term have had nothing in the last 10 working days.");
  for (const name of ["Ruby", "Tama", "Mia", "Ari", "Leo", "Smith"]) assert.ok(!sentence.includes(name), `names ${name}`);
  assert.doesNotMatch(sentence, /score|rank|average|compared|than other|behind/i);
  assert.equal(leaderCountsSentence("Sam", { stories30: 4, children30: 1, quietThisTerm: 0 }),
    "In the last 30 days Sam saved 4 stories about 1 child, and every child Sam has written about this term has had a story in the last 10 working days.");
  assert.equal(leaderCountsSentence("Sam", { stories30: 3, children30: 3, quietThisTerm: null }), "In the last 30 days Sam saved 3 stories about 3 different children.");
  assert.match(leaderCountsSentence("Sam", { stories30: 3, children30: 2, quietThisTerm: 1 }), /1 of the children Sam has written about this term has had nothing/);
});

// ---------------------------------------------------------------- the leader's page

const row = (over: Partial<CheckRow> = {}): CheckRow => ({
  id: "c1", story_id: "s1", user_id: "u1", status: "opened", leader_name: null, comment: null,
  created_at: "2026-11-10T01:00:00Z", opened_at: null, decided_at: null,
  expires_at: checkExpiry(new Date("2026-11-10T01:00:00Z")).toISOString(), revoked_at: null, ...over,
});
const story = { child_name: "Ruby Smith", observations: "note", story_text: "Ruby poured.", outcomes: [], next_steps: [], created_at: "2026-11-09T00:00:00Z" };
const REF = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AbCde";

test("the leader's page gets the offer: numbers only when she ticked the box", () => {
  const counts = { stories30: 5, children30: 4, quietThisTerm: 2 };
  const ticked = leaderView({ story, check: row({ share_counts: true, centre_name: "Little Kiwis" }), educatorName: "Sam Taylor", now: NOW, offer: { code: "ABC234", ref: REF, counts } });
  assert.deepEqual(ticked.offer, { code: "ABC234", ref: REF, counts });
  assert.equal(ticked.centreName, "Little Kiwis");
  const unticked = leaderView({ story, check: row({ share_counts: false, centre_name: "Little Kiwis" }), educatorName: "Sam Taylor", now: NOW, offer: { code: "ABC234", ref: REF, counts } });
  assert.equal(unticked.offer.counts, null, "computed or not, unticked shows none");
  const before = leaderView({ story, check: row(), educatorName: "Sam Taylor", now: NOW });
  assert.deepEqual(before.offer, { code: null, ref: null, counts: null }, "a row from before the migration: the offer without a code");
  assert.equal(before.centreName, "");
  const flat = JSON.stringify(ticked);
  for (const secret of ["u1", "s1", "c1", "Taylor", "token", "hash", "email", "@"]) assert.ok(!flat.includes(secret), `leaks ${secret}`);
});

test("the button goes to signup for the centre plan with her code, and the reference only after the #", () => {
  const href = offerSignupHref({ code: "ABC234", ref: REF });
  const url = new URL(href, "https://storyloop.space");
  assert.equal(url.pathname, "/signup");
  assert.equal(url.searchParams.get("plan"), "centre_starter");
  assert.equal(url.searchParams.get("ref"), "ABC234");
  assert.ok(!url.search.includes(REF), "the reference never goes in the query string");
  assert.equal(offerRefFromHash(url.hash), REF);
  assert.equal(offerSignupHref({ code: null, ref: null }), "/signup?plan=centre_starter&utm_source=leader_check&utm_medium=product");
  assert.equal(new URL(offerSignupHref({ code: "bad code!", ref: "short" }), "https://x.nz").searchParams.get("ref"), null);
  assert.equal(offerRefFromHash("#lo=short"), "");
  assert.equal(offerRefFromHash(""), "");
});

test("the offer reference is not the link key, cannot open a story, and is stored only as a hash", () => {
  const { token } = newCheckToken();
  const ref = offerRefFor(token);
  assert.ok(looksLikeOfferRef(ref));
  assert.equal(ref.length, 43);
  assert.equal(offerRefFor(token), ref, "the same link always has the same reference, so the page can be reopened");
  assert.notEqual(ref, token);
  assert.ok(!ref.includes(token) && !token.includes(ref.slice(0, 20)));
  assert.equal(looksLikeCheckToken(ref), false, "/api/check refuses it before any lookup");
  assert.notEqual(hashOfferRef(ref), hashCheckToken(token));
  assert.notEqual(hashOfferRef(ref), hashCheckToken(ref), "even passed as a key, it matches no stored key hash");
  assert.notEqual(offerRefFor(newCheckToken().token), ref);
  for (const bad of ["", token, "a".repeat(42), "a".repeat(44), null, 7]) assert.equal(looksLikeOfferRef(bad), false);
});

test("a cancelled link ends the offer at once; an expired one keeps it 30 more days", () => {
  const sent = row();
  assert.equal(canUseOffer(sent, NOW), true);
  assert.equal(canUseOffer(row({ revoked_at: NOW.toISOString() }), NOW), false);
  const expiry = new Date(sent.expires_at).getTime();
  assert.equal(canUseOffer(sent, new Date(expiry + 29 * DAY)), true);
  assert.equal(canUseOffer(sent, new Date(expiry + 30 * DAY)), false);
  assert.equal(canUseOffer(row({ expires_at: "nonsense" }), NOW), false);
});

test("the leader's page links the data sheet, starts signup, and keeps the reference out of analytics", () => {
  const page = readFileSync("components/marketing/LeaderCheckPage.tsx", "utf8");
  assert.match(page, /href="\/data-sheet"/);
  assert.match(page, /For your owner, board or approved provider: the one-page data sheet/);
  assert.match(page, /Start our free month/);
  assert.match(page, /already writes with StoryLoop\./);
  assert.match(page, /data-private=""/, "click analytics must not record the link's address");
  assert.doesNotMatch(page, /for-centres\?utm_source=leader_check/);
  const panel = readFileSync("components/app/LeaderCheck.tsx", "utf8");
  assert.match(panel, /Send this story to your leader/);
  assert.match(panel, /Also show my leader how many children I have written about lately \(numbers only, no names\)/);
  for (const id of ["leader-check-panel", "leader-check-make", "leader-check-link", "leader-check-result"]) assert.ok(panel.includes(`data-testid="${id}"`), id);
});

test("the one-tap invitation never hands the leader an address", () => {
  const server = readFileSync("lib/leader-offer-server.ts", "utf8");
  // What a summary carries: a first name, the centre name, a status.
  assert.match(server, /export type LeaderOfferSummary = \{\n  educator: string;\n  centreName: string;\n  status: LeaderOfferStatus;\n\};/);
  const route = readFileSync("app/api/centres/leader-offer/invite/route.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(route, /email|shareUrl|token/i, "the response is the summary and nothing else");
  const invites = readFileSync("app/api/centres/invites/route.ts", "utf8");
  assert.match(invites, /fromOffer \? \{ \.\.\.row, email: null \}/);
  const roster = readFileSync("app/api/centres/route.ts", "utf8");
  assert.match(roster, /viaOffer\.has\(member\.user_id\) \? \{ \.\.\.member, full_name: educatorFirstName\(member\.full_name\), email: null \}/);
});

test("the migration is additive, and both tables stay service-role only", () => {
  const sql = readFileSync("supabase/migrations/20261113_leader_offer.sql", "utf8");
  assert.doesNotMatch(sql, /\bdrop\b|create policy|grant /i);
  for (const line of sql.split("\n").filter((l) => /^alter table .* add column/.test(l))) assert.match(line, /add column if not exists/);
  assert.match(sql, /revoke all on table public\.story_checks from anon, authenticated/);
  assert.match(sql, /revoke all on table public\.centre_invites from anon, authenticated/);
  assert.match(sql, /offer_ref_hash text/);
  assert.doesNotMatch(sql, /offer_ref text/, "the reference itself is never stored");
  assert.match(readFileSync("scripts/verify-migrations.sh", "utf8"), /20261113_leader_offer\.sql/);
});

// ---------------------------------------------------------------- the message to the manager

test("the ready-made message asks for the room, under 120 words, naming no other product", () => {
  for (const [founding, words] of [[true, centreTrialWords(NOV_13)], [false, centreTrialWords(JAN_2)]] as const) {
    const message = CENTRE_MESSAGE("https://storyloop.space/for-centres?ref=ABC234#founding", founding, words);
    const count = message.split(/\s+/).filter(Boolean).length;
    assert.ok(count < CENTRE_MESSAGE_MAX_WORDS, `${count} words`);
    assert.match(message, /try StoryLoop for our room/);
    assert.match(message, /end-of-year summaries and transition statements/);
    assert.ok(message.includes(`It is ${words} with no card needed`), message);
    assert.match(message, /copy into whatever we already use in one tap/);
    assert.deepEqual(rivalNames(message), []);
    assert.doesNotMatch(message, /—|–/, "no dashes");
    assert.doesNotMatch(message, /\b(will save|guarantee|saves you|cut your|hours a week)\b/i, "no promised result");
    assert.doesNotMatch(message, /replace/i);
  }
});
