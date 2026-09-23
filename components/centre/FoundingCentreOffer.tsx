"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Mail } from "lucide-react";
import { getPlanByKey } from "@/lib/plans";

const STARTER = getPlanByKey("centre_starter");
const NZD = STARTER.price.NZD;
const AUD = STARTER.price.AUD;
const SEATS = STARTER.seats ?? 10;

type Offer = {
  trialDays: number;
  founding: { totalSpots: number; spotsLeft: number | null; discountPercent: number; discountMonths: number };
};

// The offer is fixed; only the spot count is live. The block renders the full
// offer immediately and adds the count when Stripe has answered, so the page is
// never empty while it loads and never shows a number it has not been given.
const STATIC: Offer = { trialDays: 30, founding: { totalSpots: 10, spotsLeft: null, discountPercent: 50, discountMonths: 3 } };

/**
 * The founding-centre offer, for the pages a director reads.
 *
 * Sales, done honestly: a concrete price (not "up to 50% off"), real scarcity
 * (the count is Stripe's own), risk reversal stated as a mechanism (no card, so
 * doing nothing costs nothing), and what we ask in return said out loud. It
 * never implies the review has to be a good one.
 */
export default function FoundingCentreOffer({ id = "founding" }: { id?: string }) {
  const [offer, setOffer] = useState<Offer>(STATIC);

  useEffect(() => {
    let active = true;
    fetch("/api/centre-offer")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.founding) setOffer(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const { spotsLeft, totalSpots, discountPercent, discountMonths } = offer.founding;
  const soldOut = spotsLeft === 0;
  const half = (price: number) => (price * (100 - discountPercent)) / 100;
  const money = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2));

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="border-y border-clay-200 bg-cream-50 py-14 md:py-16">
      <div className="wide-shell grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          {!soldOut && typeof spotsLeft === "number" && (
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-clay-200 bg-paper px-3 py-1 text-sm font-semibold text-clay-800">
              <span className="h-2 w-2 rounded-full bg-clay-600" aria-hidden="true" />
              {spotsLeft} of {totalSpots} founding spots left
            </p>
          )}
          <h2 id={`${id}-title`} className="font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">
            {soldOut ? "Every centre starts with a free month." : "Founding centres: a free month, then half price."}
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-700">
            {soldOut
              ? `All ${totalSpots} founding spots have gone. Every centre still gets ${offer.trialDays} days free, with no card needed.`
              : `The first ${totalSpots} centres get ${offer.trialDays} days free with no card, then ${discountPercent}% off their first ${discountMonths} months. In return we ask for honest feedback and a review, good or bad.`}
          </p>
          <ul className="mt-6 grid gap-3 text-base text-ink-800 sm:grid-cols-2">
            {[
              `${offer.trialDays} days free, no card needed`,
              `Up to ${SEATS} educators, unlimited children`,
              "Do nothing and nothing is charged",
              "Educators' drafts stay private unless they share",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <Check className="mt-1 h-4 w-4 flex-none text-sage-700" strokeWidth={2.25} />
                {line}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup?plan=centre_starter" className="btn-primary group justify-center px-7 py-3.5 text-base">
              {soldOut ? "Start your centre's free month" : "Claim a founding spot"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="mailto:ariacareapp@gmail.com?subject=StoryLoop%20for%20our%20centre"
              className="btn-secondary justify-center px-6 py-3.5 text-base"
            >
              <Mail className="h-4 w-4" />
              Ask Leo a question
            </a>
          </div>
        </div>

        {/* The arithmetic a director will do anyway, done for them. */}
        <div className="rounded-3xl border border-clay-200 bg-paper p-6 shadow-soft md:p-7">
          <p className="text-sm font-semibold text-ink-500">Centre Starter, {SEATS} educators, unlimited children</p>
          <dl className="mt-4 divide-y divide-clay-100">
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-base text-ink-700">First {offer.trialDays} days</dt>
              <dd className="font-display text-2xl font-bold text-ink-900">Free</dd>
            </div>
            {!soldOut && (
              <div className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-base text-ink-700">Next {discountMonths} months</dt>
                <dd className="text-right">
                  <span className="font-display text-2xl font-bold tabular-nums text-ink-900">NZ${money(half(NZD))}</span>
                  <span className="block text-sm text-ink-500">or A${money(half(AUD))} a month</span>
                </dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-base text-ink-700">{soldOut ? "Then" : "After that"}</dt>
              <dd className="text-right">
                <span className="font-display text-2xl font-bold tabular-nums text-ink-900">NZ${NZD}</span>
                <span className="block text-sm text-ink-500">or A${AUD} a month</span>
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-ink-600">
            About NZ${money((soldOut ? NZD : half(NZD)) / SEATS)} per educator a month{soldOut ? "" : " while founding"}, and it does not move when your roll does.
            No per-child fee, no contract.
          </p>
        </div>
      </div>
    </section>
  );
}
