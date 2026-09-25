import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Clock3, Globe2, Languages, Minus, Quote, ScanSearch, ShieldCheck } from "lucide-react";
import Capabilities from "@/components/landing/Capabilities";
import { GuideCta, GuideHero, GuidePage, RELATED, RelatedGuides } from "@/components/marketing/Guide";
import { FEATURE_CATALOGUE } from "@/lib/feature-catalogue";
import { EDUCATOR_ASSISTANT_MONTHLY, hasFeatureAccess, minimumPlanFor, PLAN_DEFINITIONS, PLAN_ORDER, type PlanKey } from "@/lib/plans";
import { ACCURACY_REPORT as R } from "@/lib/accuracy-report";
import { WALL_LANGUAGES } from "@/lib/wall-languages";

export const metadata: Metadata = {
  title: { absolute: "Every StoryLoop feature, and which plan it is on" },
  description:
    "Every StoryLoop feature for NZ and Australian educators and centres, the checks behind every draft, and a plan-by-plan table from Free to Centre Growth.",
  alternates: { canonical: "https://storyloop.space/features" },
  openGraph: { title: "StoryLoop features and plans", description: "Every feature, the tech behind every draft, and which plan includes what.", url: "https://storyloop.space/features", type: "website" },
};

const SHORT_NAME: Record<PlanKey, string> = {
  free: "Free",
  educator: "Educator",
  educator_pro: "Educator Pro",
  centre_starter: "Centre Starter",
  centre_growth: "Centre Growth",
};

const TRIAL: Record<PlanKey, string> = {
  free: "No card",
  educator: "7-day free trial",
  educator_pro: "7-day free trial",
  centre_starter: "30 days free, no card",
  centre_growth: "30 days free, no card",
};

// Rows that are not a single feature key, but matter most when choosing.
const BASICS: Array<{ label: string; values: Record<PlanKey, string> }> = [
  { label: "Learning stories each month", values: { free: "3", educator: "Unlimited", educator_pro: "Unlimited", centre_starter: "Unlimited", centre_growth: "Unlimited" } },
  { label: "Educators", values: { free: "1", educator: "1", educator_pro: "1", centre_starter: "Up to 10", centre_growth: "Up to 25" } },
  { label: "Children", values: { free: "Unlimited", educator: "Unlimited", educator_pro: "Unlimited", centre_starter: "Unlimited", centre_growth: "Unlimited" } },
  { label: "Quill writing help", values: { free: "–", educator: `${EDUCATOR_ASSISTANT_MONTHLY} a month`, educator_pro: "Unlimited", centre_starter: "Unlimited", centre_growth: "Unlimited" } },
];

function planBadge(key?: Parameters<typeof minimumPlanFor>[0]) {
  if (!key) return "Every plan";
  const plan = minimumPlanFor(key);
  return plan === "free" ? "Every plan" : `From ${SHORT_NAME[plan]}`;
}

export default function FeaturesPage() {
  const plans = PLAN_ORDER.map((key) => PLAN_DEFINITIONS.find((plan) => plan.key === key)!).filter(Boolean);
  const engine = [
    { icon: Clock3, value: `${Math.round(R.medianSeconds)}s`, label: "to draft a story", note: `Median across ${R.drafts} test drafts` },
    { icon: Quote, value: `${R.drafts - R.wordsInChildMouth}/${R.drafts}`, label: "kept every child's words exactly", note: "Every quote checked against the note, by rule" },
    { icon: ScanSearch, value: `${R.drafts - R.frameworkMixups}/${R.drafts}`, label: "used the right curriculum", note: "Te Whāriki in Aotearoa, EYLF V2.0 in Australia" },
    { icon: ShieldCheck, value: "Every draft", label: "privacy checked", note: "Clinical language, family details, identifiers" },
    { icon: Languages, value: String(WALL_LANGUAGES.length + 1), label: "languages for families", note: "English, te reo Māori, Samoan, Tongan and more" },
    { icon: Globe2, value: "Sydney", label: "where it is stored", note: "Never used to train AI" },
  ];

  return (
    <GuidePage>
      <GuideHero
        kicker="Features and plans"
        title={<>Everything StoryLoop does, <span className="italic text-clay-700">and which plan it is on.</span></>}
        answer={
          <p>
            At its heart, StoryLoop turns a quick note or voice memo into a checked learning story with Te Whāriki or EYLF
            V2.0 links. Around that are tools for the rest of the day: following each child&apos;s learning, sharing with
            families in their own language, and running a centre on one price with unlimited children.
          </p>
        }
        image="/images/scenes/classroom.jpg"
        imageAlt="An educator holds an iPad with a StoryLoop learning story draft while two toddlers, seen from behind, build a block tower"
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#plans" className="btn-primary">Compare plans</a>
          <Link href="/signup" className="btn-secondary">Start free</Link>
        </div>
      </GuideHero>

      {/* The engine: what runs on every draft. */}
      <section id="engine" className="bg-ink-900 py-16 text-paper md:py-20">
        <div className="wide-shell">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-300">The engine behind every draft</p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-balance md:text-4xl">
                Frontier AI, with rules it cannot talk its way around.
              </h2>
            </div>
            <p className="text-base leading-relaxed text-cream-100/85">
              The writer is a frontier AI model. Around it sit checks that are plain code, not another model&apos;s opinion:
              children&apos;s words must appear in your note, the curriculum must match your country, every expected section
              must be there. Every change is tested on the same {R.notes} notes before it ships, and{" "}
              <Link href="/accuracy" className="font-semibold text-cream-100 underline decoration-clay-400 underline-offset-4">the results are public</Link>.
            </p>
          </div>
          <div className="mt-10 grid gap-px overflow-hidden rounded-3xl border border-ink-700 bg-ink-700 sm:grid-cols-2 lg:grid-cols-3">
            {engine.map((item) => (
              <div key={item.label} className="bg-ink-900 p-6">
                <item.icon className="h-5 w-5 text-clay-300" strokeWidth={1.8} />
                <p className="mt-3 font-display text-4xl font-bold tabular-nums text-paper">{item.value}</p>
                <p className="mt-1 text-base font-semibold text-cream-100">{item.label}</p>
                <p className="mt-1 text-sm text-cream-100/60">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Capabilities />

      {/* Every feature, grouped. */}
      {FEATURE_CATALOGUE.map((group, index) => (
        <section key={group.id} id={group.id} className={`py-16 md:py-20 ${index % 2 ? "border-y border-clay-100 bg-white" : ""}`}>
          <div className="wide-shell grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
              <h2 className="font-display text-3xl font-bold leading-tight text-ink-900 text-balance md:text-4xl">{group.title}</h2>
              <p className="mt-3 text-lg leading-relaxed text-ink-600">{group.lead}</p>
              <div className="relative mt-6 aspect-[3/2] overflow-hidden rounded-3xl border border-clay-100">
                <Image src={group.image} alt={group.imageAlt} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
              </div>
            </div>
            <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
              {group.items.map((item) => (
                <li key={item.name} className="flex flex-col rounded-3xl border border-clay-100 bg-paper p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-bold leading-snug text-ink-900">{item.name}</h3>
                    <span className={`flex-none rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      planBadge(item.key) === "Every plan" ? "bg-sage-100 text-sage-800" : "bg-clay-100 text-clay-800"
                    }`}>
                      {planBadge(item.key)}
                    </span>
                  </div>
                  <p className="mt-2 text-base leading-relaxed text-ink-600">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      {/* The plan table, built from the same rules the app uses. */}
      <section id="plans" className="border-t border-clay-100 bg-cream-50/70 py-16 md:py-20">
        <div className="wide-shell">
          <h2 className="font-display text-3xl font-bold leading-tight text-ink-900 md:text-4xl">Which plan includes what</h2>
          <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-600">
            Built from the same rules the app uses to unlock each feature, so it is always exact. Prices are per month, in
            New Zealand or Australian dollars. Cancel any time.
          </p>
          <div className="mt-8 overflow-x-auto rounded-3xl border border-clay-200 bg-paper">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead>
                <tr className="align-bottom">
                  <th scope="col" className="sticky left-0 z-10 w-[26%] bg-paper px-5 py-5 text-xs font-bold uppercase tracking-wider text-ink-500">Plan</th>
                  {plans.map((plan) => (
                    <th key={plan.key} scope="col" className={`px-4 py-5 ${plan.key === "educator" ? "bg-clay-50" : ""}`}>
                      <span className="block font-display text-lg font-bold text-ink-900">{plan.name}</span>
                      <span className="mt-1 block font-display text-2xl font-bold tabular-nums text-ink-900">
                        {plan.price.NZD === 0 ? "Free" : `NZ$${plan.price.NZD}`}
                      </span>
                      <span className="block text-xs text-ink-500">{plan.price.AUD === 0 ? "forever" : `or A$${plan.price.AUD}`}</span>
                      <span className="mt-2 block text-xs font-semibold text-sage-700">{TRIAL[plan.key]}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BASICS.map((row) => (
                  <tr key={row.label} className="border-t border-clay-100">
                    <th scope="row" className="sticky left-0 z-10 bg-paper px-5 py-3 font-semibold text-ink-900">{row.label}</th>
                    {plans.map((plan) => (
                      <td key={plan.key} className={`px-4 py-3 font-semibold tabular-nums text-ink-800 ${plan.key === "educator" ? "bg-clay-50" : ""}`}>{row.values[plan.key]}</td>
                    ))}
                  </tr>
                ))}
                {FEATURE_CATALOGUE.map((group) => (
                  <FeatureRows key={group.id} title={group.title} items={group.items} plans={plans.map((plan) => plan.key)} />
                ))}
                <tr className="border-t border-clay-200">
                  <th scope="row" className="sticky left-0 z-10 bg-paper px-5 py-5" />
                  {plans.map((plan) => (
                    <td key={plan.key} className={`px-4 py-5 ${plan.key === "educator" ? "bg-clay-50" : ""}`}>
                      <Link
                        href={plan.key === "free" ? "/signup" : `/signup?plan=${plan.key}`}
                        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${plan.key === "educator" ? "bg-clay-700 text-paper hover:bg-clay-800" : "border border-clay-300 text-ink-800 hover:border-clay-500"}`}
                      >
                        {plan.key === "free" ? "Start free" : plan.key.startsWith("centre") ? "Start centre trial" : "Start trial"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-ink-500">
            &ldquo;One moment, many children&rdquo; is on every plan and uses one story per child. Individual plans are for one
            educator; centre plans cover the whole team with no per-child fee.
          </p>
        </div>
      </section>

      <GuideCta />
      <RelatedGuides links={[RELATED.educators, RELATED.centres, RELATED.aiTools, RELATED.accuracy, RELATED.safety, RELATED.vsStorypark]} />
    </GuidePage>
  );
}

function FeatureRows({ title, items, plans }: { title: string; items: (typeof FEATURE_CATALOGUE)[number]["items"]; plans: PlanKey[] }) {
  return (
    <>
      <tr className="border-t border-clay-200 bg-cream-50">
        <th scope="rowgroup" colSpan={plans.length + 1} className="sticky left-0 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-clay-700">{title}</th>
      </tr>
      {items.map((item) => (
        <tr key={item.name} className="border-t border-clay-100">
          <th scope="row" className="sticky left-0 z-10 bg-paper px-5 py-3 font-normal text-ink-800">{item.name}</th>
          {plans.map((plan) => {
            const included = item.key ? hasFeatureAccess(plan, item.key) : true;
            return (
              <td key={plan} className={`px-4 py-3 ${plan === "educator" ? "bg-clay-50" : ""}`}>
                {included ? (
                  <Check className="h-5 w-5 text-sage-700" strokeWidth={2.4} aria-label="Included" />
                ) : (
                  <Minus className="h-4 w-4 text-ink-300" aria-label="Not included" />
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
