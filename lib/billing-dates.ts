/**
 * Which calendar a charge or trial-end date is named in. Pure.
 *
 * A trial ends, and a card is charged, at a moment. The day we name for that
 * moment must never be LATER than the day it happens where the customer is,
 * or "cancel before then" is a promise the charge has already broken.
 *
 * - New Zealand dollars: Pacific/Auckland.
 * - Australian dollars: Australia/Perth, the earliest Australian zone. Perth
 *   is two or three hours behind Sydney, so the day named there is the same as
 *   in Sydney, Melbourne, Brisbane, Adelaide or Darwin, or one day earlier for
 *   a moment late in the evening on the east coast. Never later. (Auckland was
 *   used for everyone for a while: a 7 day trial ending at 22:30 in Sydney was
 *   named as the next day.)
 * - Unknown currency: Perth too, for the same reason.
 *
 * The fixed centre end (23:59:59 on 31 January 2027 in New Zealand) is 18:59
 * in Perth, so it reads "31 January 2027" in both.
 */

export type BillingTimeZone = "Pacific/Auckland" | "Australia/Perth";

export function billingTimeZone(currency: string | null | undefined): BillingTimeZone {
  return String(currency ?? "").trim().toLowerCase() === "nzd" ? "Pacific/Auckland" : "Australia/Perth";
}

function toDate(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

/** A bare calendar date ("2026-11-20") is already a day, not a moment: it is named as written. */
function zoneFor(value: string | number | Date, currency: string | null | undefined): string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? "UTC" : billingTimeZone(currency);
}

/** "20 November 2026", in the customer's part of the world. */
export function billingLongDate(value: string | number | Date, currency: string | null | undefined): string | null {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: zoneFor(value, currency) }).format(date);
}

/** "Friday 20 November", in the customer's part of the world. Built from parts: en-NZ puts a comma after the weekday. */
export function billingDay(value: string | number | Date, currency: string | null | undefined): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-NZ", { weekday: "long", day: "numeric", month: "long", timeZone: zoneFor(value, currency) }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}
