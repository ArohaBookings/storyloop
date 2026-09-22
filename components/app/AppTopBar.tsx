"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, CreditCard, LifeBuoy, LogOut } from "lucide-react";
import NotificationBell from "@/components/app/NotificationBell";
import { createClient } from "@/lib/supabase/client";

/**
 * The bar across the top of the app on a wide screen: the bell and the account
 * menu, nothing else. "New story" already leads the sidebar. On a phone the
 * same bell sits in the phone bar inside DashboardNav, and the account lives in
 * the menu drawer.
 */
export default function AppTopBar({ userName, planLabel }: { userName: string; planLabel: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials =
    userName
      .split(/[\s@.]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SL";

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="relative z-30 hidden h-16 flex-shrink-0 items-center justify-end gap-2 border-b border-clay-100 bg-white/80 px-6 backdrop-blur md:flex">
      <NotificationBell />
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Account menu"
          className="flex h-11 items-center gap-2 rounded-full border border-transparent py-1 pl-1 pr-2.5 text-ink-700 transition-colors hover:bg-cream-100"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-700 text-sm font-bold text-paper">{initials}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>
        {menuOpen && (
          <div role="menu" className="absolute right-0 top-12 z-[80] w-64 overflow-hidden rounded-2xl border border-clay-200 bg-white shadow-warm">
            <div className="border-b border-clay-100 px-4 py-3.5">
              <p className="truncate text-sm font-semibold text-ink-900">{userName}</p>
              <p className="mt-0.5 text-sm text-ink-500">{planLabel} plan</p>
            </div>
            <div className="py-1.5">
              <Link role="menuitem" href="/billing" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-cream-50">
                <CreditCard className="h-4 w-4 text-ink-500" /> Billing and plan
              </Link>
              <Link role="menuitem" href="/support" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink-700 hover:bg-cream-50">
                <LifeBuoy className="h-4 w-4 text-ink-500" /> Help and support
              </Link>
              <button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-cream-50">
                <LogOut className="h-4 w-4 text-ink-500" /> Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
