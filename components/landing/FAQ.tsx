"use client";

import { LANDING_FAQS as FAQS } from "@/lib/landing-faqs";

export default function FAQ() {
  return (
    <section className="py-24">
      <div className="reading-shell max-w-4xl">
        <div className="text-center mb-12">
          <p className="section-title mb-3">Questions</p>
          <h2 className="font-display text-4xl font-bold text-ink-900">Everything educators ask.</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map(faq => (
            <details key={faq.q} className="card p-5 group cursor-pointer transition-all hover:shadow-warm">
              <summary className="font-semibold text-ink-900 text-sm list-none flex items-center justify-between gap-4">
                {faq.q}
                <span className="text-clay-500 text-xl flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="mt-3 text-sm text-ink-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
