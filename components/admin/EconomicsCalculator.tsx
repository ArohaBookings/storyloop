"use client";
import { useMemo, useState } from "react";
import {
  DEFAULT_COSTS_USD,
  breakEvenStories,
  calibrateFromInvoice,
  computeEconomics,
  customerContribution,
  projectAtScale,
  type CallCounts,
  type UserUsage,
} from "@/lib/economics";
import { getPlanByKey } from "@/lib/plans";

const GOAL_MRR_NZD = 10000;

const nzd = (value: number | null | undefined, digits = 0) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? "—"
    : `NZ$${value.toLocaleString("en-NZ", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

const pct = (value: number | null) => (value === null || !Number.isFinite(value) ? "—" : `${value.toFixed(1)}%`);

function NumberField({
  id, label, value, onChange, step = "0.01", hint,
}: { id: string; label: string; value: number; onChange: (v: number) => void; step?: string; hint?: string }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-300">{label}</span>
      <input
        id={id}
        type="number"
        step={step}
        min="0"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="w-full rounded-xl border border-ink-700 bg-ink-950 px-3 py-2 text-sm tabular-nums text-white"
      />
      {hint && <span className="mt-1 block text-[11px] text-ink-400">{hint}</span>}
    </label>
  );
}

function Stat({ label, value, sub, tone = "default" }: { label: string; value: string; sub?: string; tone?: "default" | "good" | "warn" }) {
  const ring = tone === "good" ? "border-sage-500/50" : tone === "warn" ? "border-amber-500/60" : "border-ink-700";
  return (
    <div className={`rounded-2xl border ${ring} bg-ink-900 p-4`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-300">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-300">{sub}</p>}
    </div>
  );
}

export default function EconomicsCalculator({
  mrrNzd, payingCustomers, counts, users,
}: { mrrNzd: number; payingCustomers: number; counts: CallCounts; users: UserUsage[] }) {
  const [invoiceUsd, setInvoiceUsd] = useState(0);
  const [nzdPerUsd, setNzdPerUsd] = useState(1.7);
  const [fixedMonthlyNzd, setFixedMonthlyNzd] = useState(60);
  const [feeRate, setFeeRate] = useState(3.5);
  const [storyUsd, setStoryUsd] = useState(DEFAULT_COSTS_USD.story);
  const [assistantUsd, setAssistantUsd] = useState(DEFAULT_COSTS_USD.assistant);

  // A real invoice beats any estimate. When one is entered, the per-call costs
  // are derived from it and the manual cost fields are ignored.
  const calibrated = useMemo(() => calibrateFromInvoice(invoiceUsd, counts), [invoiceUsd, counts]);
  const costsUsd = calibrated ?? { story: storyUsd, demo: storyUsd, assistant: assistantUsd };

  const input = {
    mrrNzd, payingCustomers, counts, costsUsd, nzdPerUsd,
    fixedMonthlyNzd, paymentFeeRate: feeRate / 100,
  };
  const e = computeEconomics(input);
  // The multiplier that reaches the goal is computed from today's real MRR, not
  // assumed, and always included as a row.
  const toGoal = mrrNzd > 0 ? GOAL_MRR_NZD / mrrNzd : null;
  const multipliers = [1, 5, 25, ...(toGoal && toGoal > 1 ? [Math.round(toGoal * 10) / 10] : [])]
    .filter((value, index, list) => list.indexOf(value) === index)
    .sort((a, b) => a - b);
  const scale = projectAtScale(input, multipliers);
  const contribution = customerContribution(users, costsUsd, nzdPerUsd);
  const unprofitable = contribution.filter((row) => row.unprofitable);
  const educatorPriceNzd = getPlanByKey("educator").price.NZD;
  const breakEvenEducator = breakEvenStories(educatorPriceNzd, costsUsd.story, nzdPerUsd);
  const maxProfit = Math.max(1, ...scale.map((s) => Math.abs(s.grossProfitNzd)));

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------- inputs */}
      <div className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField id="econ-invoice" label="Last month's OpenAI invoice (USD)" value={invoiceUsd} onChange={setInvoiceUsd}
            hint={calibrated ? "Calibrating from your invoice. Cost fields below are ignored." : "Leave at 0 to use the estimates below."} />
          <NumberField id="econ-fx" label="NZD per 1 USD" value={nzdPerUsd} onChange={setNzdPerUsd} hint="Check today's rate. OpenAI bills in USD." />
          <NumberField id="econ-fixed" label="Fixed costs / month (NZD)" value={fixedMonthlyNzd} onChange={setFixedMonthlyNzd} step="1"
            hint="Vercel, Supabase, Resend, domain." />
          <NumberField id="econ-fee" label="Stripe fees (%)" value={feeRate} onChange={setFeeRate} step="0.1" />
          <NumberField id="econ-story" label="Est. cost per story (USD)" value={storyUsd} onChange={setStoryUsd} step="0.001"
            hint={calibrated ? `Invoice says US$${calibrated.story.toFixed(4)}` : "An estimate, not a measurement."} />
          <NumberField id="econ-assistant" label="Est. cost per Quill edit (USD)" value={assistantUsd} onChange={setAssistantUsd} step="0.0005"
            hint={calibrated ? `Invoice says US$${calibrated.assistant.toFixed(4)}` : "Smaller model, one line."} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-ink-400">
          Counted over 30 days: <strong className="text-ink-200">{counts.stories}</strong> stories,{" "}
          <strong className="text-ink-200">{counts.demos}</strong> landing-page demos (these call the model but never save a story),{" "}
          <strong className="text-ink-200">{counts.assistantEdits}</strong> Quill edits. Regenerations and voice transcriptions
          are not logged anywhere, which is why a real invoice is more accurate than any estimate.
        </p>
      </div>

      {/* ---------------------------------------------------------- headline */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="MRR" value={nzd(mrrNzd)} sub={`${payingCustomers} paying customers`} />
        <Stat label="AI cost / month" value={nzd(e.apiCostNzd, 2)} sub={`${pct(e.apiShareOfRevenuePct)} of revenue`}
          tone={e.apiShareOfRevenuePct !== null && e.apiShareOfRevenuePct > 20 ? "warn" : "good"} />
        <Stat label="Gross profit" value={nzd(e.grossProfitNzd, 2)} sub={`after AI, Stripe and ${nzd(e.fixedNzd)} fixed`}
          tone={e.grossProfitNzd >= 0 ? "good" : "warn"} />
        <Stat label="Gross margin" value={pct(e.grossMarginPct)} sub={`${nzd(e.costPerStoryNzd, 3)} per story`}
          tone={e.grossMarginPct !== null && e.grossMarginPct < 60 ? "warn" : "good"} />
      </div>

      <div className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
        <p className="text-sm leading-relaxed text-ink-200">
          An Educator on {nzd(educatorPriceNzd)} would have to write{" "}
          <strong className="font-display text-lg text-white">{breakEvenEducator ?? "—"}</strong> stories in a month before
          they cost more in AI than they pay. That is the number that tells you whether &ldquo;unlimited&rdquo; is safe.
        </p>
      </div>

      {/* ------------------------------------------------------------- scale */}
      <div className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
        <h2 className="font-display text-lg font-bold">If usage and revenue grow together</h2>
        <p className="mt-1 text-xs text-ink-400">
          Fixed costs stay flat while revenue and AI cost scale, so this shows whether AI spend ever outgrows the price.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3 font-semibold">Scale</th>
                <th className="py-2 pr-3 font-semibold">MRR</th>
                <th className="py-2 pr-3 font-semibold">AI cost</th>
                <th className="py-2 pr-3 font-semibold">Profit</th>
                <th className="py-2 pr-3 font-semibold">Margin</th>
                <th className="py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {scale.map((row) => (
                <tr key={row.multiplier} className="border-t border-ink-800 tabular-nums">
                  <td className="py-2 pr-3 text-ink-200">{row.multiplier}×</td>
                  <td className="py-2 pr-3">{nzd(row.mrrNzd)}</td>
                  <td className="py-2 pr-3 text-ink-300">{nzd(row.apiCostNzd)}</td>
                  <td className="py-2 pr-3">{nzd(row.grossProfitNzd)}</td>
                  <td className="py-2 pr-3">{pct(row.grossMarginPct)}</td>
                  <td className="w-[32%] py-2">
                    <div className="h-2.5 overflow-hidden rounded-full bg-ink-800">
                      <div
                        className={`h-full rounded-full ${row.grossProfitNzd >= 0 ? "bg-sage-500" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(100, (Math.abs(row.grossProfitNzd) / maxProfit) * 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {toGoal && toGoal > 1 && (
          <p className="mt-3 text-xs text-ink-400">
            The {Math.round(toGoal * 10) / 10}× row is the NZ$10,000 MRR goal at today&apos;s mix and usage.
          </p>
        )}
      </div>

      {/* ------------------------------------------------------ contribution */}
      <div className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-bold">Cost per customer</h2>
          <p className={`text-xs font-semibold ${unprofitable.length ? "text-amber-300" : "text-sage-300"}`}>
            {unprofitable.length
              ? `${unprofitable.length} customer${unprofitable.length === 1 ? "" : "s"} costing more than they pay`
              : "Every paying customer covers their AI cost"}
          </p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-ink-400">
                <th className="py-2 pr-3 font-semibold">Customer</th>
                <th className="py-2 pr-3 font-semibold">Pays</th>
                <th className="py-2 pr-3 font-semibold">Stories this month</th>
                <th className="py-2 pr-3 font-semibold">AI cost</th>
                <th className="py-2 font-semibold">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {contribution.slice(0, 25).map((row) => (
                <tr key={row.userId} className="border-t border-ink-800 tabular-nums">
                  <td className="max-w-[220px] truncate py-2 pr-3 text-ink-200">{row.email ?? row.userId.slice(0, 8)}</td>
                  <td className="py-2 pr-3">{nzd(row.planPriceNzd)}</td>
                  <td className="py-2 pr-3 text-ink-300">{row.stories30d}</td>
                  <td className="py-2 pr-3 text-ink-300">{nzd(row.costNzd, 2)}</td>
                  <td className={`py-2 font-semibold ${row.unprofitable ? "text-amber-300" : "text-sage-300"}`}>
                    {nzd(row.contributionNzd, 2)}
                  </td>
                </tr>
              ))}
              {!contribution.length && (
                <tr><td colSpan={5} className="py-3 text-ink-400">No active paying customers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {contribution.length > 25 && <p className="mt-2 text-xs text-ink-400">Showing the 25 lowest contributors of {contribution.length}.</p>}
      </div>
    </div>
  );
}
