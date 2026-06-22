"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { getPlanDefinitions, type CurrencyCode } from "@/lib/plans";

export default function Pricing() {
  const [currency, setCurrency] = useState<CurrencyCode>("AUD");

  useEffect(() => {
    // Auto-detect by timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz?.includes("Auckland") || tz?.includes("Pacific/Auckland")) setCurrency("NZD");
  }, []);

  const plans = getPlanDefinitions(currency);

  return (
    <section id="pricing" className="py-24 bg-cream-50 border-y border-clay-100">
      <div className="wide-shell">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="section-title mb-3">Simple, fair pricing</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-900 mb-4">
            Pay less than one lunch break of saved time.
          </h2>
          <p className="text-ink-600 mb-6">Start with a simple draft, then review and tweak it before it goes anywhere.</p>

          {/* Currency toggle */}
          <div className="inline-flex bg-white border border-clay-200 rounded-xl p-1">
            {(["AUD", "NZD"] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)}
                className={`px-5 py-1.5 text-sm font-semibold rounded-lg transition-all ${currency === c ? "bg-clay-700 text-paper shadow-warm" : "text-ink-600"}`}>
                {c === "AUD" ? "🇦🇺 Australia" : "🇳🇿 New Zealand"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
          {plans.map(plan => (
            <div key={plan.name} className={`rounded-2xl p-7 flex flex-col ${plan.popular ? "bg-ink-900 text-paper border-2 border-clay-600 shadow-clay" : "bg-white border border-clay-100 shadow-soft"}`}>
              {plan.popular && (
                <div className="inline-flex items-center gap-1 bg-clay-500 text-paper text-[10px] font-bold px-3 py-1 rounded-full w-fit mb-3">MOST POPULAR</div>
              )}
              <div className="mb-5">
                <p className={`font-semibold ${plan.popular ? "text-cream-300" : "text-clay-700"}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mt-1 mb-2">
                  <span className="font-display text-5xl font-bold">${plan.displayPrice}</span>
                  {plan.displayPrice > 0 && <span className={`mb-2 text-sm ${plan.popular ? "text-ink-400" : "text-ink-500"}`}>{currency}/month</span>}
                </div>
                {plan.priceNote && <p className={`-mt-1 mb-2 text-[11px] ${plan.popular ? "text-ink-400" : "text-ink-500"}`}>{plan.priceNote}</p>}
                <p className={`text-sm ${plan.popular ? "text-cream-300" : "text-clay-700"}`}>{plan.stories}</p>
                <p className={`mt-2 text-xs leading-relaxed ${plan.popular ? "text-ink-300" : "text-ink-500"}`}>{plan.description}</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.popular ? "text-cream-400" : "text-sage-500"}`} />
                    <span className={plan.popular ? "text-ink-200" : "text-ink-700"}>{f}</span>
                  </li>
                ))}
              </ul>
              <div className={`mb-5 rounded-2xl border p-3 ${plan.popular ? "border-ink-700 bg-ink-800/60" : "border-clay-100 bg-cream-50"}`}>
                <p className={`mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${plan.popular ? "text-cream-300" : "text-clay-700"}`}>
                  <ShieldCheck className="h-3.5 w-3.5" /> Built for
                </p>
                <p className={`mb-2 text-xs leading-relaxed ${plan.popular ? "text-ink-300" : "text-ink-600"}`}>{plan.buyer}</p>
                <ul className="space-y-1.5">
                  {plan.painSolved.slice(0, 1).map((pain) => (
                    <li key={pain} className={`text-xs leading-relaxed ${plan.popular ? "text-ink-300" : "text-ink-600"}`}>{pain}</li>
                  ))}
                </ul>
              </div>
              <Link href={plan.key !== "free" ? `/signup?plan=${plan.key}&currency=${currency}` : "/signup"}
                className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${plan.popular ? "bg-cream-300 hover:bg-cream-200 text-ink-900" : "btn-secondary"}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-ink-500 mt-8">All prices GST inclusive · Cancel anytime · Own your data</p>
      </div>
    </section>
  );
}
