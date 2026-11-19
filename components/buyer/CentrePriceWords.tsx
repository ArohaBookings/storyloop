"use client";

import { useEffect, useState } from "react";
import { getPlanByKey, type CurrencyCode } from "@/lib/plans";
import { browserCurrency, priceLabel } from "@/lib/offer-wording";

/**
 * Centre Starter's flat price in the visitor's own currency: "NZ$109 a month
 * for up to 10 educators" in New Zealand, "A$99 ..." everywhere else, chosen
 * the way the pricing page, signup and checkout choose it (lib/offer-wording.ts
 * browserCurrency). From lib/plans.ts, so it is always what checkout charges.
 *
 * The page is built ahead of time, so the server renders the Australian price
 * (checkout's own fallback) and the browser swaps it after the page loads.
 */
export default function CentrePriceWords() {
  const plan = getPlanByKey("centre_starter");
  const [currency, setCurrency] = useState<CurrencyCode>("AUD");
  useEffect(() => setCurrency(browserCurrency()), []);
  return (
    <span data-testid="centre-price-words" data-currency={currency}>
      {priceLabel(plan.price[currency], currency)} a month for up to {plan.seats} educators
    </span>
  );
}
