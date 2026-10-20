"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, PauseCircle } from "lucide-react";
import { chargeDay, type PauseMonths, type PauseView } from "@/lib/billing-pause";

function money(cents: number | null, currency: string | null) {
  if (cents == null || !currency) return null;
  const c = currency.toLowerCase();
  const symbol = c === "nzd" ? "NZ$" : c === "aud" ? "A$" : `${currency.toUpperCase()} `;
  return `${symbol}${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

const REASON_COPY: Record<string, string> = {
  already_paused: "Payments are already paused.",
  cancelling: "Your plan is already set to end, so there is nothing to pause.",
  not_pausable: "There is no payment to pause on this account right now.",
  no_subscription: "There is no payment to pause on this account.",
  not_paused: "Payments are not paused.",
  bad_link: "This link has expired. Sign in to billing, or reply to the email.",
  paused_recently: "Payments were paused recently, so there is no second pause for now. Reply to the email if you need a hand.",
  nothing_due: "Your next payment is already covered, so there is nothing to pause.",
  rate_limited: "Too many tries. Please wait a few minutes and try again.",
};

export default function PauseForm({ token, first, initial }: { token: string; first: string; initial: PauseView }) {
  const [view, setView] = useState<PauseView>(initial);
  const [months, setMonths] = useState<PauseMonths>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [justPaused, setJustPaused] = useState(false);
  const price = money(view.amount, view.currency);
  const formatDay = (value: string) => chargeDay(value, view.currency);

  async function send(action: "pause" | "restart") {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/billing/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, months }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(REASON_COPY[data.reason] ?? "That did not work. Please try again, or reply to the email.");
        return;
      }
      setView(data.view as PauseView);
      setJustPaused(action === "pause");
    } catch {
      setError("That did not work. Please try again, or reply to the email.");
    } finally {
      setBusy(false);
    }
  }

  if (view.status === "paused") {
    return (
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-100 text-sage-700"><CheckCircle2 className="h-6 w-6" /></div>
        <h1 className="font-display text-3xl font-bold text-ink-900">{justPaused ? "Paused." : "Payments are paused"}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          {view.pausedUntil ? <>Nothing will be charged until <strong>{formatDay(view.pausedUntil)}</strong>, when payments restart by themselves.</> : "Nothing will be charged while payments are paused."}{" "}
          Your account and stories stay just as they are, and you can still sign in.
        </p>
        {error && <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => send("restart")} disabled={busy} className="btn-secondary justify-center">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Restart payments now"}
          </button>
          <Link href="/" className="btn-primary justify-center">Done</Link>
        </div>
      </div>
    );
  }

  if (view.status !== "can_pause") {
    return (
      <div>
        <h1 className="font-display text-3xl font-bold text-ink-900">Nothing to pause</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">{REASON_COPY[view.status] ?? REASON_COPY.not_pausable}</p>
        <Link href="/login?redirect=%2Fbilling" className="btn-primary mt-6 inline-flex justify-center">Open billing</Link>
      </div>
    );
  }

  const chosen = view.options.find((o) => o.months === months) ?? view.options[0];
  return (
    <div>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-50 text-clay-700"><PauseCircle className="h-6 w-6" /></div>
      <h1 className="font-display text-3xl font-bold text-ink-900">Pause StoryLoop, {first}?</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-600">
        {view.nextChargeAt ? <>Your next payment{price ? <> of <strong>{price}</strong></> : null} is due on <strong>{formatDay(view.nextChargeAt)}</strong>. </> : null}
        Pausing skips it and keeps your account and stories just as they are. Payments restart by themselves on the date below, or whenever you choose.
      </p>
      <fieldset className="mt-5 space-y-2">
        <legend className="mb-2 text-xs font-semibold text-ink-700">How long?</legend>
        {view.options.map((option) => (
          <label key={option.months} className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm ${months === option.months ? "border-clay-500 bg-cream-50" : "border-clay-100"}`}>
            <span className="flex items-center gap-3">
              <input type="radio" name="months" value={option.months} checked={months === option.months} onChange={() => setMonths(option.months)} />
              {option.months === 1 ? "1 month" : `${option.months} months`}
            </span>
            <span className="text-xs text-ink-500">restarts {formatDay(option.resumesAt)}</span>
          </label>
        ))}
      </fieldset>
      {error && <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => send("pause")} disabled={busy} className="btn-primary justify-center">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pause until ${formatDay(chosen.resumesAt)}`}
        </button>
        <Link href="/" className="btn-secondary justify-center">Keep my plan as it is</Link>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-500">Nothing changes unless you press pause. To stop for good instead, sign in and open Billing.</p>
    </div>
  );
}
