"use client";
import Link from "next/link";
import { ArrowRight, Sparkles, Check } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden paper-texture">
      <div className="absolute inset-0 bg-warm-mesh pointer-events-none" />

      {/* Decorative corner scribbles */}
      <svg className="absolute top-20 right-6 w-24 h-24 opacity-40 hidden md:block" viewBox="0 0 100 100" fill="none">
        <path d="M 10 50 Q 30 20, 50 50 T 90 50" stroke="#e8c155" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex justify-center mb-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-cream-100 border border-clay-200 rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-clay-500" />
            <span className="text-xs font-semibold text-clay-700 tracking-wide">Built for Australian & NZ early childhood educators</span>
          </div>
        </div>

        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-ink-900 leading-[1.02] tracking-tight text-center mb-6 animate-fade-up-1">
          Turn <span className="italic font-semibold text-clay-700">three bullet points</span>
          <br />
          into a <span className="scribble-underline">beautiful learning story</span>.
        </h1>

        <p className="text-center text-lg md:text-xl text-ink-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up-2">
          StoryLoop writes EYLF-aligned learning stories from a quick voice note or a few bullet points.
          Spend less time documenting. More time with the children.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14 animate-fade-up-3">
          <Link href="/signup" className="btn-primary text-base px-8 py-4 group">
            <Sparkles className="w-4 h-4" /> Start free — 3 stories free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <a href="#live-demo" className="btn-secondary text-base px-8 py-4">
            Try it free (no signup)
          </a>
        </div>

        {/* Trust bar */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-500 animate-fade-up-4">
          {["Free to try", "No credit card", "EYLF aligned", "Works on phone"].map(item => (
            <span key={item} className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-sage-500" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
