import Stripe from "stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { PLAN_DEFINITIONS, normalizePlanKey, type CurrencyCode, type PlanKey } from "@/lib/plans";

/** A referrer can earn at most this many free months, ever. */
export const MAX_REFERRAL_CREDITS = 5;

/** Discount the referred person gets on their first month. */
export const REFERRED_DISCOUNT_PERCENT = 10;

/** Stripe coupon id used for that discount. Created on demand, then reused. */
const REFERRAL_COUPON_ID = "storyloop_referral_10";

// Deliberately excludes I, L, O, 0 and 1 so a code read aloud or written on a
// staffroom whiteboard cannot be mistyped.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(length = 7) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/**
 * Returns the user's referral code, creating one if they do not have it yet.
 * Safe to call repeatedly and safe under races: the unique index is the
 * authority, and a collision simply retries with a new code.
 */
export async function getOrCreateReferralCode(userId: string): Promise<string | null> {
  const admin = createAdminSupabase();
  const { data: existing } = await admin
    .from("profiles")
    .select("referral_code")
    .eq("id", userId)
    .maybeSingle();

  if (existing?.referral_code) return existing.referral_code;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = randomCode();
    const { error } = await admin.from("profiles").update({ referral_code: code }).eq("id", userId);
    if (!error) return code;
    // 23505 = unique violation: the code was taken, try another.
    if ((error as { code?: string }).code !== "23505") {
      console.error("Referral code assignment failed:", error);
      return null;
    }
  }
  return null;
}

/** Resolve a share code to the user who owns it. */
export async function findReferrerByCode(code: string): Promise<string | null> {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", clean)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Record that `referredUserId` signed up through `code`.
 * Returns false when the referral is not valid (unknown code, self-referral,
 * or the user was already referred by someone else).
 */
export async function recordReferralSignup(referredUserId: string, code: string) {
  const referrerId = await findReferrerByCode(code);
  if (!referrerId) return false;
  if (referrerId === referredUserId) return false;

  const admin = createAdminSupabase();
  const { error } = await admin.from("referrals").insert({
    referrer_id: referrerId,
    referred_user_id: referredUserId,
    referral_code: code.trim().toUpperCase(),
    status: "pending",
  });
  // Unique violation means this person was already referred; keep the first one.
  if (error && (error as { code?: string }).code !== "23505") {
    console.error("Referral signup record failed:", error);
    return false;
  }
  if (error) return false;

  await admin.from("profiles").update({ referred_by: referrerId }).eq("id", referredUserId);
  return true;
}

/** How many free months this referrer has already been granted. */
export async function countCreditedReferrals(referrerId: string) {
  const admin = createAdminSupabase();
  const { count } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", referrerId)
    .eq("status", "credited");
  return count ?? 0;
}

/** The monthly price of a plan, in cents, in the given currency. */
export function planMonthlyAmountCents(plan: PlanKey | string, currency: CurrencyCode) {
  const key = normalizePlanKey(plan);
  const definition = PLAN_DEFINITIONS.find((entry) => entry.key === key);
  if (!definition) return 0;
  return Math.round(definition.price[currency] * 100);
}

/**
 * The 10%-off-first-month coupon for referred users. Created once, then reused.
 * `duration: "once"` means it only ever applies to the first invoice.
 */
export async function getOrCreateReferralCoupon(stripe: Stripe) {
  try {
    return await stripe.coupons.retrieve(REFERRAL_COUPON_ID);
  } catch {
    return await stripe.coupons.create({
      id: REFERRAL_COUPON_ID,
      percent_off: REFERRED_DISCOUNT_PERCENT,
      duration: "once",
      name: "StoryLoop referral - 10% off first month",
      metadata: { app: "storyloop" },
    });
  }
}

export type ReferralCreditResult =
  | { granted: false; reason: "no_referral" | "already_credited" | "capped" | "no_customer" | "error" }
  | { granted: true; amountCents: number; currency: string; balanceTransactionId: string; referrerId: string };

/**
 * Grant the referrer one free month because `referredUserId` just paid.
 *
 * Idempotency is layered so a webhook replay can never double-credit:
 *  1. the referral row must still be `pending`
 *  2. `stripe_invoice_id` is unique, so the same invoice can only ever land once
 *  3. the 5-credit cap is re-checked immediately before granting
 *
 * The credit is applied as a negative Stripe customer balance transaction,
 * which Stripe automatically consumes on the referrer's next invoice.
 */
export async function grantReferralCreditForPayment(
  stripe: Stripe,
  referredUserId: string,
  invoiceId: string
): Promise<ReferralCreditResult> {
  const admin = createAdminSupabase();

  const { data: referral } = await admin
    .from("referrals")
    .select("id, referrer_id, status")
    .eq("referred_user_id", referredUserId)
    .maybeSingle();

  if (!referral) return { granted: false, reason: "no_referral" };
  if (referral.status !== "pending") return { granted: false, reason: "already_credited" };

  const alreadyCredited = await countCreditedReferrals(referral.referrer_id);
  if (alreadyCredited >= MAX_REFERRAL_CREDITS) {
    await admin
      .from("referrals")
      .update({ status: "capped", qualified_at: new Date().toISOString() })
      .eq("id", referral.id)
      .eq("status", "pending");
    return { granted: false, reason: "capped" };
  }

  const { data: referrer } = await admin
    .from("profiles")
    .select("id, plan, stripe_customer_id, story_preferences")
    .eq("id", referral.referrer_id)
    .maybeSingle();

  if (!referrer?.stripe_customer_id) return { granted: false, reason: "no_customer" };

  // Value the free month at the referrer's own plan price, so upgrading is
  // rewarded rather than penalised. A referrer still on free earns the
  // Educator price, which is what they would pay if they upgraded.
  const customer = await stripe.customers.retrieve(referrer.stripe_customer_id);
  const currency = (
    ("currency" in customer && customer.currency ? customer.currency : "nzd") as string
  ).toUpperCase() as CurrencyCode;
  const safeCurrency: CurrencyCode = currency === "AUD" ? "AUD" : "NZD";
  const planForCredit = normalizePlanKey(referrer.plan) === "free" ? "educator" : referrer.plan;
  const amountCents = planMonthlyAmountCents(planForCredit, safeCurrency);
  if (amountCents <= 0) return { granted: false, reason: "error" };

  // Claim the referral FIRST. The unique stripe_invoice_id means a concurrent
  // or replayed webhook loses this race and never reaches the Stripe call.
  const { data: claimed, error: claimError } = await admin
    .from("referrals")
    .update({
      status: "credited",
      stripe_invoice_id: invoiceId,
      qualified_at: new Date().toISOString(),
      credit_amount_cents: amountCents,
      credit_currency: safeCurrency,
    })
    .eq("id", referral.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (claimError || !claimed) return { granted: false, reason: "already_credited" };

  try {
    const transaction = await stripe.customers.createBalanceTransaction(referrer.stripe_customer_id, {
      amount: -amountCents, // negative = credit toward future invoices
      currency: safeCurrency.toLowerCase(),
      description: `StoryLoop referral reward - 1 free month (${alreadyCredited + 1} of ${MAX_REFERRAL_CREDITS})`,
      metadata: { app: "storyloop", referral_id: referral.id, referred_user_id: referredUserId },
    });

    await admin
      .from("referrals")
      .update({ stripe_balance_transaction_id: transaction.id, credited_at: new Date().toISOString() })
      .eq("id", referral.id);

    return {
      granted: true,
      amountCents,
      currency: safeCurrency,
      balanceTransactionId: transaction.id,
      referrerId: referral.referrer_id,
    };
  } catch (error) {
    // Stripe rejected the credit: release the claim so it can be retried later
    // rather than silently swallowing a reward the user has earned.
    console.error("Referral credit failed, releasing claim:", error);
    await admin
      .from("referrals")
      .update({ status: "pending", stripe_invoice_id: null, credit_amount_cents: null, credit_currency: null })
      .eq("id", referral.id);
    return { granted: false, reason: "error" };
  }
}
