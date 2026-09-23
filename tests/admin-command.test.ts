import assert from "node:assert/strict";
import test from "node:test";
import { assessBillingRisk, cardExpiresAt, worstRisk, type SubscriptionFacts } from "../lib/billing-risk";
import { summariseFunnel, type EventRow } from "../lib/admin-funnel";

const NOW = Math.floor(Date.UTC(2026, 8, 24) / 1000); // 24 Sep 2026
const DAY = 86_400;

const healthy: SubscriptionFacts = {
  status: "active",
  cancelAtPeriodEnd: false,
  cancelAt: null,
  periodEnd: NOW + 20 * DAY,
  trialEnd: null,
  trialCancelsWithoutCard: false,
  hasCard: true,
  card: { expMonth: 12, expYear: 2028 },
  latestInvoice: { status: "paid", attemptCount: 1, nextAttempt: null, amountDue: 0 },
  discountEnds: null,
  openDisputes: 0,
  cancellationFeedback: null,
  monthly: 21,
  currencySymbol: "NZ$",
};

test("a paying customer with a good card and paid invoice has no risk", () => {
  assert.deepEqual(assessBillingRisk(healthy, NOW), []);
  assert.equal(worstRisk([]), null);
});

test("failing payments and disputes are high risk, with the amount and next retry", () => {
  const failing = assessBillingRisk({ ...healthy, status: "past_due", latestInvoice: { status: "open", attemptCount: 2, nextAttempt: NOW + 3 * DAY, amountDue: 33 } }, NOW);
  assert.equal(failing[0].level, "high");
  assert.match(failing[0].text, /NZ\$33 tried 2 times/);
  assert.match(failing[0].text, /Next retry/);
  const disputed = assessBillingRisk({ ...healthy, openDisputes: 1 }, NOW);
  assert.equal(disputed[0].code, "dispute");
  assert.equal(worstRisk(disputed), "high");
});

test("a card that expires before the next charge is flagged; an already expired card is high", () => {
  const soon = assessBillingRisk({ ...healthy, card: { expMonth: 9, expYear: 2026 }, periodEnd: NOW + 20 * DAY }, NOW);
  assert.equal(soon.find((risk) => risk.code === "card_expiring")?.level, "medium");
  assert.match(soon[0].text, /09\/26/);
  const expired = assessBillingRisk({ ...healthy, card: { expMonth: 8, expYear: 2026 } }, NOW);
  assert.equal(expired.find((risk) => risk.code === "card_expiring")?.level, "high");
  // End of September 2026, inclusive.
  assert.equal(new Date((cardExpiresAt({ expMonth: 9, expYear: 2026 }) + 1) * 1000).toISOString(), "2026-10-01T00:00:00.000Z");
});

test("a scheduled cancellation is medium risk and carries the reason given", () => {
  const risks = assessBillingRisk({ ...healthy, cancelAtPeriodEnd: true, cancellationFeedback: "too_expensive" }, NOW);
  assert.equal(risks[0].code, "cancelling");
  assert.match(risks[0].text, /too expensive/);
  // No card-expiry noise for someone who is leaving anyway.
  assert.equal(risks.some((risk) => risk.code === "card_expiring"), false);
});

test("a centre's no-card free month is low risk until the last week, then medium", () => {
  const trial = { ...healthy, status: "trialing", trialCancelsWithoutCard: true, hasCard: false, card: null, trialEnd: NOW + 20 * DAY };
  assert.equal(assessBillingRisk(trial, NOW)[0].level, "low");
  assert.equal(assessBillingRisk({ ...trial, trialEnd: NOW + 5 * DAY }, NOW)[0].level, "medium");
  const cardTrial = { ...healthy, status: "trialing", trialEnd: NOW + 2 * DAY };
  assert.equal(assessBillingRisk(cardTrial, NOW)[0].code, "first_charge");
});

test("an ending discount is a low note with the price before and after", () => {
  const risks = assessBillingRisk({ ...healthy, monthly: 54.5, discountEnds: { at: NOW + 10 * DAY, from: 54.5, to: 109 } }, NOW);
  assert.equal(risks[0].code, "discount_ending");
  assert.match(risks[0].text, /NZ\$54\.50 rises to NZ\$109/);
});

test("the funnel counts sessions, signups from profiles, and checkouts from Stripe", () => {
  const since = "2026-09-01T00:00:00Z";
  const at = "2026-09-10T00:00:00Z";
  const events: EventRow[] = [
    { event_type: "page_view", session_id: "s1", path: "/", referrer_host: "m.facebook.com", created_at: at },
    { event_type: "page_view", session_id: "s2", path: "/", referrer_host: "google.com", created_at: at },
    { event_type: "page_view", session_id: "s3", path: "/examples", created_at: at },
    { event_type: "demo_example_played", session_id: "s1", path: "/", created_at: at },
    { event_type: "signup_view", session_id: "s1", path: "/signup", created_at: at },
    { event_type: "signup_completed", session_id: "s1", path: "/signup", created_at: at },
    { event_type: "click", session_id: "s1", path: "/", metadata: { label: "Start free", section: "live-demo" }, created_at: at },
    { event_type: "click", session_id: "s2", path: "/", metadata: { label: "Start free", section: "live-demo" }, created_at: at },
    { event_type: "scroll_depth", session_id: "s1", path: "/", metadata: { depth: 50 }, created_at: at },
    { event_type: "section_view", session_id: "s1", path: "/", metadata: { section: "accuracy" }, created_at: at },
    { event_type: "page_exit", session_id: "s1", path: "/", metadata: { seconds: 40 }, created_at: at },
    { event_type: "page_exit", session_id: "s2", path: "/", metadata: { seconds: 10 }, created_at: at },
    // Server events never count as visitors.
    { event_type: "checkout_started", session_id: "user:u1", device: "server", created_at: at },
    // Before the window.
    { event_type: "page_view", session_id: "old", path: "/", created_at: "2026-08-01T00:00:00Z" },
  ];
  const result = summariseFunnel({
    events,
    profiles: [
      { id: "u1", created_at: at, total_stories: 2 },
      { id: "u2", created_at: at, total_stories: 0 },
      { id: "staff", created_at: at, total_stories: 9, is_internal: true },
    ],
    checkouts: [
      { userId: "u1", status: "complete", created: Date.parse(at) / 1000, plan: "educator" },
      { userId: "u2", status: "expired", created: Date.parse(at) / 1000, plan: "educator_pro" },
    ],
    payingUserIds: new Set(["u1"]),
    sinceIso: since,
  });
  const count = (key: string) => result.funnel.find((step) => step.key === key)?.count;
  assert.equal(count("visitors"), 3);
  assert.equal(count("demo"), 1);
  assert.equal(count("signups"), 2, "internal accounts excluded");
  assert.equal(count("first_story"), 1);
  assert.equal(count("checkout"), 2);
  assert.equal(count("started"), 1);
  assert.equal(count("paying"), 1);
  assert.equal(result.abandoned.length, 1);
  assert.equal(result.abandoned[0].userId, "u2");
  assert.equal(result.clicks[0].label, "Start free");
  assert.equal(result.clicks[0].sessions, 2);
  assert.equal(result.homeSessions, 2);
  assert.equal(result.depth.find((row) => row.depth === 50)?.percent, 50);
  assert.equal(result.sections[0].section, "accuracy");
  assert.equal(result.homeSeconds, 25);
  assert.equal(result.sources.find((row) => row.source === "facebook")?.signups, 1);
  assert.equal(result.overall.visitorToSignup, 66.7);
});
