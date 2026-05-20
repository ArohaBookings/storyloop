"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Sparkles, History, CreditCard, LogOut, Menu, ShieldAlert, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMonthlyStoryLimit, getStoryAllowanceLabel } from "@/lib/story-limits";

const ADMIN_EMAIL = "leoanthonybons@gmail.com";

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  highlight?: boolean;
  activePath?: string;
};

const NAV: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/generate", icon: Sparkles, label: "New story", highlight: true },
  { href: "/history", icon: History, label: "Story history" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
];

const PLAN_LABEL: Record<string, { label: string; colour: string }> = {
  free: { label: "Free", colour: "bg-ink-100 text-ink-600" },
  educator: { label: "Educator", colour: "bg-clay-100 text-clay-700" },
  centre: { label: "Centre", colour: "bg-sage-100 text-sage-700" },
};

export default function DashboardNav({
  userEmail,
  userName,
  plan,
  storiesUsed,
  monthlyStoryLimitOverride,
  appliedAccessCode,
}: {
  userEmail: string;
  userName: string;
  plan: string;
  storiesUsed: number;
  monthlyStoryLimitOverride: number | null;
  appliedAccessCode: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

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
  const allowanceLabel = getStoryAllowanceLabel({
    plan,
    monthly_story_limit_override: monthlyStoryLimitOverride,
    applied_access_code: appliedAccessCode,
  });
  const planInfo = PLAN_LABEL[plan] ?? PLAN_LABEL.free;
  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const isAdminUser = userEmail.toLowerCase() === ADMIN_EMAIL;
  const navItems: NavItem[] = isAdminUser
    ? [...NAV, { href: "/api/admin/session", activePath: "/admin", icon: ShieldAlert, label: "Admin" }]
    : NAV;

  const Content = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-clay-100 flex-shrink-0">
        <img src="/logo.svg" alt="StoryLoop" className="w-8 h-8" />
        <div>
          <span className="font-display text-lg font-bold text-ink-900">StoryLoop</span>
          <p className="text-[9px] text-clay-600 -mt-1 font-mono tracking-widest">BY ARIA CARE</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label, highlight, activePath }) => {
          const resolvedActivePath = activePath ?? href;
          const active = resolvedActivePath === "/dashboard"
            ? pathname === resolvedActivePath
            : pathname.startsWith(resolvedActivePath);
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

      {/* Usage indicator */}
      {limit !== null && (
        <div className="px-3 pb-3">
          <div className="bg-cream-50 border border-clay-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-clay-700 uppercase tracking-wider">Monthly allowance</span>
              <span className="text-xs font-bold text-ink-900">{storiesUsed}/{limit}</span>
            </div>
            <div className="w-full h-1.5 bg-clay-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-clay-500 rounded-full transition-all" style={{ width: `${Math.min((storiesUsed/limit)*100,100)}%` }} />
            </div>
            <p className="text-[11px] text-ink-600 mb-2">{allowanceLabel}</p>
            <button
              type="button"
              onClick={goToBilling}
              className="w-full rounded-lg bg-white border border-clay-200 px-3 py-2 text-left text-xs font-semibold text-clay-700 hover:bg-cream-100 hover:text-clay-900 transition-all"
            >
              View plans →
            </button>
          </div>
        </div>
      )}

      <div className="border-t border-clay-100 p-3">
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
  );

  return (
    <>
      <div className="hidden md:flex w-60 bg-white border-r border-clay-100 flex-col h-full flex-shrink-0">
        <Content />
      </div>
      <button className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-white border border-clay-200 rounded-xl flex items-center justify-center shadow-soft"
        onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-64 bg-white border-r border-clay-100 h-full shadow-xl"><Content /></div>
          <div className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
