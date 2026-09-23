"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { getPlanDefinitions, type CurrencyCode } from "@/lib/plans";

/**
 * `audience="individuals"` shows only the plans one educator chooses between.
 * Five plan cards on a phone is a decision, not an invitation; centre plans are
 * one tap away on /pricing, where a director is already comparing properly.
 */
export default function Pricing({ audience = "all" }: { audience?: "all" | "individuals" } = {}) {
  const [currency, setCurrency] = useState<CurrencyCode>("AUD");
  // Founding spots left, from the Stripe coupon (null until known).
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);

  useEffect(() => {
    // Auto-detect by timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz?.includes("Auckland") || tz?.includes("Pacific/Auckland")) setCurrency("NZD");
    fetch("/api/centre-offer")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSpotsLeft(typeof data?.founding?.spotsLeft === "number" ? data.founding.spotsLeft : null))
      .catch(() => {});
  }, []);

  // The homepage shows a short card; /pricing shows everything.
  const compact = audience === "individuals";
  const allPlans = getPlanDefinitions(currency);
  const plans = audience === "individuals" ? allPlans.filter((plan) => !plan.key.startsWith("centre_")) : allPlans;
  const centreStarter = allPlans.find((plan) => plan.key === "centre_starter");

  return (
    <section id="pricing" className="py-24 bg-cream-50 border-y border-clay-100">
      <div className="wide-shell">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-900 mb-4">
            Free to start. One flat price for unlimited.
          </h2>
          <p className="text-ink-600 text-base md:text-lg mb-6">Three stories a month stay free. Paid plans start with a 7-day free trial and cancel anytime.</p>

          {/* Currency toggle */}
          <div className="inline-flex bg-white border border-clay-200 rounded-xl p-1">
            {(["AUD", "NZD"] as const).map(c => (
              <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)}
                className={`px-5 py-1.5 text-sm font-semibold rounded-lg transition-all ${currency === c ? "bg-clay-700 text-paper shadow-warm" : "text-ink-600"}`}>
                {c === "AUD" ? "Australia" : "New Zealand"}
              </button>
            ))}
          </div>
        </div>

        <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 ${audience === "individuals" ? "xl:grid-cols-3" : "xl:grid-cols-5"}`}>
          {plans.map(plan => (
            <div key={plan.name} className={`rounded-2xl p-7 flex flex-col ${plan.popular ? "bg-ink-900 text-paper border-2 border-clay-600 shadow-clay" : "bg-white border border-clay-100 shadow-soft"}`}>
              {plan.popular && (
                <div className="inline-flex items-center gap-1 bg-clay-700 text-paper text-xs font-bold px-3 py-1 rounded-full w-fit mb-3">Most popular</div>
              )}
              <div className="mb-5">
                <p className={`font-semibold ${plan.popular ? "text-cream-300" : "text-clay-700"}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mt-1 mb-2">
                  <span className="font-display text-5xl font-bold">${plan.displayPrice}</span>
                  {plan.displayPrice > 0 && <span className={`mb-2 text-sm ${plan.popular ? "text-ink-300" : "text-ink-500"}`}>{currency}/month</span>}
                </div>
                {plan.priceNote && <p className={`-mt-1 mb-2 text-xs ${plan.popular ? "text-ink-300" : "text-ink-500"}`}>{plan.priceNote}</p>}
                {/* The arithmetic that was always true and never stated: a
                    centre plan divided by its seats costs about half the
                    individual price per educator. */}
                {plan.seats && plan.displayPrice > 0 && (
                  <p className="mb-2 inline-flex w-fit rounded-full border border-sage-200 bg-sage-50 px-2.5 py-1 text-xs font-bold text-sage-800">
                    ${(plan.displayPrice / plan.seats).toFixed(2)} per educator
                  </p>
                )}
                {plan.seats && (
                  <p className="mb-2 text-sm font-semibold text-sage-800">
                    30 days free, no card needed
                    {spotsLeft !== 0 && (
                      <span className="block font-normal text-ink-600">
                        Founding centres then pay half for 3 months{typeof spotsLeft === "number" ? ` (${spotsLeft} of 10 spots left)` : ""}.
                      </span>
                    )}
                  </p>
                )}
                <p className={`text-sm ${plan.popular ? "text-cream-300" : "text-clay-700"}`}>{plan.stories}</p>
                <p className={`mt-2 text-sm leading-relaxed ${plan.popular ? "text-ink-300" : "text-ink-500"}`}>{plan.description}</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {(compact && plan.highlights ? plan.highlights : plan.features).map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.popular ? "text-cream-400" : "text-sage-500"}`} />
                    <span className={plan.popular ? "text-ink-200" : "text-ink-700"}>{f}</span>
                  </li>
                ))}
              </ul>
              {!compact && <div className={`mb-5 rounded-2xl border p-3 ${plan.popular ? "border-ink-700 bg-ink-800/60" : "border-clay-100 bg-cream-50"}`}>
                <p className={`mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${plan.popular ? "text-cream-300" : "text-clay-700"}`}>
                  <ShieldCheck className="h-3.5 w-3.5" /> Built for
                </p>
                <p className={`mb-2 text-xs leading-relaxed ${plan.popular ? "text-ink-300" : "text-ink-600"}`}>{plan.buyer}</p>
                <ul className="space-y-1.5">
                  {plan.painSolved.slice(0, 1).map((pain) => (
                    <li key={pain} className={`text-xs leading-relaxed ${plan.popular ? "text-ink-300" : "text-ink-600"}`}>{pain}</li>
                  ))}
                </ul>
              </div>}
              <Link href={plan.key !== "free" ? `/signup?plan=${plan.key}&currency=${currency}` : "/signup"}
                className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${plan.popular ? "bg-cream-300 hover:bg-cream-200 text-ink-900" : "btn-secondary"}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {compact && (
          <p className="mt-6 text-center text-base">
            <Link href="/pricing" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900">
              Compare everything in each plan
            </Link>
          </p>
        )}

        {compact && centreStarter && (
          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-clay-200 bg-white p-5 text-center shadow-soft">
            <p className="font-display text-lg font-bold text-ink-900">Running a centre?</p>
            <p className="mt-1.5 text-base leading-relaxed text-ink-600">
              Your whole team and unlimited children from ${centreStarter.displayPrice} {currency} a month, with 30 days free and no card.
              {spotsLeft !== 0 && (
                <> The first ten centres then pay half for three months{typeof spotsLeft === "number" ? `, and ${spotsLeft} spots are left` : ""}.</>
              )}
            </p>
            <Link href="/for-centres#founding" className="btn-secondary mt-4 inline-flex text-sm">See the centre offer</Link>
          </div>
        )}

        {/* The one structural difference from every incumbent, stated about
            ourselves only. Naming a competitor's per-child rate would date
            fast and a stale comparative price claim is a Fair Trading Act
            problem, so the contrast is left implicit. */}
        {!compact && <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-sage-200 bg-sage-50/70 p-5 text-center">
          <p className="font-display text-lg font-bold text-ink-900">
            StoryLoop does not charge per child.
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
            Centre plans cover unlimited children. Enrol twenty more tamariki and the price does not move.
            Per educator they work out at about half the individual plan, and you keep the platform your
            centre already runs on, because StoryLoop exports straight into Storypark, Educa, Kinderloop
            and Brightwheel rather than replacing them.
          </p>
          <p className="mt-3 border-t border-sage-200 pt-3 text-sm leading-relaxed text-ink-600">
            <strong className="font-semibold text-ink-900">Your educators keep their drafts.</strong>{" "}
            A centre plan shows leadership who is writing and when, never what they wrote, unless that
            educator turns sharing on themselves. Buying the seats does not buy the diary.
          </p>
        </div>}

        <p className="text-center text-sm text-ink-500 mt-8">All prices GST inclusive · Cancel anytime · Own your data</p>
      </div>
    </section>
  );
}
