"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Sparkles, History, CreditCard, LogOut, Menu, ShieldAlert, X, LifeBuoy, Mail, AlertTriangle, Brain, Users, ClipboardList, MessageSquareText, BarChart3, SlidersHorizontal, Lock } from "lucide-react";
import AnimatedLogo from "@/components/brand/AnimatedLogo";
import { createClient } from "@/lib/supabase/client";
import { getMonthlyStoryLimit, getStoryAllowanceLabel } from "@/lib/story-limits";
import { billingStatusLabel, isBillingBlocked, isBillingPastDue } from "@/lib/billing-access";
import { normalizePlanKey, hasFeatureAccess, requiredPlanForFeature, type FeatureKey, type PlanKey } from "@/lib/plans";

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  highlight?: boolean;
  activePath?: string;
  // When set, the item is gated: users without access see a lock and are
  // routed to an upgrade view that highlights exactly what unlocks it.
  feature?: FeatureKey;
};

const NAV: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/generate", icon: Sparkles, label: "New story", highlight: true },
  { href: "/children", icon: Users, label: "Child profiles" },
  { href: "/history", icon: History, label: "Story history" },
  { href: "/insights", icon: Brain, label: "Learning threads", feature: "learningThreads" },
  { href: "/planning", icon: ClipboardList, label: "Planning brief", feature: "planningBoard" },
  { href: "/centre-tools", icon: SlidersHorizontal, label: "Centre tools", feature: "adminOversight" },
  { href: "/roi", icon: BarChart3, label: "ROI dashboard", feature: "directorRoiDashboard" },
  { href: "/feedback", icon: MessageSquareText, label: "Feedback" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
  { href: "/support", icon: LifeBuoy, label: "Support" },
];

// Short tier label shown on the lock badge for a gated feature.
const SHORT_PLAN_LABEL: Record<PlanKey, string> = {
  free: "Free",
  educator: "Educator",
  educator_pro: "Pro",
  centre_starter: "Centre",
  centre_growth: "Centre+",
};

const PLAN_LABEL: Record<string, { label: string; colour: string }> = {
  free: { label: "Free", colour: "bg-ink-100 text-ink-600" },
  educator: { label: "Educator", colour: "bg-clay-100 text-clay-700" },
  educator_pro: { label: "Educator Pro", colour: "bg-clay-100 text-clay-700" },
  centre_starter: { label: "Centre Starter", colour: "bg-sage-100 text-sage-700" },
  centre_growth: { label: "Centre Growth", colour: "bg-sage-100 text-sage-700" },
};

export default function DashboardNav({
  userName,
  isAdminUser,
  plan,
  storiesUsed,
  monthlyStoryLimitOverride,
  appliedAccessCode,
  subscriptionStatus,
}: {
  userName: string;
  isAdminUser: boolean;
  plan: string;
  storiesUsed: number;
  monthlyStoryLimitOverride: number | null;
  appliedAccessCode: string | null;
  subscriptionStatus: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!mobileOpen || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); router.refresh(); };
  const goToBilling = () => {
    setMobileOpen(false);
    router.push("/billing");
  };

  const limit = getMonthlyStoryLimit({
    plan,
    monthly_story_limit_override: monthlyStoryLimitOverride,
    applied_access_code: appliedAccessCode,
  });
  const billingProfile = { plan, subscription_status: subscriptionStatus };
  const billingBlocked = isBillingBlocked(billingProfile);
  const billingPastDue = isBillingPastDue(billingProfile);
  const allowanceLabel = getStoryAllowanceLabel({
    plan,
    monthly_story_limit_override: monthlyStoryLimitOverride,
    applied_access_code: appliedAccessCode,
  });
  const usageLabel = limit === null
    ? "Unlimited stories"
    : appliedAccessCode
      ? `${storiesUsed} of ${limit} complimentary stories used this month.`
      : `${storiesUsed} of ${limit} free stories used this month.`;
  const planKey = normalizePlanKey(plan);
  const planInfo = PLAN_LABEL[planKey] ?? PLAN_LABEL.free;
  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const navItems: NavItem[] = isAdminUser
    ? [...NAV, { href: "/api/admin/session", activePath: "/admin", icon: ShieldAlert, label: "Admin" }]
    : NAV;

  const Content = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain pb-6 md:pb-0">
      <div className="h-16 flex items-center justify-between gap-3 px-5 border-b border-clay-100 flex-shrink-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <AnimatedLogo size={32} />
          <div className="min-w-0">
            <span className="font-display text-lg font-bold text-ink-900">StoryLoop</span>
            <p className="text-[9px] text-clay-600 -mt-1 font-mono tracking-widest">BY ARIA CARE</p>
          </div>
        </div>
        {mobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-clay-200 bg-white/80 text-ink-600 shadow-soft"
            aria-label="Close dashboard navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-shrink-0 px-3 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label, highlight, activePath, feature }) => {
          const locked = Boolean(feature) && !hasFeatureAccess(planKey, feature as FeatureKey);
          const resolvedActivePath = activePath ?? href;
          const active = !locked && (resolvedActivePath === "/dashboard"
            ? pathname === resolvedActivePath
            : pathname.startsWith(resolvedActivePath));

          if (locked) {
            const tier = SHORT_PLAN_LABEL[requiredPlanForFeature(feature as FeatureKey)];
            return (
              <Link
                key={href}
                href={`/billing?feature=${feature}`}
                onClick={() => setMobileOpen(false)}
                title={`${label} unlocks with ${tier}`}
                className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500 transition-all hover:bg-clay-50 hover:text-clay-800"
              >
                <Icon className="h-4 w-4 flex-shrink-0 opacity-70 group-hover:opacity-100" />
                <span className="flex-1 truncate">{label}</span>
                <span className="flex items-center gap-1 rounded-full bg-clay-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-clay-700 group-hover:bg-clay-700 group-hover:text-paper">
                  <Lock className="h-2.5 w-2.5" />
                  {tier}
                </span>
              </Link>
            );
          }

          return (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active ? "bg-clay-700 text-paper shadow-warm"
                : highlight ? "bg-cream-100 border border-clay-200 text-clay-700 hover:bg-cream-200"
                : "text-ink-600 hover:text-ink-900 hover:bg-cream-50"
              }`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 px-3 pb-3">
        {/* Usage indicator */}
        {limit !== null && (
          <div className="bg-cream-50 border border-clay-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-clay-700 uppercase tracking-wider">Monthly allowance</span>
              <span className="text-xs font-bold text-ink-900">{storiesUsed}/{limit}</span>
            </div>
            <div className="w-full h-1.5 bg-clay-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-clay-500 rounded-full transition-all" style={{ width: `${Math.min((storiesUsed/limit)*100,100)}%` }} />
            </div>
            <p className="text-[11px] text-ink-600 mb-1">{usageLabel}</p>
            <p className="text-[10px] text-clay-600 mb-2">{allowanceLabel}</p>
            <button
              type="button"
              onClick={goToBilling}
              className="w-full rounded-lg bg-white border border-clay-200 px-3 py-2 text-left text-xs font-semibold text-clay-700 hover:bg-cream-100 hover:text-clay-900 transition-all"
            >
              Upgrade for unlimited stories →
            </button>
          </div>
        )}

        {(billingBlocked || billingPastDue) && (
          <div className={`rounded-xl border p-3 ${billingBlocked ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-4 h-4 mt-0.5 ${billingBlocked ? "text-red-600" : "text-amber-600"}`} />
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${billingBlocked ? "text-red-700" : "text-amber-700"}`}>
                  {billingStatusLabel(subscriptionStatus)}
                </p>
                <p className="text-[11px] text-ink-600 mt-1">
                  {billingBlocked
                    ? "Payment is needed before creating more stories."
                    : "Stripe is retrying payment. Access stays on during this grace period."}
                </p>
                <button
                  type="button"
                  onClick={goToBilling}
                  className="mt-2 text-xs font-bold text-clay-700 hover:text-clay-900"
                >
                  {billingBlocked ? "Fix payment ->" : "Review billing ->"}
                </button>
              </div>
            </div>
          </div>
        )}

        <Link
          href="/support"
          onClick={() => setMobileOpen(false)}
          className="block rounded-xl border border-clay-200 bg-gradient-to-br from-white to-cream-50 p-3 shadow-soft hover:border-clay-300 transition-all"
        >
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-lg bg-clay-700 text-paper flex items-center justify-center flex-shrink-0">
              <Mail className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-clay-700 uppercase tracking-wider">Need help?</p>
              <p className="text-[11px] text-ink-600 mt-0.5">Support, bugs, billing, and feature requests.</p>
              <p className="text-[11px] font-bold text-ink-900 mt-1 break-all">ariacareapp@gmail.com</p>
            </div>
          </div>
        </Link>

        <div className="border-t border-clay-100 pt-3">
          <div className="flex items-center gap-2 px-1.5">
            <div className="w-8 h-8 rounded-full bg-clay-700 text-paper flex items-center justify-center text-xs font-bold flex-shrink-0">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-ink-800 truncate">{userName}</p>
              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full ${planInfo.colour} mt-0.5`}>{planInfo.label}</span>
              {appliedAccessCode && <p className="text-[10px] text-clay-700 mt-1">{appliedAccessCode.toUpperCase()} access</p>}
            </div>
            <button onClick={handleLogout} title="Sign out" className="text-ink-400 hover:text-ink-700 transition-colors p-1">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden md:flex w-60 bg-white border-r border-clay-100 flex-col h-full flex-shrink-0">
        <Content />
      </div>
      {!mobileOpen && (
        <button
          className="md:hidden fixed bottom-4 left-4 z-50 w-11 h-11 bg-white/75 border border-clay-200/80 rounded-full flex items-center justify-center shadow-soft backdrop-blur-md text-ink-700"
          onClick={() => setMobileOpen(true)}
          aria-label="Open dashboard navigation"
          aria-expanded={false}
        >
          <Menu className="w-4 h-4" />
        </button>
      )}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex overflow-hidden bg-black/30">
          <div
            className="h-dvh max-h-dvh w-[min(18.5rem,86vw)] overflow-y-auto overscroll-contain bg-white/95 border-r border-clay-100 shadow-xl backdrop-blur"
            onWheel={(event) => event.stopPropagation()}
          >
            <Content mobile />
          </div>
          <button
            type="button"
            className="min-w-0 flex-1 cursor-default"
            onClick={() => setMobileOpen(false)}
            aria-label="Close dashboard navigation"
          />
        </div>
      )}
    </>
  );
}
