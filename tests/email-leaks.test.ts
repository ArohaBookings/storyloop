import assert from "node:assert/strict";
import test from "node:test";
import { WEEKLY_VALUE_MIN_AGE_DAYS } from "../lib/email/automation";
import { renderLifecycleEmail, type LifecycleEmailType } from "../lib/email/templates";
import { safeRedirectPath } from "../lib/safe-redirect";
import {
  EMAIL_CLASS,
  inFreeDecisionWindow,
  HOLDS_EVERYTHING,
  MARKETING_PER_30_DAYS,
  campaignScore,
  deliverabilityGuard,
  gateEmail,
  isMarketing,
  isNotReading,
  orderCandidates,
  timezoneFor,
  type GlobalEmailState,
  type SentEmail,
} from "../lib/email/brain";
import { safePath, signLink, verifyLink, withTracking } from "../lib/email/tracking";

const DAY = 86_400_000;
// 10am in Sydney on a Tuesday: inside waking hours for the default time zone.
const NOW = new Date("2026-11-03T23:00:00Z");
const OPEN: GlobalEmailState = { pausedReason: null, slowMode: false, sentLast24h: 0, trackingSince: null };
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();
const sent = (type: LifecycleEmailType, days: number, extra: Partial<SentEmail> = {}): SentEmail => ({ type, sentAt: ago(days), ...extra });
const gate = (type: LifecycleEmailType, history: SentEmail[], global: Partial<GlobalEmailState> = {}, opts: { triggeredByUser?: boolean; timeZone?: string; now?: Date } = {}) =>
  gateEmail({ type, history, global: { ...OPEN, ...global }, now: opts.now ?? NOW, timeZone: opts.timeZone ?? "Australia/Sydney", triggeredByUser: opts.triggeredByUser });

// Leo, 3 Nov 2026: "never more than 2 a month". In the 30 days before, sixteen
// people got three to six non-billing emails each under the old weekly cap.
test("never more than two non-billing emails to one person in 30 days", () => {
  assert.equal(MARKETING_PER_30_DAYS, 2);
  const two = [sent("no_first_story", 20), sent("two_free_stories_used", 9)];
  for (const type of ["free_limit_reached", "checkout_abandoned", "winback_offer", "went_quiet", "weekly_value"] as const) {
    const result = gate(type, two);
    assert.equal(result.allow, false, type);
    assert.equal(result.allow === false && result.reason, "monthly_cap", type);
  }
  // A third email is fine once the first is more than 30 days old.
  assert.equal(gate("free_limit_reached", [sent("no_first_story", 31), sent("two_free_stories_used", 9)]).allow, true);
});

test("billing and account email is never held, even when everything else is paused", () => {
  for (const type of ["payment_failed", "payment_failed_final", "trial_ending", "welcome", "payment_succeeded", "cancellation_scheduled", "subscription_cancelled", "referral_earned", "referral_joined"] as const) {
    assert.equal(EMAIL_CLASS[type], "transactional", type);
    assert.equal(gate(type, [sent("weekly_value", 1), sent("went_quiet", 2), sent("free_limit_reached", 3)], { pausedReason: "complaints" }).allow, true, type);
  }
});

test("the moments someone decides to pay always come first, and tips never use the last slot", () => {
  const ordered = orderCandidates([{ type: "weekly_value" as const }, { type: "free_limit_reached" as const }, { type: "went_quiet" as const }, { type: "winback_offer" as const }]);
  assert.deepEqual(ordered.map((c) => c.type), ["free_limit_reached", "winback_offer", "went_quiet", "weekly_value"]);
  // After one email this month, a tip waits; "out of free stories" does not.
  const one = [sent("no_first_story", 10)];
  assert.equal(gate("weekly_value", one).allow, false);
  assert.equal(gate("feedback_request", one).allow, false);
  assert.equal(gate("first_story_created", one).allow, false, "the first-story feedback ask is a tip");
  assert.equal(gate("free_limit_reached", one).allow, true);
});

test("emails are spaced out, the paying moments least, and not at all when the person's own action triggers them", () => {
  assert.equal(gate("free_limit_reached", [sent("no_first_story", 2)]).allow, false, "two days after another email");
  // t44: a tip an hour ago must not hold back "one story left" the moment they use their second free story.
  assert.equal(gate("two_free_stories_used", [sent("feedback_request", 0.04)], {}, { triggeredByUser: true }).allow, true);
  // ...but it still counts toward Leo's two a month.
  assert.equal(gate("free_limit_reached", [sent("feedback_request", 0.04), sent("two_free_stories_used", 0.01)], {}, { triggeredByUser: true }).allow, false);
  assert.equal(gate("free_limit_reached", [sent("no_first_story", 3.5)]).allow, true);
  assert.equal(gate("went_quiet", [sent("two_free_stories_used", 4)]).allow, false);
  assert.equal(gate("went_quiet", [sent("two_free_stories_used", 6)]).allow, true);
});

test("scheduled email arrives in waking hours where the educator lives; their own action can send at once", () => {
  // 23:00 UTC is 10am in Sydney, 12 noon in Auckland, 11pm in London.
  assert.equal(gate("no_first_story", [], {}, { timeZone: timezoneFor("UK") }).allow, false);
  assert.equal(gate("no_first_story", [], {}, { timeZone: timezoneFor("NZ") }).allow, true);
  assert.equal(gate("no_first_story", [], {}, { timeZone: timezoneFor("AU") }).allow, true);
  assert.equal(gate("free_limit_reached", [], {}, { timeZone: timezoneFor("UK"), triggeredByUser: true }).allow, true);
  assert.equal(timezoneFor(null), "Australia/Sydney");
  assert.equal(timezoneFor("IE"), "Europe/Dublin");
});

test("spam complaints and bounces stop marketing; unsubscribes slow it; no data never pauses", () => {
  assert.deepEqual(deliverabilityGuard({ sent30: 0, bounced30: 0, complained30: 0, unsubscribed30: 0 }), { pausedReason: null, slowMode: false });
  assert.ok(deliverabilityGuard({ sent30: 80, bounced30: 0, complained30: 2, unsubscribed30: 0 }).pausedReason);
  assert.equal(deliverabilityGuard({ sent30: 80, bounced30: 0, complained30: 1, unsubscribed30: 0 }).slowMode, true, "one complaint slows");
  assert.ok(deliverabilityGuard({ sent30: 40, bounced30: 3, complained30: 0, unsubscribed30: 0 }).pausedReason, "3 bounces in 40 is 7.5%");
  assert.equal(deliverabilityGuard({ sent30: 100, bounced30: 3, complained30: 0, unsubscribed30: 0 }).pausedReason, null, "3% is fine");
  assert.equal(deliverabilityGuard({ sent30: 50, bounced30: 0, complained30: 0, unsubscribed30: 3 }).slowMode, true);
  assert.ok(deliverabilityGuard({ sent30: 0, bounced30: 0, complained30: 0, unsubscribed30: 0 }, "1").pausedReason, "Leo's switch");
  // Slow mode: no tips, and a lower daily ceiling.
  assert.equal(gate("weekly_value", [], { slowMode: true }).allow, false);
  assert.equal(gate("free_limit_reached", [], { slowMode: true }).allow, true);
  assert.equal(gate("free_limit_reached", [], { slowMode: true, sentLast24h: 15 }).allow, false);
  assert.equal(gate("free_limit_reached", [], { sentLast24h: 40 }).allow, false, "40 a day across everyone at most");
});

test("no opens or clicks on three emails: offers and paying moments only, once a month; no tracking data judges nobody", () => {
  const unread = [sent("weekly_value", 70), sent("went_quiet", 50), sent("free_limit_reached", 40)];
  assert.equal(isNotReading(unread, null, NOW), false, "before tracking began nobody is judged");
  assert.equal(isNotReading(unread, ago(80), NOW), true);
  assert.equal(isNotReading([...unread.slice(0, 2), sent("free_limit_reached", 40, { clicked: true })], ago(80), NOW), false);
  assert.equal(gate("went_quiet", unread, { trackingSince: ago(80) }).allow, false);
  assert.equal(gate("winback_offer", unread, { trackingSince: ago(80) }).allow, true);
  assert.equal(gate("winback_offer", [...unread, sent("free_limit_reached", 12)], { trackingSince: ago(80) }).allow, false, "one a month for them");
});

test("a campaign's own numbers only count once it has enough sends, and then the better one goes first", () => {
  assert.equal(campaignScore(undefined), campaignScore({ sent: 5, clicked: 5, converted: 5 }), "five lucky sends move nothing");
  assert.ok(campaignScore({ sent: 60, clicked: 12, converted: 3 }) > campaignScore({ sent: 60, clicked: 1, converted: 0 }));
  const ordered = orderCandidates([{ type: "weekly_value" as const }, { type: "family_pack_prompt" as const }], {
    weekly_value: { sent: 60, clicked: 1, converted: 0 },
    family_pack_prompt: { sent: 60, clicked: 9, converted: 2 },
  });
  assert.equal(ordered[0].type, "family_pack_prompt");
  assert.ok(HOLDS_EVERYTHING.has("monthly_cap") && !HOLDS_EVERYTHING.has("too_soon"));
});

test("every email the brain treats as marketing carries an unsubscribe link, and the template agrees", () => {
  for (const type of Object.keys(EMAIL_CLASS) as LifecycleEmailType[]) {
    const email = renderLifecycleEmail({ type, userId: "u", recipient: "a@b.com", name: "Sam", context: { referralCode: "ABC1234" } });
    assert.equal(email.marketing, isMarketing(type), `${type}: template and brain disagree`);
    if (email.marketing) assert.ok(email.html.includes("unsubscribe"), `${type} must carry an unsubscribe link`);
    assert.ok(!email.html.includes("—") && !email.text.includes("—"), `${type} has an em dash`);
  }
});

test("tracked links stay on this site, are signed, and leave unsubscribe and other sites alone", () => {
  const id = "11111111-2222-4333-8444-555555555555";
  const html = `<html><body><a href="https://storyloop.space/billing?offer=activation&amp;utm_campaign=x">Go</a> <a href="https://storyloop.space/unsubscribe?t=abc">Unsubscribe</a> <a href="https://example.com/x">Out</a> <a href="mailto:hi@storyloop.space">Mail</a></body></html>`;
  const out = withTracking(html, id);
  assert.ok(out.includes(`https://storyloop.space/api/email/c?e=${id}&amp;u=${encodeURIComponent("/billing?offer=activation&utm_campaign=x")}`), out);
  assert.ok(out.includes('href="https://storyloop.space/unsubscribe?t=abc"'), "unsubscribe untouched");
  assert.ok(out.includes('href="https://example.com/x"') && out.includes('href="mailto:hi@storyloop.space"'));
  assert.ok(out.includes(`/api/email/o?e=${id}`) && out.indexOf("/api/email/o") < out.indexOf("</body>"));
  assert.ok(verifyLink(id, "/billing", signLink(id, "/billing")));
  assert.ok(!verifyLink(id, "/billing?evil=1", signLink(id, "/billing")));
  assert.equal(safePath("//evil.com"), null);
  assert.equal(safePath("https://evil.com"), null);
  assert.equal(safePath("/billing?offer=activation"), "/billing?offer=activation");
});

test("no weekly tip in an account's first week", () => {
  assert.ok(WEEKLY_VALUE_MIN_AGE_DAYS >= 7);
});

// Email buttons go straight to the page with the offer; a signed-out reader is
// sent to sign in and brought back by the app (tests/login-redirect.test.ts).
test("upgrade email buttons land on billing with the offer and keep attribution", () => {
  for (const type of ["free_limit_reached", "two_free_stories_used"] as const) {
    const email = renderLifecycleEmail({ type, userId: "u", recipient: "a@b.com", name: "Sam" });
    const cta = new URL(email.ctaUrl);
    assert.equal(cta.pathname, "/billing");
    assert.equal(cta.searchParams.get("offer"), "activation");
    assert.equal(cta.searchParams.get("utm_campaign"), type);
    assert.equal(safeRedirectPath(`${cta.pathname}${cta.search}`), `${cta.pathname}${cta.search}`, "a safe sign-in return target");
  }
});

test("public pages in emails are linked directly", () => {
  const email = renderLifecycleEmail({ type: "referral_invite", userId: "u", recipient: "a@b.com", name: "Sam", context: { referralCode: "ABC1234" } });
  assert.ok(!email.html.includes("/login?redirect="), "no sign-in wrapping on email links");
});

test("the one-story-left email does not repeat the offer wording", () => {
  const email = renderLifecycleEmail({ type: "two_free_stories_used", userId: "u", recipient: "a@b.com", name: "Sam" });
  assert.ok(!/first month is .*first month/i.test(email.text), email.text);
});

test("the friend-joined email states the real reward for paying and free referrers", () => {
  const paying = renderLifecycleEmail({ type: "referral_joined", userId: "u", recipient: "a@b.com", name: "Sam", context: { referrerPaying: true } });
  const free = renderLifecycleEmail({ type: "referral_joined", userId: "u", recipient: "a@b.com", name: "Sam", context: { referrerPaying: false } });
  assert.ok(/free month/.test(paying.text) && /three if it is a centre plan/.test(paying.text) && /next invoice/.test(paying.text));
  assert.ok(/kept for you/.test(free.text) && !/next invoice/.test(free.text));
});

test("tips wait while a free educator is deciding whether to pay, and the more relevant tip goes first", () => {
  assert.equal(inFreeDecisionWindow({ plan: "free", storiesThisMonth: 1, monthlyLimit: 3 }), true);
  assert.equal(inFreeDecisionWindow({ plan: "free", storiesThisMonth: 2, monthlyLimit: 3 }), true);
  assert.equal(inFreeDecisionWindow({ plan: "free", storiesThisMonth: 0, monthlyLimit: 3 }), false, "not started this month");
  assert.equal(inFreeDecisionWindow({ plan: "free", storiesThisMonth: 3, monthlyLimit: 3 }), false, "already at the limit");
  assert.equal(inFreeDecisionWindow({ plan: "educator", storiesThisMonth: 2, monthlyLimit: null }), false, "paying");
  const forCentre = orderCandidates([{ type: "family_pack_prompt" as const }, { type: "weekly_value" as const }, { type: "centre_planning_prompt" as const }]);
  assert.equal(forCentre[0].type, "centre_planning_prompt");
});

// Leo, 3 Nov 2026: "if they're using a lot of it, then don't send as much… maybe
// only send one", "signed up, not subscribed, and they're using a lot, then send
// a couple… give them an offer", "not using it at all… give them some tips".
test("how someone uses StoryLoop decides how much email they get", async () => {
  const { usageSegment, REGULAR_STORIES_30D } = await import("../lib/email/brain");
  assert.equal(REGULAR_STORIES_30D, 4);
  assert.equal(usageSegment({ paying: true, storiesLast30: 6 }), "regular_payer");
  assert.equal(usageSegment({ paying: true, storiesLast30: 2 }), "other");
  assert.equal(usageSegment({ paying: false, storiesLast30: 2 }), "deciding");
  assert.equal(usageSegment({ paying: false, storiesLast30: 0 }), "not_using");
  assert.equal(usageSegment({ paying: true, storiesLast30: 0 }), "not_using");
  assert.equal(usageSegment(null), null);
  assert.equal(usageSegment({ paying: true, storiesLast30: Number.NaN }), null);

  const withUsage = (type: LifecycleEmailType, history: SentEmail[], usage: { paying: boolean; storiesLast30: number } | null) =>
    gateEmail({ type, history, global: OPEN, now: NOW, timeZone: "Australia/Sydney", usage });

  // A payer writing every week hears from us once a month at most.
  const regular = { paying: true, storiesLast30: 8 };
  assert.equal(withUsage("referral_invite", [], regular).allow, true);
  const heldRegular = withUsage("family_pack_prompt", [sent("referral_invite", 12)], regular);
  assert.equal(heldRegular.allow, false);
  assert.equal(!heldRegular.allow && heldRegular.reason, "monthly_cap");
  // The same history for a light payer is still within the usual two.
  assert.equal(withUsage("went_quiet", [sent("referral_invite", 12)], { paying: true, storiesLast30: 1 }).allow, true);

  // A free educator who is writing: both slots stay for the paying moments and the offer.
  const deciding = { paying: false, storiesLast30: 2 };
  assert.equal(withUsage("two_free_stories_used", [], deciding).allow, true);
  assert.equal(withUsage("free_limit_reached", [sent("two_free_stories_used", 6)], deciding).allow, true);
  assert.equal(withUsage("feedback_request", [sent("two_free_stories_used", 25)], deciding).allow, false);

  // Not using it at all: getting-started help, then a tip may be the second email.
  const idle = { paying: false, storiesLast30: 0 };
  assert.equal(withUsage("usage_tips", [], idle).allow, true);
  assert.equal(withUsage("feedback_request", [sent("usage_tips", 22)], idle).allow, true);
  assert.equal(withUsage("feedback_request", [sent("usage_tips", 10)], idle).allow, false, "tips still wait 21 days after the last email");
  assert.equal(withUsage("weekly_value", [sent("usage_tips", 25), sent("no_first_story", 22)], idle).allow, false, "and never a third in 30 days");

  // Unknown usage changes nothing: two a month, tips only when nothing else went.
  assert.equal(withUsage("family_pack_prompt", [sent("referral_invite", 12)], null).allow, false);
  assert.equal(withUsage("went_quiet", [sent("referral_invite", 12)], null).allow, true);
});

test("the usage tips email is practical, carries an unsubscribe link and offers nothing", () => {
  const email = renderLifecycleEmail({ type: "usage_tips", userId: "u", recipient: "a@b.com", name: "Sam" });
  assert.equal(EMAIL_CLASS.usage_tips, "activation");
  assert.equal(email.marketing, true);
  assert.ok(email.html.includes("unsubscribe"));
  assert.match(email.text, /Talk instead of typing/);
  assert.doesNotMatch(email.html + email.text, /% off|discount|offer=/i);
  assert.doesNotMatch(email.html + email.text, /—/, "no em dashes");
});
