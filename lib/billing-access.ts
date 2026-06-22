import { normalizePlanKey } from "@/lib/plans";

type BillingProfile = {
  plan?: string | null;
  subscription_status?: string | null;
  stripe_customer_id?: string | null;
};

const HEALTHY_PAID_STATUSES = new Set(["active", "trialing", "admin_override"]);
const GRACE_STATUSES = new Set(["past_due"]);
const BLOCKED_STATUSES = new Set([
  "payment_required",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
  "cancelled",
  "canceled",
]);

export function isPaidPlan(plan?: string | null) {
  return normalizePlanKey(plan) !== "free";
}

export function isHealthyPaidStatus(status?: string | null) {
  return HEALTHY_PAID_STATUSES.has(status ?? "free");
}

export function isBillingPastDue(profile: BillingProfile) {
  return isPaidPlan(profile.plan) && GRACE_STATUSES.has(profile.subscription_status ?? "");
}

export function isBillingBlocked(profile: BillingProfile) {
  if (!isPaidPlan(profile.plan)) return false;
  const status = profile.subscription_status ?? "";
  if (HEALTHY_PAID_STATUSES.has(status) || GRACE_STATUSES.has(status)) return false;
  return BLOCKED_STATUSES.has(status) || status.length === 0;
}

export function billingBlockPayload(profile: BillingProfile) {
  return {
    error:
      "Payment is needed to keep creating new learning stories. You can still view history, edit saved stories, open Billing, or contact support.",
    billingRequired: true,
    portalAvailable: Boolean(profile.stripe_customer_id),
  };
}

export function billingStatusLabel(status?: string | null) {
  if (status === "payment_required" || status === "unpaid") return "Payment required";
  if (status === "past_due") return "Payment retrying";
  if (status === "trialing") return "Trial active";
  if (status === "admin_override") return "Admin access";
  if (status === "active") return "Active";
  if (status === "cancelled" || status === "canceled") return "Cancelled";
  return status ?? "Free";
}
