"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Sparkles, History, CreditCard, LogOut, Menu, X, BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV = [
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

export default function DashboardNav({ userEmail, userName, plan, storiesUsed }: {
  userEmail: string; userName: string; plan: string; storiesUsed: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); router.refresh(); };

  const limit = plan === "free" ? 3 : 99999;
  const planInfo = PLAN_LABEL[plan] ?? PLAN_LABEL.free;
  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

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
        {NAV.map(({ href, icon: Icon, label, highlight }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
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
      {plan === "free" && (
        <div className="px-3 pb-3">
          <div className="bg-cream-50 border border-clay-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-clay-700 uppercase tracking-wider">Free stories</span>
              <span className="text-xs font-bold text-ink-900">{storiesUsed}/{limit}</span>
            </div>
            <div className="w-full h-1.5 bg-clay-100 rounded-full overflow-hidden mb-2">
              <div className="h-full bg-clay-500 rounded-full transition-all" style={{ width: `${Math.min((storiesUsed/limit)*100,100)}%` }} />
            </div>
            <Link href="/billing" className="text-xs font-semibold text-clay-700 hover:text-clay-900">Upgrade for unlimited →</Link>
          </div>
        </div>
      )}

      <div className="border-t border-clay-100 p-3">
        <div className="flex items-center gap-2 px-1.5">
          <div className="w-8 h-8 rounded-full bg-clay-700 text-paper flex items-center justify-center text-xs font-bold flex-shrink-0">{initials}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ink-800 truncate">{userName}</p>
            <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full ${planInfo.colour} mt-0.5`}>{planInfo.label}</span>
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
