import test from "node:test";
import assert from "node:assert/strict";
import { billingDay, billingLongDate, billingTimeZone } from "../lib/billing-dates";
import { formatDate } from "../lib/email/billing";
import { buildNotifications, type NotificationFacts } from "../lib/notifications";
import { checkoutAuthorisationMessage, checkoutTermsMessage } from "../lib/stripe-branding";
import { chargeDay } from "../lib/billing-pause";
import { CENTRE_FREE_UNTIL } from "../lib/centre-offer";

const DAY = 86_400_000;
const facts = (trialEndsAt: Date, billingCurrency: string | null): NotificationFacts => ({
  now: new Date(trialEndsAt.getTime() - 2 * DAY),
  plan: "educator",
  subscriptionStatus: "trialing",
  trialEndsAt: trialEndsAt.toISOString(),
  billingCurrency,
  storiesThisMonth: 0,
  usageResetAt: null,
  monthlyLimit: null,
  referrals: [],
  quiet: null,
  wall: null,
  term: null,
  invites: [],
});

test("the zone follows the currency: NZ$ in Auckland, A$ and unknown in Perth", () => {
  assert.equal(billingTimeZone("nzd"), "Pacific/Auckland");
  assert.equal(billingTimeZone("NZD"), "Pacific/Auckland");
  assert.equal(billingTimeZone("aud"), "Australia/Perth");
  assert.equal(billingTimeZone(null), "Australia/Perth");
  assert.equal(billingTimeZone(""), "Australia/Perth");
});

test("an A$ trial that ends at 22:30 in Sydney is named on the day it ends there, everywhere", () => {
  // Started 13 Nov 2026 at 22:30 AEDT (UTC+11); 7 days later is 22:30 AEDT on 20 Nov,
  // which is already 00:30 on 21 Nov in Auckland.
  const start = new Date("2026-11-13T22:30:00+11:00");
  const end = new Date(start.getTime() + 7 * DAY);
  assert.equal(end.toISOString(), "2026-11-20T11:30:00.000Z");
  assert.equal(billingLongDate(end, "aud"), "20 November 2026");
  assert.equal(formatDate(end.getTime() / 1000, "aud"), "20 November 2026", "the trial-ending email");
  assert.equal(buildNotifications(facts(end, "aud"))[0]?.title, "Your free trial ends Friday 20 November", "the bell");
  assert.equal(billingDay(end.toISOString(), "aud"), "Friday 20 November", "Billing");
  assert.equal(chargeDay(end.toISOString(), "aud"), "Friday 20 November", "pause");
  const checkout = checkoutTermsMessage({ plan: "educator", currency: "AUD", trialDays: 7, noCardNeeded: false, founding: false, offer: null, now: start });
  assert.match(checkout, /Nothing is charged until 20 November 2026/, checkout);
  assert.match(checkoutAuthorisationMessage({ trialDays: 7, noCardNeeded: false, now: start, currency: "AUD" }) ?? "", /from 20 November 2026/);
  // Auckland, which every one of these used for a while, names the next day.
  assert.equal(billingLongDate(end, "nzd"), "21 November 2026");
  // An unknown currency is named as A$ is: never later than the charge.
  assert.equal(formatDate(end.getTime() / 1000), "20 November 2026");
  assert.equal(buildNotifications(facts(end, null))[0]?.title, "Your free trial ends Friday 20 November");
});

test("an NZ$ trial is named in New Zealand time, not the server's UTC", () => {
  // 7 days from 08:00 NZDT on 14 Nov: 08:00 on 21 Nov in Auckland, still 20 Nov in UTC.
  const start = new Date("2026-11-14T08:00:00+13:00");
  const end = new Date(start.getTime() + 7 * DAY);
  assert.equal(end.toISOString(), "2026-11-20T19:00:00.000Z");
  assert.equal(formatDate(end.getTime() / 1000, "nzd"), "21 November 2026");
  assert.equal(buildNotifications(facts(end, "nzd"))[0]?.title, "Your free trial ends Saturday 21 November");
  assert.equal(billingDay(end.toISOString(), "nzd"), "Saturday 21 November");
  const checkout = checkoutTermsMessage({ plan: "educator", currency: "NZD", trialDays: 7, noCardNeeded: false, founding: false, offer: null, now: start });
  assert.match(checkout, /Nothing is charged until 21 November 2026/, checkout);
});

test("the fixed centre end, 23:59:59 on 31 January 2027 in New Zealand, reads 31 January for NZ$ and A$", () => {
  for (const currency of ["nzd", "aud", "NZD", "AUD"]) {
    assert.equal(formatDate(CENTRE_FREE_UNTIL.getTime() / 1000, currency), "31 January 2027", currency);
    assert.equal(billingLongDate(CENTRE_FREE_UNTIL, currency), "31 January 2027", currency);
    assert.equal(billingDay(CENTRE_FREE_UNTIL.toISOString(), currency), "Sunday 31 January", currency);
  }
  for (const currency of ["NZD", "AUD"] as const) {
    const message = checkoutTermsMessage({ plan: "centre_starter", currency, trialDays: 80, noCardNeeded: true, founding: false, offer: null, trialEndsAt: CENTRE_FREE_UNTIL, now: new Date("2026-11-13T10:00:00+13:00") });
    assert.match(message, /^Free until 31 January 2027 with no card\./, message);
  }
});

test("a bare calendar date is named as written", () => {
  assert.equal(billingDay("2026-11-20", "nzd"), "Friday 20 November");
  assert.equal(billingDay("2026-11-20", "aud"), "Friday 20 November");
});
