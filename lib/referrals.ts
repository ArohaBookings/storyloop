import Stripe from "stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { PLAN_DEFINITIONS, normalizePlanKey, type CurrencyCode, type PlanKey } from "@/lib/plans";

/** A referrer can earn at most this many free months, ever. */
export const MAX_REFERRAL_CREDITS = 5;

/** Discount the referred person gets on their first month. */
export const REFERRED_DISCOUNT_PERCENT = 10;

/**
 * Free months an educator earns when a CENTRE subscribes on their code.
 *
 * "Get your centre on board." An educator quietly using StoryLoop on their own
 * NZ$21 plan is the person best placed to put it in front of the one person who
 * can buy it for everybody, and they are doing that conversation for free today.
 *
 * Three months rather than one because the two acts are not comparable: telling
 * a colleague costs nothing, while getting a director to move a budget line
 * takes weeks and some professional capital. The arithmetic is also plainly in
 * StoryLoop's favour, which is how an incentive stays payable: a centre plan is
 * NZ$109 a month, so three free educator months cost about NZ$63 against
 * NZ$1,308 of first-year revenue.
 */
export const CENTRE_REFERRAL_MONTHS = 3;

/**
 * How many free months this referral is worth. Pure, so the rule can be read
 * and tested without a Stripe account.
 */
export function referralCreditMonths(referredPlan: unknown): number {
  const key = normalizePlanKey(referredPlan);
  return key === "centre_starter" || key === "centre_growth" ? CENTRE_REFERRAL_MONTHS : 1;
}

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
  | { granted: true; amountCents: number; currency: string; balanceTransactionId: string; referrerId: string; months: number };

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

  // What the referred person actually subscribed to decides the size of the
  // reward: a centre coming aboard is worth three months, an individual one.
  const { data: referred } = await admin
    .from("profiles")
    .select("plan")
    .eq("id", referredUserId)
    .maybeSingle();
  const months = referralCreditMonths(referred?.plan);

  const { data: referrer } = await admin
    .from("profiles")
    .select("id, plan, stripe_customer_id, story_preferences")
    .eq("id", referral.referrer_id)
    .maybeSingle();

  if (!referrer?.stripe_customer_id) {
    // THE HOLE THIS CLOSES. A referrer with no billing account cannot be given
    // a credit, and leaving the row "pending" meant they never would be: the
    // only thing that fires this is the referred person's invoice, which has
    // already happened. An educator on the free plan who talks their centre
    // into a subscription earned nothing, permanently, and that educator is
    // exactly who this programme is for.
    //
    // So it is marked EARNED and waits. When they start a plan of their own,
    // creditEarnedReferrals below pays it, which also turns the reward into
    // the best possible reason to subscribe: three months already banked.
    await admin
      .from("referrals")
      .update({ status: "earned", qualified_at: new Date().toISOString() })
      .eq("id", referral.id)
      .eq("status", "pending");
    return { granted: false, reason: "no_customer" };
  }

  // Value the free month at the referrer's own plan price, so upgrading is
  // rewarded rather than penalised. A referrer still on free earns the
  // Educator price, which is what they would pay if they upgraded.
  const customer = await stripe.customers.retrieve(referrer.stripe_customer_id);
  const currency = (
    ("currency" in customer && customer.currency ? customer.currency : "nzd") as string
  ).toUpperCase() as CurrencyCode;
  const safeCurrency: CurrencyCode = currency === "AUD" ? "AUD" : "NZD";
  const planForCredit = normalizePlanKey(referrer.plan) === "free" ? "educator" : referrer.plan;
  const amountCents = planMonthlyAmountCents(planForCredit, safeCurrency) * months;
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
      description: months > 1
        ? `StoryLoop centre referral reward - ${months} free months (${alreadyCredited + 1} of ${MAX_REFERRAL_CREDITS})`
        : `StoryLoop referral reward - 1 free month (${alreadyCredited + 1} of ${MAX_REFERRAL_CREDITS})`,
      metadata: {
        app: "storyloop",
        referral_id: referral.id,
        referred_user_id: referredUserId,
        months: String(months),
        kind: months > 1 ? "centre" : "educator",
      },
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
      months,
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


/** Free months a referrer has earned but cannot be paid yet, having no plan. */
export async function countEarnedReferrals(referrerId: string) {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from("referrals")
    .select("id, referred_user_id")
    .eq("referrer_id", referrerId)
    .eq("status", "earned");
  if (!data?.length) return { referrals: 0, months: 0 };

  const { data: referred } = await admin
    .from("profiles")
    .select("id, plan")
    .in("id", data.map((row) => row.referred_user_id as string));
  const planOf = new Map((referred ?? []).map((row) => [row.id as string, row.plan]));

  return {
    referrals: data.length,
    months: data.reduce((total, row) => total + referralCreditMonths(planOf.get(row.referred_user_id as string)), 0),
  };
}

/**
 * Pay out everything this person earned before they had somewhere to put it.
 *
 * Called when a referrer pays their own invoice. Idempotency uses the same
 * claim-then-charge shape as a normal credit, with a synthetic invoice id per
 * referral so several payouts on one invoice cannot collide on the unique
 * constraint that protects against replays.
 */
export async function creditEarnedReferrals(
  stripe: Stripe,
  referrerId: string,
  invoiceId: string,
): Promise<{ credited: number; months: number }> {
  const admin = createAdminSupabase();

  const { data: earned } = await admin
    .from("referrals")
    .select("id, referred_user_id")
    .eq("referrer_id", referrerId)
    .eq("status", "earned");
  if (!earned?.length) return { credited: 0, months: 0 };

  const { data: referrer } = await admin
    .from("profiles")
    .select("id, plan, stripe_customer_id")
    .eq("id", referrerId)
    .maybeSingle();
  if (!referrer?.stripe_customer_id) return { credited: 0, months: 0 };

  const customer = await stripe.customers.retrieve(referrer.stripe_customer_id);
  const rawCurrency = ("currency" in customer && customer.currency ? customer.currency : "nzd") as string;
  const currency: CurrencyCode = rawCurrency.toUpperCase() === "AUD" ? "AUD" : "NZD";
  const planForCredit = normalizePlanKey(referrer.plan) === "free" ? "educator" : referrer.plan;

  let credited = 0;
  let monthsTotal = 0;

  for (const row of earned) {
    const alreadyCredited = await countCreditedReferrals(referrerId);
    if (alreadyCredited >= MAX_REFERRAL_CREDITS) break;

    const { data: referred } = await admin
      .from("profiles").select("plan").eq("id", row.referred_user_id as string).maybeSingle();
    const months = referralCreditMonths(referred?.plan);
    const amountCents = planMonthlyAmountCents(planForCredit, currency) * months;
    if (amountCents <= 0) continue;

    // Claim first, so a replayed webhook loses the race before reaching Stripe.
    const { data: claimed } = await admin
      .from("referrals")
      .update({
        status: "credited",
        stripe_invoice_id: `${invoiceId}:${row.id}`,
        credit_amount_cents: amountCents,
        credit_currency: currency,
      })
      .eq("id", row.id)
      .eq("status", "earned")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    try {
      const transaction = await stripe.customers.createBalanceTransaction(referrer.stripe_customer_id, {
        amount: -amountCents,
        currency: currency.toLowerCase(),
        description: months > 1
          ? `StoryLoop centre referral reward - ${months} free months (earned earlier)`
          : "StoryLoop referral reward - 1 free month (earned earlier)",
        metadata: { app: "storyloop", referral_id: row.id as string, months: String(months), kind: "earned" },
      });
      await admin
        .from("referrals")
        .update({ stripe_balance_transaction_id: transaction.id, credited_at: new Date().toISOString() })
        .eq("id", row.id);
      credited += 1;
      monthsTotal += months;
    } catch (error) {
      console.error("Paying an earned referral failed, releasing the claim:", error);
      await admin
        .from("referrals")
        .update({ status: "earned", stripe_invoice_id: null, credit_amount_cents: null, credit_currency: null })
        .eq("id", row.id);
    }
  }

  return { credited, months: monthsTotal };
}
