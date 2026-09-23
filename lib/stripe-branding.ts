import type Stripe from "stripe";
import { SITE_URL } from "@/lib/email/config";
import { getPlanByKey, type CurrencyCode, type PlanKey } from "@/lib/plans";

/**
 * What a StoryLoop customer sees on Stripe's pages.
 *
 * The Stripe account is shared with Leo's other businesses and is named after
 * one of them, so an unbranded Checkout said "Aroha Calls" at the top of a
 * StoryLoop payment page. That is the moment a careful educator stops and
 * wonders whether they are in the right place.
 *
 * `branding_settings` is set per Checkout Session, so it changes StoryLoop's
 * checkouts and nothing else on the account. Receipts and card statements still
 * carry the account name; the terms line below says who it is from.
 *
 * If Stripe ever refuses the branding (an image it cannot fetch, a field a
 * future API version drops), checkout retries without it. Branding is never
 * worth a failed checkout.
 */

export const CHECKOUT_BRANDING: Stripe.Checkout.SessionCreateParams.BrandingSettings = {
  display_name: "StoryLoop",
  button_color: "#6f4930",
  background_color: "#fbf8f2",
  border_style: "rounded",
  font_family: "be_vietnam_pro",
  logo: { type: "url", url: `${SITE_URL}/brand/storyloop-logo.png` },
  icon: { type: "url", url: `${SITE_URL}/brand/storyloop-icon.png` },
};

/** Whether a Checkout create error is Stripe refusing the branding. */
export function isBrandingRefusal(error: unknown): boolean {
  const e = error as { param?: string; message?: string } | null;
  if (!e) return false;
  return /branding_settings/.test(e.param ?? "") || /branding_settings/.test(e.message ?? "");
}

function day(date: Date) {
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "Pacific/Auckland" }).format(date);
}

function money(plan: PlanKey, currency: CurrencyCode) {
  const amount = getPlanByKey(plan).price[currency];
  return `${currency === "NZD" ? "NZ$" : "A$"}${amount}`;
}

/**
 * The line under the pay button, in plain words: what happens, when the first
 * charge is, and how not to be charged. Pure.
 */
export function checkoutTermsMessage(input: {
  plan: PlanKey;
  currency: CurrencyCode;
  trialDays: number;
  noCardNeeded: boolean;
  founding: boolean;
  offer: "pro_month" | null;
  now?: Date;
}): string {
  const now = input.now ?? new Date();
  const price = money(input.plan, input.currency);
  const planName = getPlanByKey(input.plan).name;
  const from = "StoryLoop is made by Aria Care, and the charge shows under our payment account.";
  if (input.trialDays <= 0) {
    return `${planName}, ${price} a month. Cancel any time in StoryLoop Billing. ${from}`;
  }
  const firstCharge = day(new Date(now.getTime() + input.trialDays * 86_400_000));
  if (input.noCardNeeded) {
    const then = input.founding ? `half price for three months, then ${price} a month` : `${price} a month`;
    return `${input.trialDays} days free with no card. To keep going after ${firstCharge}, add a card in Billing (${then}). If you don't, the free month simply ends and nothing is charged.`;
  }
  const opener = input.offer === "pro_month" ? `Your free month of ${planName}` : `Your ${input.trialDays}-day free trial`;
  return `${opener} starts today. Nothing is charged until ${firstCharge}, then ${price} a month. Cancel or switch plans before then in StoryLoop Billing and you pay nothing. We'll email you 3 days before. ${from}`;
}
