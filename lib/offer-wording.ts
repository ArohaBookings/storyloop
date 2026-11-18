/**
 * One source of truth for how the offers are worded (18 Nov 2026).
 *
 * Until now the same offer was typed out by hand in a dozen places, and they
 * drifted: centre plans became free until 31 January on 13 Nov, while the
 * pricing card, the features table, the FAQs and the centre page still said
 * "30 days free". Every line here is built from what the code actually does:
 *
 * - The Educator price and trial: lib/plans.ts (the price) and checkoutTerms in
 *   lib/centre-offer.ts (the trial checkout gives an individual plan), in the
 *   visitor's currency picked the way the pricing page picks it.
 * - The centre's free period: what lib/centre-offer.ts grants a centre that
 *   starts on the day in question. Never a typed length or date.
 *
 * Pages built ahead of time cannot know the day they are read, so visible
 * text carries a token ({centre_trial}) that components/offer/OfferText.tsx
 * fills in the browser on the day. Text read by machines (meta descriptions,
 * structured data) uses the evergreen wording, which is true on every date.
 *
 * Nothing here mentions pausing or cancelling: that lives on Billing only.
 */

import { getPlanByKey, type CurrencyCode } from "@/lib/plans";
import {
  CENTRE_TRIAL_DAYS,
  centreTrialDays,
  centreTrialEnd,
  centreTrialWords,
  centreTrialWordsCapital,
  checkoutTerms,
} from "@/lib/centre-offer";

/**
 * The visitor's currency, exactly as the pricing page, signup and Billing
 * choose it: New Zealand time zones pay in NZD, everyone else in AUD (which is
 * also what checkout falls back to). Pure.
 */
export function currencyForTimeZone(zone: string | null | undefined): CurrencyCode {
  return typeof zone === "string" && zone.includes("Auckland") ? "NZD" : "AUD";
}

/** The currency in this browser, or AUD when it cannot be read. */
export function browserCurrency(): CurrencyCode {
  try {
    return currencyForTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return "AUD";
  }
}

/** "NZ$21" or "A$19". Pure. */
export function priceLabel(amount: number, currency: CurrencyCode): string {
  return `${currency === "NZD" ? "NZ$" : "A$"}${amount}`;
}

export type IndividualPlan = "educator" | "educator_pro";

export type EducatorOffer = {
  plan: IndividualPlan;
  currency: CurrencyCode;
  /** Whole currency units a month, from lib/plans.ts. */
  price: number;
  /** "NZ$21". */
  priceLabel: string;
  /** "NZ$21 a month". */
  perMonth: string;
  /** Days free before the first charge, as checkout gives them (7). */
  trialDays: number;
  /** "7-day free trial". */
  trialLine: string;
  /** "7 days free, then NZ$21 a month." The line for a wall or a button note. */
  offerLine: string;
  /** Checkout asks for a card for an individual trial. */
  cardNeeded: boolean;
};

/**
 * The Educator (or Educator Pro) offer in one currency, with no discount or
 * special offer applied: the plain terms the pricing page states and checkout
 * gives. Pure.
 */
export function educatorOffer(currency: CurrencyCode, plan: IndividualPlan = "educator"): EducatorOffer {
  const price = getPlanByKey(plan).price[currency];
  const terms = checkoutTerms({ plan, spotsLeft: null, hadCentreBefore: false, couponId: "" });
  const label = priceLabel(price, currency);
  const perMonth = `${label} a month`;
  return {
    plan,
    currency,
    price,
    priceLabel: label,
    perMonth,
    trialDays: terms.trialDays,
    trialLine: `${terms.trialDays}-day free trial`,
    offerLine: terms.trialDays > 0 ? `${terms.trialDays} days free, then ${perMonth}.` : `${perMonth}.`,
    cardNeeded: !terms.noCardNeeded,
  };
}

/** Shorthand: "NZ$21 a month". Pure. */
export function educatorPriceLine(currency: CurrencyCode, plan: IndividualPlan = "educator"): string {
  return educatorOffer(currency, plan).perMonth;
}

/** Shorthand: "7-day free trial". Pure. */
export function educatorTrialLine(): string {
  return educatorOffer("AUD").trialLine;
}

export type CentreOfferWording = {
  /** When a centre starting at that moment stops being free, or null for the plain 30 days. */
  freeUntil: Date | null;
  /** Whole days free, as checkout grants them. */
  trialDays: number;
  /** "free until 31 January" or "30 days free": inside a sentence. */
  words: string;
  /** "Free until 31 January" or "30 days free": at the start of one. */
  wordsCapital: string;
  /** "Free until 31 January, no card needed". */
  line: string;
  /** "Until 31 January" or "First 30 days": a label beside the word "Free". */
  periodLabel: string;
};

/** What a centre that starts at `at` gets, in words. Pure. */
export function centreOfferWording(at: Date = new Date()): CentreOfferWording {
  const words = centreTrialWords(at);
  const wordsCapital = centreTrialWordsCapital(at);
  return {
    freeUntil: centreTrialEnd(at),
    trialDays: centreTrialDays(at),
    words,
    wordsCapital,
    line: `${wordsCapital}, no card needed`,
    periodLabel: words.startsWith("free until ") ? `Until ${words.slice("free until ".length)}` : `First ${centreTrialDays(at)} days`,
  };
}

/** "Free until 31 January, no card needed" (or "30 days free, no card needed" from 1 January 2027). Pure. */
export function centreOfferLine(at: Date = new Date()): string {
  return centreOfferWording(at).line;
}

/**
 * True on every date, for text that cannot follow the calendar: meta
 * descriptions, structured data, legal text. "at least 30 days free", from
 * the floor lib/centre-offer.ts never goes under.
 */
export const CENTRE_TRIAL_EVERGREEN = `at least ${CENTRE_TRIAL_DAYS} days free`;

/** In visible text, replaced by the day's words ("free until 31 January" / "30 days free"). */
export const CENTRE_TRIAL_TOKEN = "{centre_trial}";
/** The same at the start of a sentence or a heading ("Free until 31 January"). */
export const CENTRE_TRIAL_TOKEN_CAPITAL = "{Centre_trial}";
const TOKEN_PATTERN = /\{centre_trial\}|\{Centre_trial\}/g;

export type OfferTextPart = { kind: "text"; text: string } | { kind: "centre_trial"; capital: boolean };

/** Text split around the tokens, for a component to render. Pure. */
export function splitOfferText(text: string): OfferTextPart[] {
  const parts: OfferTextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ kind: "text", text: text.slice(last, index) });
    parts.push({ kind: "centre_trial", capital: match[0] === CENTRE_TRIAL_TOKEN_CAPITAL });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

/**
 * The text with its tokens filled in as plain words: for the day `at`, or,
 * with `evergreen`, the wording that is true on every date (for meta
 * descriptions and structured data on pages built ahead of time). Pure.
 */
export function fillOfferText(text: string, at: Date = new Date(), options: { evergreen?: boolean } = {}): string {
  const words = options.evergreen ? CENTRE_TRIAL_EVERGREEN : centreTrialWords(at);
  const capital = words.charAt(0).toUpperCase() + words.slice(1);
  return text.replace(TOKEN_PATTERN, (token) => (token === CENTRE_TRIAL_TOKEN_CAPITAL ? capital : words));
}

/** Whether a string still holds a token (for tests and checks). Pure. */
export function hasOfferToken(text: string): boolean {
  return /\{centre_trial\}|\{Centre_trial\}/.test(text);
}
