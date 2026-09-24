import { getPlanByKey, normalizePlanKey, type PlanKey } from "@/lib/plans";
import { hasLiveStripeSubscription } from "@/lib/admin-guards";

/**
 * "Pro free for a month": the offer emailed to existing free educators.
 *
 * WHAT THEY GET: Educator Pro for 30 days, free. A card is taken at checkout,
 * so the plan carries on without a break if they like it: NZ$33 or A$29 a
 * month from day 31, unless they cancel or step down to Educator before then.
 * That is said on the offer page, on the Stripe page, in the reminder three
 * days before the first charge, and in Billing. Nobody should ever be surprised
 * by the first charge; a surprised educator is a dispute on a Stripe account
 * other businesses share.
 *
 * WHO: people who have a StoryLoop account and are not paying. Never a paying
 * customer (that would be touching their billing), never someone whose centre
 * already covers them, never an internal account.
 *
 * ONE EACH: the grant row in offer_grants IS the offer. Checkout applies these
 * terms only for an unexpired, unredeemed grant belonging to the signed-in
 * account, so a forwarded link or a second click cannot claim it twice.
 */

export const PRO_MONTH_OFFER_ID = "pro_free_month_2026_10";
export const PRO_MONTH_PLAN: PlanKey = "educator_pro";
export const PRO_MONTH_TRIAL_DAYS = 30;
/** How long after the email the offer can be claimed. */
export const PRO_MONTH_CLAIM_DAYS = 14;

export function proMonthPrices() {
  const pro = getPlanByKey(PRO_MONTH_PLAN);
  const educator = getPlanByKey("educator");
  return { pro: pro.price, educator: educator.price };
}

export type OfferProfile = {
  plan?: string | null;
  subscription_status?: string | null;
  stripe_subscription_id?: string | null;
  is_internal?: boolean | null;
  is_active?: boolean | null;
};

export type OfferGrantRow = {
  expires_at: string;
  redeemed_at?: string | null;
};

export type OfferIneligibleReason =
  | "inactive"
  | "internal"
  | "already_paid"
  | "centre_member"
  | "no_offer"
  | "redeemed"
  | "expired";

export type OfferEligibility = { eligible: true } | { eligible: false; reason: OfferIneligibleReason };

const PAID_STATUSES = new Set(["active", "trialing", "past_due", "admin_override", "unpaid", "incomplete"]);

/** Whether this account is paying, or has a subscription Stripe may charge. Pure. */
export function isPayingAccount(profile: OfferProfile): boolean {
  if (normalizePlanKey(profile.plan) !== "free") return true;
  if (PAID_STATUSES.has((profile.subscription_status ?? "").toLowerCase())) return true;
  return hasLiveStripeSubscription(profile);
}

/** Can this person claim the free month right now? Pure. */
export function proMonthEligibility(input: {
  profile: OfferProfile | null;
  grant: OfferGrantRow | null;
  isCentreMember: boolean;
  now?: Date;
}): OfferEligibility {
  const { profile, grant, isCentreMember } = input;
  const now = input.now ?? new Date();
  if (!profile || profile.is_active === false) return { eligible: false, reason: "inactive" };
  if (profile.is_internal) return { eligible: false, reason: "internal" };
  if (isPayingAccount(profile)) return { eligible: false, reason: "already_paid" };
  if (isCentreMember) return { eligible: false, reason: "centre_member" };
  if (!grant) return { eligible: false, reason: "no_offer" };
  if (grant.redeemed_at) return { eligible: false, reason: "redeemed" };
  if (Date.parse(grant.expires_at) <= now.getTime()) return { eligible: false, reason: "expired" };
  return { eligible: true };
}

/** Who the campaign goes to. Pure: the caller supplies the rows. */
// Domains that can never receive mail (reserved for testing, RFC 2606 / 6761),
// our own test domain, and the typos of big providers that turn up in signups.
// Sending to them bounces, and bounces hurt delivery for everyone else.
const UNDELIVERABLE_DOMAIN = /(\.(test|invalid|example|localhost|local)$)|(^|\.)example\.(com|net|org)$|^storyloop\.qa$|^(gnail|gmial|gmal|gmai|gamil|hotmial|hotmal|yaho|yahooo|outlok|iclod)\.[a-z.]+$/i;

/** True when an address can never receive this email. Pure. */
export function isUndeliverableEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return !domain || !domain.includes(".") || UNDELIVERABLE_DOMAIN.test(domain);
}

export function proMonthAudience<T extends OfferProfile & { id: string; email?: string | null; marketing_unsubscribed_at?: string | null }>(input: {
  profiles: T[];
  centreMemberIds: Set<string>;
  unsubscribedEmails: Set<string>;
  alreadyGranted: Set<string>;
}): { include: T[]; excluded: Record<string, number> } {
  const excluded: Record<string, number> = {};
  const skip = (reason: string) => { excluded[reason] = (excluded[reason] ?? 0) + 1; };
  const include: T[] = [];
  for (const profile of input.profiles) {
    const email = (profile.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) { skip("no_email"); continue; }
    if (isUndeliverableEmail(email)) { skip("undeliverable"); continue; }
    if (profile.is_active === false) { skip("inactive"); continue; }
    if (profile.is_internal) { skip("internal"); continue; }
    if (isPayingAccount(profile)) { skip("already_paid"); continue; }
    if (input.centreMemberIds.has(profile.id)) { skip("centre_member"); continue; }
    if (profile.marketing_unsubscribed_at || input.unsubscribedEmails.has(email)) { skip("unsubscribed"); continue; }
    if (input.alreadyGranted.has(profile.id)) { skip("already_offered"); continue; }
    include.push(profile);
  }
  return { include, excluded };
}

/** "Wednesday 7 October", in New Zealand time. en-NZ puts a comma after the weekday. Pure. */
export function longDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-NZ", { weekday: "long", day: "numeric", month: "long", timeZone: "Pacific/Auckland" }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}

/** The first charge date for a free month that starts now. Pure. */
export function proMonthFirstChargeDate(start: Date = new Date()): Date {
  return new Date(start.getTime() + PRO_MONTH_TRIAL_DAYS * 86_400_000);
}

export const OFFER_REASON_COPY: Record<OfferIneligibleReason, string> = {
  inactive: "This account is not active. Reply to your StoryLoop email and we will sort it out.",
  internal: "This is a StoryLoop team account, so the offer does not apply.",
  already_paid: "You are already on a paid plan, so there is nothing to claim. Thank you for being here.",
  centre_member: "Your centre already covers your StoryLoop plan, so you have everything this offer includes.",
  no_offer: "This offer went by email to educators who already had a StoryLoop account, and it is not on this one. You can still try any paid plan free for 7 days.",
  redeemed: "You have already started your free month. It is all in Billing.",
  expired: "This offer has ended. You can still try any paid plan free for 7 days.",
};
