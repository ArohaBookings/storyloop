import type Stripe from "stripe";
import { SITE_URL } from "@/lib/email/config";
import { getPlanByKey, type CurrencyCode, type PlanKey } from "@/lib/plans";
import { FOUNDING_DISCOUNT_PERCENT } from "@/lib/centre-offer";

const FOUNDING_SHARE = (100 - FOUNDING_DISCOUNT_PERCENT) / 100;

/**
 * What a StoryLoop customer sees on Stripe's pages.
 *
 * The Stripe account is shared with Leo's other businesses and carries one of
 * their names. A StoryLoop customer must never see that name, or any other
 * business, anywhere in StoryLoop's billing. Everything here is set per Checkout
 * Session, so it changes StoryLoop's checkouts and nothing else on the account:
 *
 * - `branding_settings`: StoryLoop's name, logo, icon and colours.
 * - `wallet_options.link = never`: Stripe's Link box says "Pay securely at
 *   <account name>", so it is switched off.
 * - `consent_collection.payment_method_reuse_agreement = hidden` with
 *   `custom_text.after_submit`: Stripe's own line under the button says
 *   "you authorize <account name> to charge you". StoryLoop states the same
 *   authorisation itself, naming StoryLoop.
 * - Card statements already read STORYLOOP.
 *
 * Stripe's customer portal cannot be rebranded per business at all, which is
 * why StoryLoop no longer sends anyone there (see lib/billing-manage.ts).
 *
 * If Stripe ever refuses any of this (an image it cannot fetch, a field a
 * future API version drops), checkout retries without it. Presentation is never
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

/** The rest of what keeps another business's name off StoryLoop's checkout. */
export const CHECKOUT_PRESENTATION = {
  wallet_options: { link: { display: "never" } },
  consent_collection: { payment_method_reuse_agreement: { position: "hidden" } },
} satisfies Pick<Stripe.Checkout.SessionCreateParams, "wallet_options" | "consent_collection">;

/** Whether a Checkout create error is Stripe refusing the branding. */
export function isBrandingRefusal(error: unknown): boolean {
  const e = error as { param?: string; message?: string } | null;
  if (!e) return false;
  const presentation = /branding_settings|wallet_options|consent_collection|after_submit/;
  return presentation.test(e.param ?? "") || presentation.test(e.message ?? "");
}

function day(date: Date) {
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "Pacific/Auckland" }).format(date);
}

function money(plan: PlanKey, currency: CurrencyCode, share = 1) {
  const amount = getPlanByKey(plan).price[currency] * share;
  const text = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${currency === "NZD" ? "NZ$" : "A$"}${text}`;
}

/** How the charge appears on a card statement (the account's StoryLoop descriptor). */
export const STATEMENT_LINE = "It shows on your card statement as STORYLOOP.";

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
  if (input.trialDays <= 0) {
    return `${planName}, ${price} a month. Cancel any time in StoryLoop Billing. ${STATEMENT_LINE}`;
  }
  const firstCharge = day(new Date(now.getTime() + input.trialDays * 86_400_000));
  if (input.noCardNeeded) {
    const then = input.founding
      ? `your first three paid months are half price at ${money(input.plan, input.currency, FOUNDING_SHARE)}, then ${price} a month`
      : `${price} a month`;
    return `${input.trialDays} days free with no card. To keep going after ${firstCharge}, add a card in StoryLoop Billing (${then}). If you don't, the free month simply ends and nothing is charged.`;
  }
  const opener = input.offer === "pro_month" ? `Your free month of ${planName}` : `Your ${input.trialDays}-day free trial`;
  return `${opener} starts today. Nothing is charged until ${firstCharge}, then ${price} a month. Cancel or switch plans before then in StoryLoop Billing and you pay nothing. We'll email you 3 days before. ${STATEMENT_LINE}`;
}

/**
 * StoryLoop's own payment authorisation, shown under the button in place of
 * Stripe's line (which names the account). Only when a card is being saved; a
 * no-card free month saves nothing. Pure.
 */
export function checkoutAuthorisationMessage(input: { trialDays: number; noCardNeeded: boolean; now?: Date }): string | null {
  if (input.noCardNeeded) return null;
  const now = input.now ?? new Date();
  const from = input.trialDays > 0 ? `from ${day(new Date(now.getTime() + input.trialDays * 86_400_000))}` : "from today";
  return `By continuing, you authorise StoryLoop to save this card and charge it for your StoryLoop subscription each month ${from}, until you cancel in StoryLoop Billing.`;
}

/** The text on the StoryLoop card page (Stripe Checkout in setup mode). Pure. */
export function cardUpdateMessages(): { submit: string; afterSubmit: string } {
  return {
    submit: `This card will be used for your StoryLoop subscription from your next payment. Nothing is charged now unless a payment is overdue. ${STATEMENT_LINE}`,
    afterSubmit: "By saving this card, you authorise StoryLoop to charge it for your StoryLoop subscription until you cancel in StoryLoop Billing.",
  };
}
