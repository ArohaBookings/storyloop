/**
 * The price on a wall, as money (release decision 1, 19 Nov 2026).
 *
 * The free-limit wall and the "1 free story left" prompt open Stripe Checkout
 * for Educator with the early-educator offer asked for. What checkout then
 * charges depends on the account (app/api/stripe/checkout/route.ts):
 *
 * - referred, and this is her first StoryLoop subscription: the referral's
 *   first month free (lib/referrals.ts), which goes ahead of every other coupon;
 * - otherwise, on the free plan: the early-educator offer, half price for the
 *   first two paid months (lib/activation-offer.ts);
 * - otherwise: the plain price.
 *
 * So the wall says exactly that, in her currency, as money: "7 days free, then
 * NZ$10.50 a month for 2 months, then NZ$21 a month." No price, plan or coupon
 * is changed here; every number comes from lib/plans.ts, lib/activation-offer.ts
 * and the trial checkout gives (lib/offer-wording.ts). Pure.
 */

import type { CurrencyCode } from "@/lib/plans";
import { ACTIVATION_MONTHS, ACTIVATION_PERCENT_OFF } from "@/lib/activation-offer";
import { educatorOffer, type IndividualPlan } from "@/lib/offer-wording";

export type EducatorDiscount = "activation" | "referral" | "none";

export type DiscountFacts = {
  /** A named special offer (pro_month, winback) was asked for: it has its own terms. */
  specialOffer: boolean;
  /** A centre plan: centres have their own free period and founding coupon. */
  centrePlan: boolean;
  /** She signed up through a referral link. */
  referred: boolean;
  /** She has never had a StoryLoop subscription (unknown history counts as not first). */
  firstSubscription: boolean;
  /** The page asked for the early-educator offer (every wall and upgrade prompt does). */
  activationAsked: boolean;
  /** Her plan right now. */
  accountPlan: string | null | undefined;
};

/** Which discount checkout applies for these facts, in checkout's own order. Pure. */
export function educatorCheckoutDiscount(facts: DiscountFacts): EducatorDiscount {
  if (facts.specialOffer || facts.centrePlan) return "none";
  if (facts.referred && facts.firstSubscription) return "referral";
  if (facts.activationAsked && facts.accountPlan === "free") return "activation";
  return "none";
}

/** "NZ$10.50", "NZ$21", "A$9.50". Pure. */
export function moneyLabel(amount: number, currency: CurrencyCode): string {
  const prefix = currency === "NZD" ? "NZ$" : "A$";
  const cents = Math.round(amount * 100);
  return cents % 100 === 0 ? `${prefix}${cents / 100}` : `${prefix}${(cents / 100).toFixed(2)}`;
}

/** The early-educator monthly price: half of the plan's price. Pure. */
export function activationMonthly(price: number): number {
  return Math.round(price * (100 - ACTIVATION_PERCENT_OFF)) / 100;
}

/**
 * The one line for a wall or the "1 free story left" prompt: what checkout will
 * really charge this account, as money. Pure.
 *   activation: "7 days free, then NZ$10.50 a month for 2 months, then NZ$21 a month."
 *   referral:   "7 days free, then your first month free, then NZ$21 a month."
 *   none:       "7 days free, then NZ$21 a month."
 */
export function educatorCheckoutLine(currency: CurrencyCode, discount: EducatorDiscount, plan: IndividualPlan = "educator"): string {
  const offer = educatorOffer(currency, plan);
  const start = offer.trialDays > 0 ? `${offer.trialDays} days free, then ` : "";
  const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  if (discount === "activation") {
    const half = moneyLabel(activationMonthly(offer.price), currency);
    return sentence(`${start}${half} a month for ${ACTIVATION_MONTHS} months, then ${offer.perMonth}.`);
  }
  if (discount === "referral") return sentence(`${start}your first month free, then ${offer.perMonth}.`);
  return offer.offerLine;
}

/**
 * The statement wall pays today (25 Nov 2026, STATEMENTS_PAY_TODAY): its
 * checkout has no free week. Only for Educator from that wall, never a special
 * offer or a centre plan. Pure.
 */
export function statementWallPaysToday(input: { switchOn: boolean; wall: string | null | undefined; specialOffer: boolean; centrePlan: boolean }): boolean {
  return input.switchOn && input.wall === "statement" && !input.specialOffer && !input.centrePlan;
}

/**
 * What checkout charges today from the statement wall, as one line, from the
 * same discount checkout applies (no free week). Pure.
 *   none:       "NZ$21 today, then NZ$21 a month."
 *   activation: "NZ$10.50 today and next month, then NZ$21 a month."
 *   referral:   "Nothing today: your first month is free, then NZ$21 a month."
 */
export function statementTodayLine(currency: CurrencyCode, discount: EducatorDiscount): string {
  const offer = educatorOffer(currency, "educator");
  const full = moneyLabel(offer.price, currency);
  if (discount === "activation") {
    const half = moneyLabel(activationMonthly(offer.price), currency);
    return ACTIVATION_MONTHS === 2 ? `${half} today and next month, then ${full} a month.` : `${half} today, then ${full} a month after ${ACTIVATION_MONTHS} months.`;
  }
  if (discount === "referral") return `Nothing today: your first month is free, then ${full} a month.`;
  return `${full} today, then ${full} a month.`;
}
