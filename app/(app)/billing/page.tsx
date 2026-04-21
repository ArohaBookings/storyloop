"use client";
import { useState, useEffect } from "react";
import { Check, Loader2, CreditCard, ExternalLink } from "lucide-react";

const PLANS_AUD = [
  { name: "Free", price: 0, key: "free", stories: "3 stories per month", features: ["3 stories/month", "EYLF alignment", "Story history"] },
  { name: "Educator", price: 19, key: "educator", stories: "Unlimited stories", features: ["Unlimited stories", "Voice input", "PDF export", "All tone styles", "Email support"], popular: true },
  { name: "Centre", price: 49, key: "centre", stories: "Up to 10 educators", features: ["Everything in Educator", "10 educators", "Shared child profiles", "Centre branding", "Priority support"] },
];
const PLANS_NZD = PLANS_AUD.map(p => ({ ...p, price: p.price === 0 ? 0 : p.price === 19 ? 21 : 55 }));

export default function BillingPage() {
  const [currency, setCurrency] = useState<"AUD" | "NZD">("AUD");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<string>("");

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz?.includes("Auckland")) setCurrency("NZD");
    fetch("/api/me").then(r => r.json()).then(data => setProfile(data.profile));
  }, []);

  const handleCheckout = async (plan: string) => {
    setLoading(plan);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, currency }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setLoading(""); alert(data.error ?? "Checkout failed"); }
  };

  const handlePortal = async () => {
    setLoading("portal");
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setLoading(""); alert(data.error); }
  };

  const plans = currency === "AUD" ? PLANS_AUD : PLANS_NZD;
  const currentPlan = profile?.plan ?? "free";

  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink-900">Billing & plan</h1>
        <p className="text-ink-600 text-sm mt-1">Upgrade, downgrade, or cancel anytime.</p>
      </div>

      {/* Current plan card */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="section-title mb-2">Current plan</p>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-ink-900 capitalize">{currentPlan}</h2>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${profile?.subscription_status === "active" ? "bg-sage-100 text-sage-700" : "bg-ink-100 text-ink-600"}`}>
                {profile?.subscription_status ?? "free"}
              </span>
            </div>
            <p className="text-sm text-ink-600 mt-1">{profile?.stories_this_month ?? 0} stories used this month</p>
          </div>
          {currentPlan !== "free" && (
            <button onClick={handlePortal} disabled={loading === "portal"} className="btn-secondary">
              {loading === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Manage billing
            </button>
          )}
        </div>
      </div>

      {/* Currency toggle */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-xl font-bold text-ink-900">Choose a plan</h2>
        <div className="inline-flex bg-white border border-clay-200 rounded-xl p-1">
          {(["AUD", "NZD"] as const).map(c => (
            <button key={c} onClick={() => setCurrency(c)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${currency === c ? "bg-clay-700 text-paper" : "text-ink-600"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => {
          const isCurrent = plan.key === currentPlan;
          return (
            <div key={plan.name} className={`rounded-2xl p-6 flex flex-col ${plan.popular ? "bg-ink-900 text-paper border-2 border-clay-600 shadow-clay" : "bg-white border border-clay-100"}`}>
              {plan.popular && <div className="inline-flex items-center bg-clay-500 text-paper text-[10px] font-bold px-2 py-1 rounded-full w-fit mb-2">MOST POPULAR</div>}
              <p className={`font-semibold text-sm ${plan.popular ? "text-cream-300" : "text-clay-700"}`}>{plan.name}</p>
              <div className="flex items-end gap-1 mt-1 mb-2">
                <span className="font-display text-4xl font-bold">${plan.price}</span>
                {plan.price > 0 && <span className={`mb-1 text-xs ${plan.popular ? "text-ink-400" : "text-ink-500"}`}>{currency}/mo</span>}
              </div>
              <p className={`text-xs mb-4 ${plan.popular ? "text-cream-300" : "text-ink-500"}`}>{plan.stories}</p>
              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${plan.popular ? "text-cream-400" : "text-sage-500"}`} />
                    <span className={plan.popular ? "text-ink-200" : "text-ink-700"}>{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={() => !isCurrent && plan.key !== "free" && handleCheckout(plan.key)} disabled={isCurrent || loading === plan.key || plan.key === "free"}
                className={`py-2.5 rounded-xl font-semibold text-xs transition-all ${
                  isCurrent ? "bg-cream-100 text-clay-700 cursor-default" :
                  plan.popular ? "bg-cream-300 hover:bg-cream-200 text-ink-900" :
                  plan.key === "free" ? "bg-ink-100 text-ink-500 cursor-default" : "btn-secondary"
                }`}>
                {loading === plan.key ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> :
                  isCurrent ? "Current plan" :
                  plan.key === "free" ? "Default" :
                  "Upgrade"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
