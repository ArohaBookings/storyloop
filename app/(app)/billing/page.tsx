"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, Loader2, CreditCard, ExternalLink, LifeBuoy, ShieldCheck } from "lucide-react";
import { getMonthlyStoryLimit, getRemainingStories, getStoryAllowanceLabel } from "@/lib/story-limits";
import { billingStatusLabel, isBillingBlocked, isBillingPastDue } from "@/lib/billing-access";
import { getNextPlan, getPlanByKey, getPlanDefinitions, hasFeatureAccess, normalizePlanKey, requiredPlanForFeature, type CurrencyCode, type FeatureKey, type PlanKey } from "@/lib/plans";

// Appealing, benefit-led copy for a feature a user clicked while locked.
const FEATURE_UPSELL: Partial<Record<FeatureKey, { title: string; blurb: string }>> = {
  learningThreads: {
    title: "Learning threads",
    blurb: "Follow each child's learning over time — every story, reflection, and next step connected into one living thread you can share with whānau.",
  },
  planningBoard: {
    title: "Planning brief",
    blurb: "Turn the stories you already wrote into a room planning brief: emerging interests, environment ideas, and intentional teaching moves — no extra paperwork.",
  },
  adminOversight: {
    title: "Centre tools",
    blurb: "Shared centre voice, a documentation radar, and light admin oversight so every room stays consistent without surveillance.",
  },
  directorRoiDashboard: {
    title: "Director ROI dashboard",
    blurb: "Show time saved, backlog cleared, and documentation health across rooms — the proof that StoryLoop pays for itself.",
  },
};

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [currency, setCurrency] = useState<CurrencyCode>("AUD");
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
      body: JSON.stringify({ plan, currency, activationOffer: searchParams.get("offer") === "activation" }),
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

  const handlePlanUpgrade = async (plan: PlanKey) => {
    if (currentPlan !== "free") {
      await handlePortal();
      return;
    }
    await handleCheckout(plan);
  };

  const plans = getPlanDefinitions(currency);
  const currentPlan = normalizePlanKey(profile?.plan);
  const nextPlan = getNextPlan(currentPlan);
  const nextPlanDetails = nextPlan ? plans.find(plan => plan.key === nextPlan) : null;
  const limit = getMonthlyStoryLimit(profile ?? {});
  const remaining = getRemainingStories(profile ?? {});
  const allowanceLabel = getStoryAllowanceLabel(profile ?? {});
  const upgradeLoading = nextPlan ? loading === nextPlan || loading === "portal" : loading === "portal";
  const billingBlocked = isBillingBlocked(profile ?? {});
  const billingPastDue = isBillingPastDue(profile ?? {});
  const statusLabel = billingStatusLabel(profile?.subscription_status);
  const statusClass = billingBlocked
    ? "bg-red-100 text-red-700"
    : billingPastDue
      ? "bg-amber-100 text-amber-700"
      : profile?.subscription_status === "active" || profile?.subscription_status === "trialing" || profile?.subscription_status === "admin_override"
        ? "bg-sage-100 text-sage-700"
        : "bg-ink-100 text-ink-600";

  const requestedFeature = searchParams.get("feature") as FeatureKey | null;
  const featureUpsell = requestedFeature ? FEATURE_UPSELL[requestedFeature] : null;
  const featureLocked = Boolean(requestedFeature) && !hasFeatureAccess(currentPlan, requestedFeature as FeatureKey);
  const featurePlan = requestedFeature ? getPlanByKey(requiredPlanForFeature(requestedFeature)) : null;

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-ink-900">Billing & plan</h1>
        <p className="text-ink-600 text-sm mt-1">Upgrade, downgrade, or cancel anytime.</p>
      </div>

      {featureUpsell && featureLocked && featurePlan && (
        <div className="mb-8 overflow-hidden rounded-3xl border border-clay-200 bg-gradient-to-br from-clay-50 via-white to-sage-50 shadow-warm">
          <div className="flex flex-col gap-4 p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="section-title mb-1">Unlock {featureUpsell.title}</p>
              <h2 className="font-display text-2xl font-bold text-ink-900">
                {featureUpsell.title} is included in {featurePlan.name}.
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">{featureUpsell.blurb}</p>
            </div>
            <div className="flex flex-shrink-0 flex-col items-start gap-2 md:items-end">
              <div className="text-right">
                <span className="font-display text-3xl font-bold text-ink-900">
                  {currency === "NZD" ? "NZ$" : "A$"}{featurePlan.price[currency]}
                </span>
                <span className="text-sm text-ink-500">/mo</span>
              </div>
              <button
                onClick={() => handlePlanUpgrade(featurePlan.key)}
                disabled={Boolean(loading)}
                className="btn-primary justify-center whitespace-nowrap px-5 py-2.5 text-sm"
              >
                {loading === featurePlan.key || loading === "portal"
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <>Unlock with {featurePlan.name} <ExternalLink className="h-3.5 w-3.5" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {searchParams.get("offer") === "activation" && currentPlan === "free" && (
        <div className="mb-8 rounded-3xl border border-clay-200 bg-gradient-to-br from-cream-100 via-white to-sage-50 p-5 shadow-warm">
          <p className="section-title mb-2">Activation offer</p>
          <h2 className="font-display text-2xl font-bold text-ink-900">A small first-month thank-you is ready at checkout.</h2>
          <p className="mt-1 text-sm text-ink-600">
            If StoryLoop is already helping, this link applies the current first-month activation discount automatically when it is configured in Stripe.
          </p>
        </div>
      )}

      {(billingBlocked || billingPastDue) && (
        <div className={`mb-8 rounded-3xl border p-5 shadow-soft ${billingBlocked ? "border-red-100 bg-red-50" : "border-amber-100 bg-amber-50"}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`mt-1 h-5 w-5 flex-shrink-0 ${billingBlocked ? "text-red-700" : "text-amber-700"}`} />
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${billingBlocked ? "text-red-700" : "text-amber-700"}`}>
                  {statusLabel}
                </p>
                <h2 className="font-display text-2xl font-bold text-ink-900">
                  {billingBlocked ? "Update payment to keep creating stories." : "Stripe is retrying your payment."}
                </h2>
                <p className="mt-1 text-sm text-ink-700">
                  {billingBlocked
                    ? "You can still view history and support, but new story generation pauses until payment is fixed."
                    : "Your StoryLoop access stays on during this retry window. Update your payment method now to avoid interruption."}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button onClick={handlePortal} disabled={loading === "portal"} className="btn-primary">
                {loading === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {billingBlocked ? "Fix payment" : "Open Stripe billing"}
              </button>
              <Link href="/support" className="btn-secondary">
                <LifeBuoy className="w-4 h-4" /> Support
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Current plan card */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="section-title mb-2">Current plan</p>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-2xl font-bold text-ink-900 capitalize">{currentPlan}</h2>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-ink-600 mt-1">
              {profile?.stories_this_month ?? 0} stories used this month
              {limit !== null ? ` · ${remaining ?? 0} left` : ""}
            </p>
            <p className="text-xs text-clay-700 mt-1">{allowanceLabel}</p>
            {profile?.applied_access_code && (
              <p className="text-xs text-ink-500 mt-1">Complimentary access code: {profile.applied_access_code.toUpperCase()}</p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {nextPlanDetails && (
              <button onClick={() => handlePlanUpgrade(nextPlanDetails.key)} disabled={upgradeLoading} className="btn-primary">
                {upgradeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                {currentPlan === "free" ? `Start ${nextPlanDetails.name}` : `Upgrade in Stripe`}
              </button>
            )}
            {currentPlan !== "free" && (
              <button onClick={handlePortal} disabled={loading === "portal"} className="btn-secondary">
                {loading === "portal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {billingBlocked ? "Fix payment" : "Manage subscription"}
              </button>
            )}
          </div>
        </div>
      </div>

      {nextPlanDetails && (
        <div className="mb-8 rounded-3xl border border-clay-200 bg-gradient-to-br from-cream-100 via-white to-sage-50 p-5 md:p-6 shadow-soft">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="section-title mb-2">Recommended next step</p>
              <h2 className="font-display text-2xl font-bold text-ink-900">
                {currentPlan === "free"
                  ? "Unlock unlimited stories before the monthly limit slows you down."
                  : currentPlan === "educator"
                    ? "Add family reply loops, translation, and deeper quality review."
                    : currentPlan === "educator_pro"
                      ? "Move centre-wide when more educators need the same workflow."
                      : "Add director-level ROI and rollout visibility."}
              </h2>
              <p className="text-sm text-ink-600 mt-2 max-w-2xl">
                {currentPlan === "free"
                  ? "Educator unlocks unlimited stories, Observation Coach prompts, export packs, Family Connection Packs, Backlog Rescue, and learning threads."
                  : currentPlan === "educator"
                    ? "Educator Pro adds family replies, translation/readability help, advanced quality details, and stronger continuity across stories."
                    : currentPlan === "educator_pro"
                      ? "Centre Starter adds Planning Board, Documentation Radar, centre calibration, rollout support, and admin oversight."
                      : "Centre Growth adds ROI reporting, multi-room analytics, rollout health, and advanced export settings."}
              </p>
            </div>
            <button onClick={() => handlePlanUpgrade(nextPlanDetails.key)} disabled={upgradeLoading} className="btn-primary flex-shrink-0">
              {upgradeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
              {currentPlan === "free" ? `Upgrade to ${nextPlanDetails.name}` : "Open Stripe portal"}
            </button>
          </div>
        </div>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {plans.map(plan => {
          const isCurrent = plan.key === currentPlan;
          const isNext = plan.key === nextPlan;
          const isPaidChoice = plan.key !== "free";
          const planLoading = loading === plan.key || (currentPlan !== "free" && isNext && loading === "portal");
          return (
            <div key={plan.name} className={`rounded-2xl p-6 flex flex-col relative ${plan.popular ? "bg-ink-900 text-paper border-2 border-clay-600 shadow-clay" : isNext ? "bg-white border-2 border-clay-400 shadow-warm" : "bg-white border border-clay-100"}`}>
              {plan.popular && <div className="inline-flex items-center bg-clay-500 text-paper text-[10px] font-bold px-2 py-1 rounded-full w-fit mb-2">MOST POPULAR</div>}
              {!plan.popular && isNext && <div className="inline-flex items-center bg-clay-100 text-clay-700 text-[10px] font-bold px-2 py-1 rounded-full w-fit mb-2">BEST NEXT STEP</div>}
              <p className={`font-semibold text-sm ${plan.popular ? "text-cream-300" : "text-clay-700"}`}>{plan.name}</p>
              <div className="flex items-end gap-1 mt-1 mb-2">
                <span className="font-display text-4xl font-bold">${plan.displayPrice}</span>
                {plan.displayPrice > 0 && <span className={`mb-1 text-xs ${plan.popular ? "text-ink-400" : "text-ink-500"}`}>{currency}/mo</span>}
              </div>
              {plan.priceNote && <p className={`-mt-1 mb-2 text-[11px] ${plan.popular ? "text-ink-400" : "text-ink-500"}`}>{plan.priceNote}</p>}
              <p className={`text-xs mb-4 ${plan.popular ? "text-cream-300" : "text-ink-500"}`}>{plan.stories}</p>
              <p className={`mb-4 text-xs leading-relaxed ${plan.popular ? "text-ink-300" : "text-ink-600"}`}>{plan.description}</p>
              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs">
                    <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${plan.popular ? "text-cream-400" : "text-sage-500"}`} />
                    <span className={plan.popular ? "text-ink-200" : "text-ink-700"}>{f}</span>
                  </li>
                ))}
              </ul>
              <div className={`mb-5 rounded-2xl border p-3 ${plan.popular ? "border-ink-700 bg-ink-800/60" : "border-clay-100 bg-cream-50"}`}>
                <p className={`mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${plan.popular ? "text-cream-300" : "text-clay-700"}`}>
                  <ShieldCheck className="h-3.5 w-3.5" /> Solves
                </p>
                <p className={`mb-2 text-[11px] leading-relaxed ${plan.popular ? "text-ink-300" : "text-ink-600"}`}>{plan.buyer}</p>
                <ul className="space-y-1.5">
                  {plan.painSolved.slice(0, 1).map((pain) => (
                    <li key={pain} className={`text-[11px] leading-relaxed ${plan.popular ? "text-ink-300" : "text-ink-600"}`}>{pain}</li>
                  ))}
                </ul>
              </div>
              <button onClick={() => !isCurrent && isPaidChoice && handlePlanUpgrade(plan.key)} disabled={isCurrent || planLoading || plan.key === "free"}
                className={`py-2.5 rounded-xl font-semibold text-xs transition-all ${
                  isCurrent ? "bg-cream-100 text-clay-700 cursor-default" :
                  plan.popular ? "bg-cream-300 hover:bg-cream-200 text-ink-900" :
                  plan.key === "free" ? "bg-ink-100 text-ink-500 cursor-default" : "btn-secondary"
                }`}>
                {planLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> :
                  isCurrent ? "Current plan" :
                  plan.key === "free" ? "Included" :
                  currentPlan !== "free" ? "Manage in Stripe" :
                  `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
