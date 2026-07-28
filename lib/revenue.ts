import { isPaidPlan } from "@/lib/billing-access";
import { normalizePlanKey, type PlanKey } from "@/lib/plans";

/**
 * Revenue accounting rules, in one tested place.
 *
 * Founder, staff, and comp accounts sit on real plans but pay nothing. If they
 * leak into these numbers, MRR and conversion are silently wrong and every
 * decision made from the dashboard is built on a lie. The rules live here
 * rather than inline in a page so they can be unit-tested and cannot drift.
 */

export type RevenueAccount = {
  plan?: string | null;
  subscription_status?: string | null;
  is_internal?: boolean | null;
};

/** Statuses where money is actually expected to flow. */
const PAYING_STATUSES = new Set(["active", "trialing"]);

/**
 * `admin_override` is a healthy status that grants full access WITHOUT a
 * subscription. It must never be counted as revenue, even if someone forgets
 * to set is_internal.
 */
const NON_PAYING_STATUSES = new Set(["admin_override"]);

/** Does this account belong in commercial reporting at all? */
export function isRevenueAccount(account: RevenueAccount) {
  if (account.is_internal) return false;
  if (NON_PAYING_STATUSES.has(account.subscription_status ?? "")) return false;
  return true;
}

/** A real customer on a real paid plan (may be trialing). */
export function isPayingCustomer(account: RevenueAccount) {
  return isRevenueAccount(account) && isPaidPlan(account.plan);
}

/** A paying customer whose subscription is currently generating money. */
export function isActiveRevenue(account: RevenueAccount) {
  return isPayingCustomer(account) && PAYING_STATUSES.has(account.subscription_status ?? "");
}

/** Monthly recurring revenue, in whole dollars, from a list of accounts. */
export function calculateMrr(accounts: RevenueAccount[], prices: Record<PlanKey, number>) {
  return accounts
    .filter(isActiveRevenue)
    .reduce((sum, account) => sum + (prices[normalizePlanKey(account.plan)] ?? 0), 0);
}

/** Annual run rate. */
export function calculateArr(accounts: RevenueAccount[], prices: Record<PlanKey, number>) {
  return calculateMrr(accounts, prices) * 12;
}
