"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import {
  calculateDocumentationTime,
  EXAMPLE_INPUTS,
  INPUT_LIMITS,
  normalizeTimeInputs,
  type TimeInputs,
} from "@/lib/documentation-time";
import { track } from "@/lib/analytics/client";

type NumberKey = Exclude<keyof TimeInputs, "currency">;

const FIELDS: Array<{ key: NumberKey; label: string; step: number; hint?: string }> = [
  { key: "educators", label: "Educators who write documentation", step: 1 },
  { key: "children", label: "Children enrolled", step: 1 },
  { key: "storiesPerChildPerMonth", label: "Learning stories per child, per month", step: 0.5 },
  { key: "minutesPerStoryNow", label: "Minutes per story today", step: 1, hint: "From a blank page, including finding curriculum wording." },
  { key: "minutesPerStoryWithDraft", label: "Minutes per story with a first draft to edit", step: 1, hint: "Your estimate. Change it if you think it is higher." },
  { key: "hourlyCost", label: "Hourly cost of educator time", step: 1, hint: "Pay plus on-costs, or what non-contact time costs you." },
];

export default function DocumentationTimeCalculator() {
  // Raw text per field so people can clear a box while typing.
  const [raw, setRaw] = useState<Record<NumberKey, string>>(
    Object.fromEntries(Object.keys(INPUT_LIMITS).map((key) => [key, String(EXAMPLE_INPUTS[key as NumberKey])])) as Record<NumberKey, string>,
  );
  const [currency, setCurrency] = useState<TimeInputs["currency"]>("NZD");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    // Default the currency to where the visitor is, after mount (no hydration mismatch).
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (zone.startsWith("Australia/")) setCurrency("AUD");
  }, []);

  const inputs = useMemo(
    () => normalizeTimeInputs({ ...Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v === "" ? Number.NaN : Number(v)])), currency }),
    [raw, currency],
  );
  const result = useMemo(() => calculateDocumentationTime(inputs), [inputs]);
  const money = (n: number) => `${currency === "NZD" ? "NZ$" : "A$"}${Math.round(n).toLocaleString("en-NZ")}`;

  const update = (key: NumberKey, value: string) => {
    setRaw((current) => ({ ...current, [key]: value }));
    if (!touched) {
      setTouched(true);
      track("cta_click", { cta: "time_calculator_used" });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="card space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-ink-500">{touched ? "Your centre" : "Example centre, change any number"}</p>
          <div className="inline-flex rounded-xl border border-clay-200 bg-white p-1" role="group" aria-label="Currency">
            {(["NZD", "AUD"] as const).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setCurrency(code)}
                aria-pressed={currency === code}
                className={`rounded-lg px-3 py-1 text-xs font-semibold ${currency === code ? "bg-clay-700 text-paper" : "text-ink-600"}`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
        {FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={`time-${field.key}`} className="label">{field.label}</label>
            <input
              id={`time-${field.key}`}
              type="number"
              inputMode="decimal"
              min={INPUT_LIMITS[field.key].min}
              max={INPUT_LIMITS[field.key].max}
              step={field.step}
              value={raw[field.key]}
              onChange={(event) => update(field.key, event.target.value)}
              className="input w-full tabular-nums"
            />
            {field.hint && <p className="mt-1 text-xs text-ink-500">{field.hint}</p>}
          </div>
        ))}
      </div>

      <div className="space-y-4 lg:sticky lg:top-24">
        <div className="card p-5 sm:p-6" aria-live="polite">
          <p className="section-title mb-2 flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> Every month</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="font-display text-3xl font-bold text-ink-900 tabular-nums">{result.hoursNow}h</p>
              <p className="mt-1 text-xs text-ink-500">writing {result.storiesPerMonth} stories today</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-sage-700 tabular-nums">{result.hoursSaved}h</p>
              <p className="mt-1 text-xs text-ink-500">back, at your estimate</p>
            </div>
            <div>
              <p className="font-display text-3xl font-bold text-ink-900 tabular-nums">{money(result.valueSaved)}</p>
              <p className="mt-1 text-xs text-ink-500">of educator time</p>
            </div>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <p className="section-title mb-3">What it would cost</p>
          <ul className="space-y-2">
            {result.options.map((option) => {
              const best = option.plan === result.recommended.plan;
              return (
                <li
                  key={option.plan}
                  className={`rounded-2xl border px-4 py-3 ${best ? "border-clay-400 bg-cream-50" : "border-clay-100"} ${option.covers ? "" : "opacity-50"}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-ink-900">{option.label}</span>
                    <span className="text-sm font-bold text-ink-900 tabular-nums">{money(option.monthly)}/mo</span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {option.covers ? option.note : "Not enough seats for your team."}
                    {best ? " Cheapest option for your team." : ""}
                  </p>
                </li>
              );
            })}
          </ul>
          {inputs.educators > 25 && (
            <p className="mt-3 text-xs text-ink-600">
              More than 25 educators usually means more than one centre or site. Each can have its own centre plan, or email
              us and we will work out what fits.
            </p>
          )}
          <p className="mt-4 text-sm leading-relaxed text-ink-700">
            {result.hoursSaved > 0
              ? result.netMonthly > 0
                ? `${result.recommended.label.split(" (")[0]} pays for itself once it saves ${result.breakEvenHours} hours a month. On your numbers it saves ${result.hoursSaved}.`
                : `On your numbers it saves ${result.hoursSaved} hours, which is less than the ${result.breakEvenHours} hours it would take to pay for itself.`
              : "On these numbers a first draft would not save time, so it would not pay for itself."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/signup"
              onClick={() => track("cta_click", { cta: "time_calculator_signup", plan: result.recommended.plan })}
              className="btn-primary inline-flex text-sm"
            >
              Try it free with your own notes
            </Link>
            {result.recommended.plan.startsWith("centre_") && (
              <Link
                href="/for-centres"
                onClick={() => track("cta_click", { cta: "time_calculator_centres", plan: result.recommended.plan })}
                className="btn-secondary inline-flex text-sm"
              >
                What a centre plan includes
              </Link>
            )}
          </div>
          <p className="mt-2 text-xs text-ink-500">3 free stories a month, no card. Paid plans start with a 7-day free trial.</p>
        </div>

        <p className="text-xs leading-relaxed text-ink-500">
          This is arithmetic on the numbers you entered, not a promise. How much time a first draft saves depends on your
          team, and every draft still needs an educator to check and edit it. Nothing you type is stored or sent anywhere.
        </p>
      </div>
    </div>
  );
}
