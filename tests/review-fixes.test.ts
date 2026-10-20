import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import type Stripe from "stripe";
import { shouldForward, FORWARD_WINDOW_MS } from "../lib/auth/forward-guard";
import { chargeDay, pauseViewOf, PAUSE_COOLDOWN_DAYS } from "../lib/billing-pause";
import { checkoutTermsMessage, checkoutAuthorisationMessage } from "../lib/stripe-branding";
import { renderLifecycleEmail } from "../lib/email/templates";

function memoryStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

test("the login page forwards once per destination, then lets the form show (no bounce loop)", () => {
  const store = memoryStore();
  assert.equal(shouldForward("/billing", store, 1_000_000), true);
  assert.equal(shouldForward("/billing", store, 1_000_000 + 5_000), false, "a second forward within 30 s is refused");
  assert.equal(shouldForward("/generate", store, 1_000_000 + 5_000), true, "another destination is independent");
  assert.equal(shouldForward("/billing", store, 1_000_000 + FORWARD_WINDOW_MS + 1), true, "allowed again after the window");
  assert.equal(shouldForward("/billing", null), true, "no storage: forward once");
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
  assert.equal(shouldForward("/billing", broken), true);
});

test("no app page sends signed-out visitors to a bare /login any more", () => {
  const root = path.join(process.cwd(), "app", "(app)");
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && /redirect\(\s*["']\/login["']\s*\)/.test(fs.readFileSync(full, "utf8"))) offenders.push(full);
    }
  };
  walk(root);
  assert.deepEqual(offenders, [], "use redirectToLogin() so the destination survives sign-in");
});

const T = (iso: string) => Math.floor(Date.parse(iso) / 1000);
function sub(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_1", customer: "cus_1", status: "active", currency: "nzd", cancel_at_period_end: false, cancel_at: null, pause_collection: null, metadata: {},
    items: { data: [{ current_period_end: T("2026-10-21T09:36:00Z"), price: { unit_amount: 2100, currency: "nzd" } }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

test("one pause per 180 days, so a pause never becomes free use", () => {
  const now = T("2026-10-19T00:00:00Z");
  assert.equal(pauseViewOf(sub({ metadata: { storyloop_paused_at: "2026-09-01T00:00:00.000Z" } }), now).status, "paused_recently");
  assert.equal(pauseViewOf(sub({ metadata: { storyloop_paused_at: "2026-01-01T00:00:00.000Z" } }), now).status, "can_pause");
  assert.equal(PAUSE_COOLDOWN_DAYS, 180);
});

test("charge dates are shown in the customer's own time zone", () => {
  // 11:30pm UTC on 20 Oct is already Wednesday 21 Oct in Christchurch and Sydney.
  assert.equal(chargeDay("2026-10-20T23:30:00.000Z", "nzd"), "Wednesday 21 October");
  assert.equal(chargeDay("2026-10-20T23:30:00.000Z", "aud"), "Wednesday 21 October");
  assert.equal(chargeDay("2026-10-20T09:00:00.000Z", "nzd"), "Tuesday 20 October");
});

test("a referred educator is told the first month after the trial is free, with the real first charge date", () => {
  const now = new Date("2026-10-19T00:00:00Z");
  const terms = checkoutTermsMessage({ plan: "educator", currency: "NZD", trialDays: 7, noCardNeeded: false, founding: false, offer: null, firstMonthFree: true, now });
  assert.match(terms, /first month after it is free too/);
  assert.match(terms, /Nothing is charged until 26 November 2026, then NZ\$21 a month/);
  const plain = checkoutTermsMessage({ plan: "educator", currency: "NZD", trialDays: 7, noCardNeeded: false, founding: false, offer: null, now });
  assert.match(plain, /Nothing is charged until 26 October 2026/);
  assert.match(checkoutAuthorisationMessage({ trialDays: 7, noCardNeeded: false, firstMonthFree: true, now }) ?? "", /from 26 November 2026/);
});

test("the trial-ending email is honest for a referred educator", () => {
  const email = renderLifecycleEmail({ type: "trial_ending", userId: "u", recipient: "a@b.com", name: "Sam", context: { planLabel: "Educator", amountLabel: "NZ$21", trialEndsOn: "26 October 2026", firstMonthFree: true, firstChargeOn: "26 November 2026" } });
  assert.match(email.text, /first month after it is free too/);
  assert.match(email.text, /first payment of NZ\$21 is on 26 November 2026/);
  assert.ok(!/will be taken then/.test(email.text));
  const normal = renderLifecycleEmail({ type: "trial_ending", userId: "u", recipient: "a@b.com", name: "Sam", context: { planLabel: "Educator", amountLabel: "NZ$21", trialEndsOn: "26 October 2026" } });
  assert.match(normal.text, /first payment of NZ\$21 will be taken then/);
});

test("the referrer is told the credit comes with the friend's first payment, not at signup", () => {
  const email = renderLifecycleEmail({ type: "referral_invite", userId: "u", recipient: "a@b.com", name: "Sam", context: { referralCode: "ABC1234" } });
  assert.match(email.text, /when they make their first payment/);
  assert.ok(!/once they subscribe/i.test(email.text + email.html));
});

test("the upgrade emails carry no em dashes", () => {
  for (const type of ["two_free_stories_used", "free_limit_reached"] as const) {
    const email = renderLifecycleEmail({ type, userId: "u", recipient: "a@b.com", name: "Sam" });
    assert.ok(!/—/.test(email.subject + email.text + email.html), type);
  }
});
