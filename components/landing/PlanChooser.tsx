"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getPlanDefinitions, type CurrencyCode, type PlanKey } from "@/lib/plans";
import { currencyForTimeZone, educatorTrialLine } from "@/lib/offer-wording";
import { useCentreTrialWords } from "@/components/centre/CentreTrialWords";
import { trackEvent } from "@/lib/analytics/track-event";

/**
 * Every plan and its button at the top of /pricing (18 Nov 2026, fault P09).
 *
 * Why. On a phone the paid buttons sat 4.6 to 8.6 screens down, under the long
 * plan cards (review-2026-11-17, signup_walkthrough.json), and in 14 days one
 * checkout started from the page people open to choose a plan. Here each plan
 * is one row: its name, its price, one line and its button, so the choice is
 * on the first screen. The full cards with everything in each plan follow
 * unchanged (components/landing/Pricing.tsx), so nothing is removed.
 *
 * Prices, trials and buttons come from lib/plans.ts and lib/offer-wording.ts,
 * the same as the cards and checkout, and the currency follows the same rule.
 */
export default function PlanChooser() {
  const [currency, setCurrency] = useState<CurrencyCode>("AUD");
  const centreTrial = useCentreTrialWords(undefined, true);

  useEffect(() => {
    try {
      if (currencyForTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) === "NZD") setCurrency("NZD");
    } catch {
      /* Australia */
    }
  }, []);

  const symbol = currency === "NZD" ? "NZ$" : "A$";
  const note = (key: PlanKey, stories: string) => {
    if (key === "free") return "3 stories a month, no card";
    if (key === "educator" || key === "educator_pro") return `${key === "educator" ? stories : "Unlimited, plus the family and continuity tools"} · ${educatorTrialLine()}`;
    // The button already says "no card".
    return `${stories} · ${centreTrial}`;
  };

  return (
    <div className="mt-5 max-w-3xl overflow-hidden rounded-2xl border border-clay-200 bg-white shadow-soft" data-testid="plan-chooser">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-clay-700">Pick a plan</p>
        <div className="inline-flex rounded-lg border border-clay-200 p-0.5" role="group" aria-label="Currency">
          {(["AUD", "NZD"] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={currency === c}
              onClick={() => setCurrency(c)}
              className={`min-h-[36px] rounded-md px-3 text-xs font-semibold ${currency === c ? "bg-clay-700 text-paper" : "text-ink-600"}`}
            >
              {c === "AUD" ? "Australia" : "New Zealand"}
            </button>
          ))}
        </div>
      </div>
      <ul>
        {getPlanDefinitions(currency).map((plan) => (
          <li key={plan.key} className={`flex flex-wrap items-center gap-3 border-t border-clay-100 px-4 py-2.5 ${plan.popular ? "bg-clay-50/70" : ""}`}>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold leading-tight text-ink-900">
                {plan.name}
                {/* The free plan's name already says its price. */}
                {plan.displayPrice > 0 && (
                  <>
                    {" "}
                    <span className="whitespace-nowrap font-display font-bold">
                      {symbol}
                      {plan.displayPrice}
                      <span className="text-xs font-normal text-ink-500"> a month</span>
                    </span>
                  </>
                )}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-ink-600">{note(plan.key, plan.stories)}</p>
            </div>
            <Link
              href={plan.key !== "free" ? `/signup?plan=${plan.key}&currency=${currency}` : "/signup"}
              onClick={() => trackEvent("ui_action", { action: "pricing_top_plan", target: plan.key })}
              className={`${plan.popular ? "btn-primary" : "btn-secondary"} min-h-[44px] max-w-full flex-none justify-center px-3 py-2 text-xs`}
              data-track="pricing_top_plan"
              data-testid={`plan-chooser-${plan.key}`}
            >
              {plan.cta}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
