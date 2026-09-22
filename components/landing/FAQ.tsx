import Link from "next/link";
import { LANDING_FAQS as FAQS } from "@/lib/landing-faqs";

export default function FAQ() {
  return (
    <section id="faq" className="py-20 md:py-24">
      <div className="reading-shell max-w-3xl">
        <h2 className="mb-10 text-center font-display text-3xl font-bold leading-tight text-ink-900 md:text-4xl">
          Questions educators ask.
        </h2>
        <div className="divide-y divide-clay-100 border-y border-clay-100">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group">
              <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-semibold text-ink-900 hover:text-clay-800">
                {faq.q}
                <span aria-hidden="true" className="flex-none text-2xl leading-none text-clay-600 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="pb-5 text-base leading-relaxed text-ink-600">{faq.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-center text-base text-ink-600">
          More on privacy, curriculum and centres in the{" "}
          <Link href="/faq" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900">
            full FAQ
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
