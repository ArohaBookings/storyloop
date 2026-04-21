"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-paper/92 backdrop-blur-xl border-b border-clay-100" : "bg-transparent"}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/logo.svg" alt="StoryLoop" className="w-8 h-8" />
          <div>
            <span className="font-display text-xl font-bold text-ink-800 tracking-tight">StoryLoop</span>
            <p className="text-[9px] text-clay-600 -mt-1 font-mono tracking-widest">BY ARIA CARE</p>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {[["Features", "#features"], ["How It Works", "#how-it-works"], ["Examples", "#examples"], ["Pricing", "#pricing"]].map(([label, href]) => (
            <a key={label} href={href} className="text-sm text-ink-600 hover:text-ink-900 transition-colors font-medium">{label}</a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <Link href="/login" className="text-sm font-medium text-ink-600 hover:text-ink-900 px-4 py-2 transition-colors">Sign in</Link>
          <Link href="/signup" className="btn-primary text-sm">Start free</Link>
        </div>

        <button className="md:hidden text-ink-700" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-paper border-t border-clay-100 px-6 py-4 space-y-2">
          {[["Features", "#features"], ["How It Works", "#how-it-works"], ["Examples", "#examples"], ["Pricing", "#pricing"]].map(([label, href]) => (
            <a key={label} href={href} className="block text-sm text-ink-600 py-2" onClick={() => setOpen(false)}>{label}</a>
          ))}
          <div className="pt-3 border-t border-clay-100 flex flex-col gap-2">
            <Link href="/login" className="text-sm text-center text-ink-600 py-2">Sign in</Link>
            <Link href="/signup" className="btn-primary justify-center">Start free</Link>
          </div>
        </div>
      )}
    </nav>
  );
}
