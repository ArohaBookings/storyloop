"use client";

const FAQS = [
  { q: "Is StoryLoop NQF and EYLF compliant?", a: "Yes. Every story is structured to align with the EYLF (Early Years Learning Framework) and reference appropriate learning outcomes. Our templates were reviewed by experienced early childhood educators and centre directors to ensure they meet NQF documentation standards." },
  { q: "Does this replace my own professional judgement?", a: "No, and it shouldn't. StoryLoop drafts the story from your observations. You review, edit, and sign off — that professional oversight is essential. Think of it as removing the blank-page problem, not your voice." },
  { q: "What about child privacy? Is my data safe?", a: "Absolutely critical to us. Your observations are never used to train AI models. All data is stored securely in Australian data centres. You can delete any child profile or story at any time. We are fully compliant with Australian Privacy Principles." },
  { q: "Can I use it offline?", a: "Not yet — StoryLoop runs in your browser. Voice recording and story generation need an internet connection. We're working on a mobile app that will support offline mode later in 2026." },
  { q: "Do you support Te Whāriki for New Zealand?", a: "Yes. When you set your centre location to New Zealand, stories align with Te Whāriki learning outcomes and principles rather than EYLF." },
  { q: "Can my whole team use one account?", a: "The Centre plan includes up to 10 educator accounts under one centre. Each educator has their own login but you share child profiles and branding." },
  { q: "What happens if I cancel?", a: "You keep access until the end of your billing period. After that, you can still sign in and export your existing stories for 90 days, then your data is deleted." },
  { q: "Is there a discount for NDIS / not-for-profit centres?", a: "Yes. Email hello@storyloop.app with your ACNC registration and we'll offer a 30% discount on the Centre plan." },
];

export default function FAQ() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
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
