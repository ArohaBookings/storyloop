"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Check } from "lucide-react";

const PLANS_AUD = [
  { name: "Free", price: 0, stories: "3 stories/month", cta: "Start free", features: ["3 stories per month", "EYLF alignment", "Copy & export", "No credit card required"], priceId: null },
  { name: "Educator", price: 19, stories: "Unlimited stories", cta: "Start 7-day free trial", features: ["Unlimited learning stories", "Save unlimited child profiles", "Voice input", "PDF export", "All 3 tone styles", "Story history (12 months)", "Email support"], priceId: "educator", popular: true },
  { name: "Centre", price: 49, stories: "Whole team access", cta: "Start 7-day free trial", features: ["Everything in Educator", "Up to 10 educators", "Shared child profiles", "Centre branding on exports", "Bulk PDF export", "Priority support", "NQF reporting templates"], priceId: "centre" },
];

const PLANS_NZD = [
  { name: "Free", price: 0, stories: "3 stories/month", cta: "Start free", features: ["3 stories per month", "EYLF/Te Whāriki alignment", "Copy & export", "No credit card required"], priceId: null },
  { name: "Educator", price: 21, stories: "Unlimited stories", cta: "Start 7-day free trial", features: ["Unlimited learning stories", "Save unlimited child profiles", "Voice input", "PDF export", "All 3 tone styles", "Story history (12 months)", "Email support"], priceId: "educator", popular: true },
  { name: "Centre", price: 55, stories: "Whole team access", cta: "Start 7-day free trial", features: ["Everything in Educator", "Up to 10 educators", "Shared child profiles", "Centre branding on exports", "Bulk PDF export", "Priority support", "NQF reporting templates"], priceId: "centre" },
];

export default function Pricing() {
  const [currency, setCurrency] = useState<"AUD" | "NZD">("AUD");

  useEffect(() => {
    // Auto-detect by timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz?.includes("Auckland") || tz?.includes("Pacific/Auckland")) setCurrency("NZD");
  }, []);

  const plans = currency === "AUD" ? PLANS_AUD : PLANS_NZD;

  return (
    <section id="pricing" className="py-24 px-6 bg-cream-50 border-y border-clay-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="section-title mb-3">Simple, fair pricing</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-900 mb-4">
            Pay less than one lunch break of saved time.
          </h2>
          <p className="text-ink-600 mb-6">One story saved = 30 mins back with the children.</p>

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map(plan => (
            <div key={plan.name} className={`rounded-2xl p-7 flex flex-col ${plan.popular ? "bg-ink-900 text-paper border-2 border-clay-600 shadow-clay" : "bg-white border border-clay-100 shadow-soft"}`}>
              {plan.popular && (
                <div className="inline-flex items-center gap-1 bg-clay-500 text-paper text-[10px] font-bold px-3 py-1 rounded-full w-fit mb-3">MOST POPULAR</div>
              )}
              <div className="mb-5">
                <p className={`font-semibold ${plan.popular ? "text-cream-300" : "text-clay-700"}`}>{plan.name}</p>
                <div className="flex items-end gap-1 mt-1 mb-2">
                  <span className="font-display text-5xl font-bold">${plan.price}</span>
                  {plan.price > 0 && <span className={`mb-2 text-sm ${plan.popular ? "text-ink-400" : "text-ink-500"}`}>{currency}/month</span>}
                </div>
                <p className={`text-sm ${plan.popular ? "text-cream-300" : "text-clay-700"}`}>{plan.stories}</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.popular ? "text-cream-400" : "text-sage-500"}`} />
                    <span className={plan.popular ? "text-ink-200" : "text-ink-700"}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={plan.priceId ? `/signup?plan=${plan.priceId}` : "/signup"}
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
