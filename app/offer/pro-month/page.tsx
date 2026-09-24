import type { Metadata } from "next";
import Link from "next/link";
import SignInLinkForm from "@/components/auth/SignInLinkForm";
import { BellRing, CalendarCheck, Check, CreditCard, Mic, QrCode, RotateCcw, Sparkles, Users } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageTracker from "@/components/analytics/PageTracker";
import ProMonthClaim from "@/components/offer/ProMonthClaim";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  OFFER_REASON_COPY,
  PRO_MONTH_OFFER_ID,
  PRO_MONTH_TRIAL_DAYS,
  proMonthEligibility,
  proMonthFirstChargeDate,
  proMonthPrices,
  longDay,
} from "@/lib/offers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A month of StoryLoop Pro, on us",
  description: "Every StoryLoop feature and unlimited learning stories, free for 30 days for existing StoryLoop educators.",
  robots: { index: false, follow: false },
};

const day = longDay;

const INCLUDED = [
  { icon: Sparkles, title: "Unlimited learning stories", body: "No monthly cap. Write every story you meant to write, from a few lines or a voice note." },
  { icon: Mic, title: "Children in their own words", body: "One big button a child presses to talk about their work. You write down exactly what they said." },
  { icon: QrCode, title: "Wall cards families can scan", body: "A small code beside a display. Families read the learning behind it at pickup, in their own language." },
  { icon: Users, title: "Child continuity and family replies", body: "Each child's learning carried from story to story, and family replies turned into context for the next one." },
  { icon: RotateCcw, title: "Quill, unlimited", body: "Highlight any sentence and ask for it warmer, shorter or more specific. It only changes what you choose." },
  { icon: CalendarCheck, title: "Term reports without scores", body: "A printable summary of each child's term, built only from what you recorded." },
];

export default async function ProMonthOfferPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const prices = proMonthPrices();
  const firstCharge = day(proMonthFirstChargeDate());

  let state: "signed_out" | "eligible" | "ineligible" = "signed_out";
  let reason: keyof typeof OFFER_REASON_COPY | null = null;
  let expiresOn: string | null = null;

  if (user) {
    const admin = createAdminSupabase();
    const [{ data: profile }, { data: grant }, { data: memberships }] = await Promise.all([
      admin.from("profiles").select("plan, subscription_status, stripe_subscription_id, is_internal, is_active").eq("id", user.id).maybeSingle(),
      admin.from("offer_grants").select("id, expires_at, redeemed_at, clicked_at").eq("user_id", user.id).eq("offer_id", PRO_MONTH_OFFER_ID).maybeSingle(),
      admin.from("centre_members").select("centre_id").eq("user_id", user.id).eq("status", "active").limit(1),
    ]);
    const eligibility = proMonthEligibility({ profile, grant, isCentreMember: Boolean(memberships?.length) });
    state = eligibility.eligible ? "eligible" : "ineligible";
    reason = eligibility.eligible ? null : eligibility.reason;
    if (grant?.expires_at) expiresOn = day(new Date(grant.expires_at));
    // The first visit from the email is the "clicked" step of the funnel.
    if (grant && !grant.clicked_at) {
      await admin.from("offer_grants").update({ clicked_at: new Date().toISOString() }).eq("id", grant.id);
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <PageTracker />
      <Navbar />
      <main>
        <section id="offer" className="paper-texture relative overflow-hidden pb-14 pt-28 md:pb-20 md:pt-32">
          <div className="bg-warm-mesh pointer-events-none absolute inset-0" />
          <div className="wide-shell relative z-10 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <p className="section-title mb-3">For StoryLoop educators</p>
              <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-900 text-balance md:text-6xl">
                A month of StoryLoop Pro, <span className="italic text-clay-700">on us.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-700">
                Unlimited stories and every feature for {PRO_MONTH_TRIAL_DAYS} days, free. We rebuilt a lot of StoryLoop this
                year, and the best way to judge it is on your own notes, with no cap.
              </p>
              <ul className="mt-6 grid max-w-xl gap-2.5 text-base text-ink-800">
                {[
                  `Free until ${firstCharge}. Nothing is charged today.`,
                  `Then NZ$${prices.pro.NZD} or A$${prices.pro.AUD} a month, unless you cancel or switch to Educator (NZ$${prices.educator.NZD} or A$${prices.educator.AUD}).`,
                  "We email you 3 days before the first charge.",
                  "Cancel in two clicks in Billing. Your stories stay yours either way.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <Check className="mt-1 h-4 w-4 flex-none text-sage-700" strokeWidth={2.25} />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6 md:p-8" data-section="claim">
              {state === "eligible" && (
                <>
                  <p className="font-display text-2xl font-bold text-ink-900">Your free month is ready.</p>
                  <p className="mt-2 text-base leading-relaxed text-ink-600">
                    Stripe will ask for a card so Pro carries on without a gap if you like it. You are not charged until{" "}
                    {firstCharge}.{expiresOn ? ` Claim by ${expiresOn}.` : ""}
                  </p>
                  <ProMonthClaim prices={prices.pro} firstCharge={firstCharge} />
                </>
              )}
              {state === "signed_out" && (
                <>
                  <p className="font-display text-2xl font-bold text-ink-900">Sign in to claim it.</p>
                  <p className="mt-2 text-base leading-relaxed text-ink-600">
                    The offer is attached to the StoryLoop account we emailed. Sign in and you will come straight back here.
                  </p>
                  <Link href="/login?redirect=/offer/pro-month" className="btn-primary mt-6 w-full justify-center py-3.5 text-base" data-track="offer_signin">
                    Sign in to claim my month
                  </Link>
                  <div className="mt-5 border-t border-clay-100 pt-5">
                    <p className="mb-3 text-sm font-semibold text-ink-800">Forgotten your password? We will email you a link that signs you straight in.</p>
                    <SignInLinkForm redirect="/offer/pro-month" compact />
                  </div>
                  <p className="mt-3 text-center text-sm text-ink-500">
                    New to StoryLoop? <Link href="/signup" className="font-semibold text-clay-700 underline">Start free</Link>, and every paid plan has a 7-day free trial.
                  </p>
                </>
              )}
              {state === "ineligible" && reason && (
                <>
                  <p className="font-display text-2xl font-bold text-ink-900">
                    {reason === "already_paid" || reason === "centre_member" || reason === "redeemed" ? "You're all set." : "This one isn't available here."}
                  </p>
                  <p className="mt-2 text-base leading-relaxed text-ink-600" data-testid="offer-reason">{OFFER_REASON_COPY[reason]}</p>
                  <Link href="/billing" className="btn-primary mt-6 w-full justify-center py-3.5 text-base">Go to Billing</Link>
                </>
              )}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-clay-100 bg-white py-14 md:py-16">
          <div className="wide-shell">
            <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">How the month works</h2>
            <ol className="mt-8 grid gap-5 md:grid-cols-4">
              {[
                { icon: Sparkles, when: "Today", what: "Pro switches on. Card saved with Stripe, nothing charged." },
                { icon: BellRing, when: "3 days before", what: "We email you the date and the amount, with a link to cancel or switch." },
                { icon: CreditCard, when: firstCharge, what: `First charge: NZ$${prices.pro.NZD} or A$${prices.pro.AUD}, only if you keep Pro.` },
                { icon: RotateCcw, when: "Any time", what: "Cancel or step down to Educator in Billing. Your stories are never deleted." },
              ].map((step) => (
                <li key={step.when} className="rounded-2xl border border-clay-100 bg-cream-50 p-5">
                  <step.icon className="h-5 w-5 text-clay-700" strokeWidth={1.75} />
                  <p className="mt-3 text-sm font-bold uppercase tracking-wider text-clay-700">{step.when}</p>
                  <p className="mt-1.5 text-base leading-relaxed text-ink-700">{step.what}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="included" className="py-14 md:py-20">
          <div className="wide-shell">
            <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">Everything that is in Pro</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {INCLUDED.map((item) => (
                <article key={item.title} className="rounded-3xl border border-clay-100 bg-paper p-6">
                  <item.icon className="h-6 w-6 text-clay-700" strokeWidth={1.75} />
                  <h3 className="mt-4 font-display text-xl font-bold text-ink-900">{item.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-ink-600">{item.body}</p>
                </article>
              ))}
            </div>
            <p className="mt-8 max-w-2xl text-sm leading-relaxed text-ink-500">
              One free month per educator, for accounts that were emailed this offer. It cannot be combined with another
              discount. Stories and child profiles are stored in Sydney and are never used to train AI. Questions: write to{" "}
              <a href="mailto:ariacareapp@gmail.com" className="font-semibold text-clay-700 underline">ariacareapp@gmail.com</a>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
