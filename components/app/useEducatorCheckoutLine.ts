"use client";

import { useEffect, useState } from "react";
import { browserCurrency } from "@/lib/offer-wording";
import { educatorCheckoutLine, type EducatorDiscount } from "@/lib/wall-offer";
import type { CurrencyCode } from "@/lib/plans";

/**
 * The money Educator checkout will really charge this account, as one line in
 * her currency (lib/wall-offer.ts), for a wall or the "1 free story left"
 * prompt. Asked once when `active` turns on; null until the answer arrives, so
 * a discount is never shown that checkout might not give.
 */
export function useEducatorCheckoutLine(active = true): { line: string | null; discount: EducatorDiscount | null; currency: CurrencyCode } {
  const [discount, setDiscount] = useState<EducatorDiscount | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>("AUD");
  useEffect(() => {
    if (!active || discount) return;
    let live = true;
    setCurrency(browserCurrency());
    fetch("/api/stripe/checkout-offer", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!live) return;
        const value = data?.discount;
        setDiscount(value === "activation" || value === "referral" ? value : "none");
      })
      .catch(() => { if (live) setDiscount("none"); });
    return () => { live = false; };
  }, [active, discount]);
  return { line: discount ? educatorCheckoutLine(currency, discount) : null, discount, currency };
}
