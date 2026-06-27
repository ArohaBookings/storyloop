"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { getPlanByKey, normalizePlanKey, type CurrencyCode, type PlanKey } from "@/lib/plans";

function normaliseCurrency(value: string | null): CurrencyCode {
  return value === "NZD" ? "NZD" : "AUD";
}

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<PlanKey>("free");
  const [currency, setCurrency] = useState<CurrencyCode>("AUD");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedPlan = normalizePlanKey(params.get("plan"));
    const selectedCurrency = params.get("currency");
    const code = params.get("code");
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setPlan(selectedPlan);
    setCurrency(selectedCurrency ? normaliseCurrency(selectedCurrency) : tz?.includes("Auckland") ? "NZD" : "AUD");
    if (code) setAccessCode(code);
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, plan, accessCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create account");
        setLoading(false);
        return;
      }

      if (plan !== "free") {
        const checkoutResponse = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, currency }),
        });
        const checkoutData = await checkoutResponse.json();

        if (!checkoutResponse.ok || !checkoutData.url) {
          setError(checkoutData.error ?? "Your account was created, but checkout could not start. Sign in and open Billing to continue.");
          setLoading(false);
          return;
        }

        window.location.replace(checkoutData.url);
        return;
      }

      // Land new free educators straight in the guided first-story flow, not the
      // dashboard — the fastest path to their first "aha" and the biggest lever
      // on activation.
      window.location.replace("/generate?welcome=1");
    } catch {
      setError("Failed to create account");
      setLoading(false);
    }
  };

  const selectedPlan = getPlanByKey(plan);
  const isPaidPlan = plan !== "free";
  const selectedPrice = `$${selectedPlan.price[currency]}${selectedPlan.price[currency] > 0 ? ` ${currency}/month` : ""}`;

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 relative paper-texture">
      <div className="absolute inset-0 bg-warm-mesh pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>
        <div className="card p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <Image src="/logo.svg" alt="StoryLoop" width={36} height={36} className="h-9 w-9" />
            <div>
              <span className="font-display text-xl font-bold text-ink-900">StoryLoop</span>
              <p className="text-[9px] text-clay-600 -mt-1 font-mono tracking-widest">BY ARIA CARE</p>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold text-ink-900 mb-1">
            {isPaidPlan ? `Start ${selectedPlan.name}` : "Start free"}
          </h1>
          <p className="text-sm text-ink-500 mb-4">
            {isPaidPlan
              ? "Create your account first, then you’ll go straight to secure Stripe checkout to start the 7-day trial."
              : "3 free stories, no credit card. Have a complimentary code? Add it below."}
          </p>

          <div className="mb-6 rounded-2xl border border-clay-200 bg-cream-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider">Selected plan</p>
                <p className="font-display text-xl font-bold text-ink-900">{selectedPlan.name}</p>
                <p className="text-xs text-ink-600 mt-1">{selectedPlan.description}</p>
                <ul className="mt-3 space-y-1.5">
                  {selectedPlan.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[11px] text-ink-700">
                      <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-sage-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {isPaidPlan && <p className="mt-3 text-[11px] text-clay-700">{selectedPlan.buyer}</p>}
              </div>
              <div className="text-right">
                <p className="font-bold text-ink-900">{selectedPrice}</p>
                {isPaidPlan && <p className="text-[10px] text-clay-600">after trial</p>}
              </div>
            </div>
            {isPaidPlan && (
              <div className="mt-3 inline-flex rounded-xl border border-clay-200 bg-white p-1">
                {(["AUD", "NZD"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCurrency(option)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                      currency === option ? "bg-clay-700 text-paper" : "text-ink-600 hover:bg-cream-50"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div><label className="label">Your name</label><input value={name} onChange={e => setName(e.target.value)} required autoComplete="name" className="input" placeholder="Jane Smith" /></div>
            <div><label className="label">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="input" placeholder="you@centre.com.au" /></div>
            <div><label className="label">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} className="input" placeholder="At least 8 characters" /></div>
            {!isPaidPlan && (
              <div>
                <label className="label">Special access code</label>
                <input
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  autoComplete="off"
                  className="input"
                  placeholder="Optional"
                />
              </div>
            )}
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isPaidPlan ? "Create account and start trial" : "Create free account"}
            </button>
            <p className="text-xs text-ink-500 text-center">By signing up you agree to our <Link href="/terms" className="text-clay-700 hover:underline">Terms</Link> and <Link href="/privacy" className="text-clay-700 hover:underline">Privacy Policy</Link></p>
          </form>
        </div>
        <p className="text-center text-sm text-ink-500 mt-5">Already have an account? <Link href="/login" className="text-clay-700 font-semibold hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}
