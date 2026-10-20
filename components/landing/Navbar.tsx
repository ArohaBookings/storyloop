"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import AnimatedLogo from "@/components/brand/AnimatedLogo";
import { hasSignedInHint } from "@/lib/auth/signed-in-hint";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // Someone who has signed in on this device gets "Open StoryLoop", not "Start free".
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(hasSignedInHint()), []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-paper/92 backdrop-blur-xl border-b border-clay-100" : "bg-transparent"}`}>
      <div className="edge-shell h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <AnimatedLogo size={32} />
          <div>
            <span className="font-display text-xl font-bold text-ink-800 tracking-tight">StoryLoop</span>
            <p className="text-[9px] text-clay-600 -mt-1 font-mono tracking-widest">BY ARIA CARE</p>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {[["Features", "/features"], ["Examples", "/examples"], ["For centres", "/for-centres"], ["Guides", "/blog"], ["Pricing", "/pricing"], ["About", "/about"]].map(([label, href]) => (
            <Link key={label} href={href} className="py-2 text-sm text-ink-600 hover:text-ink-900 transition-colors font-medium">{label}</Link>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-2">
          {signedIn ? (
            <Link href="/dashboard" className="btn-primary text-sm" data-track="nav_open_app">Open StoryLoop</Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-ink-600 hover:text-ink-900 px-4 py-2 transition-colors">Sign in</Link>
              <Link href="/signup" className="btn-primary text-sm">Start free</Link>
            </>
          )}
        </div>

        {/* On a phone "Sign in" sits in the header, not only in the menu (19 Oct
            2026): paying educators landed on the homepage, tapped "Start free",
            hit the signup form, went back and dug through the menu to sign in. */}
        <div className="flex items-center gap-1 lg:hidden">
          <Link
            href={signedIn ? "/dashboard" : "/login"}
            className="px-3 py-2 text-sm font-semibold text-ink-700 hover:text-ink-900"
            data-track={signedIn ? "nav_open_app_mobile" : "nav_sign_in_mobile"}
          >
            {signedIn ? "Open StoryLoop" : "Sign in"}
          </Link>
          <button
            className="p-2 text-ink-700"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden bg-paper border-t border-clay-100 px-4 py-4 space-y-2">
          {[["Features", "/features"], ["Examples", "/examples"], ["For centres", "/for-centres"], ["Guides", "/blog"], ["Resources", "/resources"], ["Pricing", "/pricing"], ["About", "/about"], ["FAQ", "/faq"]].map(([label, href]) => (
            <Link key={label} href={href} className="block text-sm text-ink-600 py-2" onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <div className="pt-3 border-t border-clay-100 flex flex-col gap-2">
            {signedIn ? (
              <Link href="/dashboard" className="btn-primary justify-center">Open StoryLoop</Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-center text-ink-600 py-2">Sign in</Link>
                <Link href="/signup" className="btn-primary justify-center">Start free</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
