import { createHmac, timingSafeEqual } from "crypto";
import type Stripe from "stripe";
import { findManageableSubscription, nextPaymentFor, ownsSubscription } from "@/lib/billing-manage";

/**
 * Pause payments for a month or a few, from a link in an email (Oct 2026).
 *
 * Built for paying educators who are not using StoryLoop yet: offering a pause
 * is kinder than charging in silence, and keeps the account. The link only
 * opens a page that says what would happen. Nothing changes until the person
 * presses the button, because email security scanners open links on their own.
 *
 * Stripe "pause_collection" with behavior "void": the subscription stays
 * active, invoices due during the pause are voided (nothing is charged), and
 * collection restarts by itself on resumes_at. Restarting is one button.
 */

export const PAUSE_MONTH_OPTIONS = [1, 2, 3] as const;
export type PauseMonths = (typeof PAUSE_MONTH_OPTIONS)[number];
export const PAUSE_LINK_DAYS = 30;
/** One pause per subscription in this many days, so a pause cannot become free use. */
export const PAUSE_COOLDOWN_DAYS = 180;
const DAY = 24 * 60 * 60;

export function isPauseMonths(value: unknown): value is PauseMonths {
  return PAUSE_MONTH_OPTIONS.includes(Number(value) as PauseMonths);
}

function secret() {
  // Same chain as unsubscribe links, so production signs both with one secret
  // (production sets only CRON_SECRET, checked 19 Oct 2026).
  const configured = process.env.EMAIL_UNSUBSCRIBE_SECRET ?? process.env.ADMIN_SESSION_SECRET ?? process.env.CRON_SECRET;
  if (configured) return configured;
  // A well-known fallback would let anyone forge a pause link, so production refuses it.
  if (process.env.NODE_ENV === "production") throw new Error("Pause links need EMAIL_UNSUBSCRIBE_SECRET or CRON_SECRET.");
  return "storyloop-dev-unsubscribe";
}

type PausePayload = { userId: string; exp: number };

function sign(payload: PausePayload) {
  // "pause:" keeps this signature from ever matching an unsubscribe signature.
  return createHmac("sha256", secret()).update(`pause:${payload.userId}:${payload.exp}`).digest("base64url");
}

export function createPauseToken(userId: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const payload: PausePayload = { userId, exp: nowSeconds + PAUSE_LINK_DAYS * DAY };
  return Buffer.from(JSON.stringify({ ...payload, sig: sign(payload) }), "utf8").toString("base64url");
}

export function verifyPauseToken(token: string | null | undefined, nowSeconds = Math.floor(Date.now() / 1000)): PausePayload | null {
  if (!token || token.length > 600) return null;
  let parsed: (PausePayload & { sig?: string }) | null = null;
  try {
    parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed.userId !== "string" || typeof parsed.exp !== "number" || typeof parsed.sig !== "string") return null;
  if (parsed.exp < nowSeconds) return null;
  const expected = Buffer.from(sign({ userId: parsed.userId, exp: parsed.exp }));
  const actual = Buffer.from(parsed.sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return { userId: parsed.userId, exp: parsed.exp };
}

function addMonths(seconds: number, months: number) {
  const d = new Date(seconds * 1000);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // 31 Jan + 1 month must not roll into March.
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return Math.floor(d.getTime() / 1000);
}

function periodEndOf(sub: Stripe.Subscription): number | null {
  const fromItem = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end;
  return fromItem?.current_period_end ?? legacy ?? null;
}

/**
 * When collection restarts. One day before the renewal that follows the pause,
 * so exactly `months` payments are skipped and the next one is taken as normal.
 */
export function pauseResumesAt(periodEnd: number, months: PauseMonths) {
  return addMonths(periodEnd, months) - DAY;
}

export type PauseView = {
  status: "can_pause" | "paused" | "cancelling" | "not_pausable" | "no_subscription" | "paused_recently" | "nothing_due";
  nextChargeAt: string | null;
  pausedUntil: string | null;
  amount: number | null;
  currency: string | null;
  /** For each option, the payments skipped and the date payments restart. */
  options: Array<{ months: PauseMonths; resumesAt: string }>;
};

const iso = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : null);

export function pauseViewOf(sub: Stripe.Subscription | null, nowSeconds = Math.floor(Date.now() / 1000)): PauseView {
  if (!sub) return { status: "no_subscription", nextChargeAt: null, pausedUntil: null, amount: null, currency: null, options: [] };
  const end = periodEndOf(sub);
  const price = sub.items?.data?.[0]?.price;
  const base = { nextChargeAt: iso(end), amount: price?.unit_amount ?? null, currency: sub.currency ?? price?.currency ?? null };
  if (sub.pause_collection) {
    return { status: "paused", ...base, pausedUntil: iso(sub.pause_collection.resumes_at ?? null), options: [] };
  }
  if (sub.cancel_at_period_end || sub.cancel_at) return { status: "cancelling", ...base, pausedUntil: null, options: [] };
  const lastPause = Date.parse(String(sub.metadata?.storyloop_paused_at ?? ""));
  if (Number.isFinite(lastPause) && nowSeconds - lastPause / 1000 < PAUSE_COOLDOWN_DAYS * DAY) {
    return { status: "paused_recently", ...base, pausedUntil: null, options: [] };
  }
  // A trial or an unpaid account is not paused; it is either free already or owes money.
  if (sub.status !== "active" || !end) return { status: "not_pausable", ...base, pausedUntil: null, options: [] };
  return {
    status: "can_pause",
    ...base,
    pausedUntil: null,
    options: PAUSE_MONTH_OPTIONS.map((months) => ({ months, resumesAt: iso(pauseResumesAt(end, months)) as string })),
  };
}

export async function loadPauseView(stripe: Stripe, customerId: string, subscriptionId?: string | null) {
  const found = await findManageableSubscription(stripe, customerId, subscriptionId);
  // Belt and braces: never show or change a subscription this customer does not own.
  const sub = found && ownsSubscription(customerId, found) ? found : null;
  const view = pauseViewOf(sub);
  if (sub && view.status === "can_pause") {
    // The real next charge, after coupons, credit and discounts: the list price
    // is not what a referred or founding customer pays.
    const next = await nextPaymentFor(stripe, sub).catch(() => null);
    if (next) {
      view.amount = next.amount;
      view.currency = next.currency;
      if (next.amount <= 0) return { sub, view: { ...view, status: "nothing_due" as const, options: [] } };
    }
  }
  return { sub, view };
}

export type PauseResult =
  | { ok: true; view: PauseView }
  | { ok: false; reason: "no_subscription" | "cancelling" | "not_pausable" | "already_paused" | "not_paused" | "paused_recently" | "nothing_due" };

export async function pausePayments(stripe: Stripe, input: { customerId: string; subscriptionId?: string | null; months: PauseMonths }): Promise<PauseResult> {
  const { sub, view } = await loadPauseView(stripe, input.customerId, input.subscriptionId);
  if (!sub) return { ok: false, reason: "no_subscription" };
  if (view.status === "paused") return { ok: false, reason: "already_paused" };
  if (view.status !== "can_pause") return { ok: false, reason: view.status === "cancelling" ? "cancelling" : view.status === "paused_recently" ? "paused_recently" : view.status === "nothing_due" ? "nothing_due" : "not_pausable" };
  const end = periodEndOf(sub) as number;
  const updated = await stripe.subscriptions.update(sub.id, {
    pause_collection: { behavior: "void", resumes_at: pauseResumesAt(end, input.months) },
    metadata: { storyloop_paused_at: new Date().toISOString(), storyloop_pause_months: String(input.months) },
  });
  return { ok: true, view: pauseViewOf(updated) };
}

export async function restartPayments(stripe: Stripe, input: { customerId: string; subscriptionId?: string | null }): Promise<PauseResult> {
  const { sub, view } = await loadPauseView(stripe, input.customerId, input.subscriptionId);
  if (!sub) return { ok: false, reason: "no_subscription" };
  if (view.status !== "paused") return { ok: false, reason: "not_paused" };
  const updated = await stripe.subscriptions.update(sub.id, { pause_collection: "" });
  return { ok: true, view: pauseViewOf(updated) };
}

/**
 * A charge or restart date in the customer's own time zone. formatDay is UTC,
 * and an evening renewal in UTC is the next morning in Aotearoa.
 */
export function chargeDay(value: string, currency: string | null | undefined) {
  const timeZone = String(currency ?? "").toLowerCase() === "aud" ? "Australia/Sydney" : "Pacific/Auckland";
  const parts = new Intl.DateTimeFormat("en-NZ", { weekday: "long", day: "numeric", month: "long", timeZone }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}
