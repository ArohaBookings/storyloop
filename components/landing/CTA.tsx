import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function CTA() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="card-warm p-14 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-warm-mesh pointer-events-none" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-clay-700 mx-auto mb-6 flex items-center justify-center shadow-warm">
              <Sparkles className="w-7 h-7 text-paper" />
            </div>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-900 mb-4">
              Get your evenings back.
            </h2>
            <p className="text-ink-600 text-lg mb-8 max-w-xl mx-auto">
              Stop writing learning stories at 10pm. Start your 3 free stories today — no credit card, no commitment.
            </p>
            <Link href="/signup" className="btn-primary text-base px-8 py-4 group">
              Start free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <p className="text-xs text-ink-500 mt-4">3 free stories · No credit card · Set up in 30 seconds</p>
          </div>
        </div>
      </div>
    </section>
  );
}
