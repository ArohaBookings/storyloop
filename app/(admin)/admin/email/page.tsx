import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  DAILY_CEILING,
  EMAIL_CLASS,
  MARKETING_PER_30_DAYS,
  MIN_DAYS_SINCE_LAST,
  MIN_SENDS_TO_LEARN,
  SEND_HOURS,
  SLOW_MODE_DAILY_CEILING,
  campaignScore,
  type EmailClass,
} from "@/lib/email/brain";
import { MARKETING_TYPES, loadCampaignStats, loadGlobalEmailState } from "@/lib/email/brain-state";
import { WINBACK_LABEL, WINBACK_OFFER_ID } from "@/lib/offers";
import type { LifecycleEmailType } from "@/lib/email/templates";

export const metadata = { title: "Email brain · StoryLoop Admin" };
export const dynamic = "force-dynamic";

const CLASS_LABEL: Record<EmailClass, string> = {
  transactional: "Billing and account",
  moment: "Paying moment",
  offer: "Offer",
  activation: "Getting started",
  engagement: "Tip or ask",
};

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "–");

/**
 * The email brain (lib/email/brain.ts), as it stands right now: whether it is
 * sending, the rules it works to, and how each campaign has done. Read-only.
 * To stop all non-billing email at once, set EMAIL_MARKETING_PAUSED=1 in
 * Vercel; it also stops itself on complaints and bounces.
 */
export default async function EmailBrainPage() {
  const session = await verifyAdmin();
  if (!session) redirect("/admin-login");
  const sb = createAdminSupabase();
  const now = new Date();
  const [state, campaigns, recent, suppressed, grants] = await Promise.all([
    loadGlobalEmailState(now, { fresh: true }),
    loadCampaignStats(now),
    sb.from("email_events").select("email_type, sent_at, opened_at, clicked_at, metadata, delivery_status").in("email_type", MARKETING_TYPES).in("delivery_status", ["sent", "failed"]).order("sent_at", { ascending: false }).limit(25),
    sb.from("email_unsubscribes").select("reason"),
    sb.from("offer_grants").select("email_sent_at, clicked_at, checkout_started_at, redeemed_at, expires_at").eq("offer_id", WINBACK_OFFER_ID),
  ]);
  const status = state.pausedReason ? { label: "Paused", tone: "border-red-500/60 text-red-200", note: state.pausedReason } : state.slowMode ? { label: "Slow mode", tone: "border-amber-500/50 text-amber-200", note: "Unsubscribes or a complaint: tips are off and the daily ceiling is lower." } : { label: "Sending", tone: "border-sage-500/40 text-sage-200", note: "Within the rules below." };
  const suppressedBy = (reason: string) => (suppressed.data ?? []).filter((r) => (r.reason ?? "") === reason).length;
  const rows = (Object.keys(EMAIL_CLASS) as LifecycleEmailType[]).filter((t) => EMAIL_CLASS[t] !== "transactional");
  const g = grants.data ?? [];

  return (
    <main className="min-h-screen bg-ink-950 px-4 py-8 text-paper sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-paper"><ArrowLeft className="h-4 w-4" /> Admin</Link>
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-clay-300" />
          <h1 className="font-display text-3xl font-bold">Email brain</h1>
        </div>

        <section className={`rounded-2xl border bg-ink-900 p-5 ${status.tone}`} data-testid="email-brain-status">
          <p className="text-xs font-bold uppercase tracking-wider">Status: {status.label}</p>
          <p className="mt-1 text-sm text-ink-200">{status.note}</p>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <p><span className="block text-2xl font-bold text-paper">{state.sentLast24h}</span>non-billing sent in 24h (limit {state.slowMode ? SLOW_MODE_DAILY_CEILING : DAILY_CEILING})</p>
            <p><span className="block text-2xl font-bold text-paper">{state.stats30.sent30}</span>sent in 30 days</p>
            <p><span className="block text-2xl font-bold text-paper">{state.stats30.bounced30} / {state.stats30.complained30}</span>bounces / spam complaints, 30 days</p>
            <p><span className="block text-2xl font-bold text-paper">{state.stats30.unsubscribed30}</span>unsubscribes, 30 days</p>
          </div>
          <p className="mt-3 text-xs text-ink-400">
            Suppressed for good: {suppressedBy("bounced")} bounced, {suppressedBy("complained")} complained, {(suppressed.data ?? []).length - suppressedBy("bounced") - suppressedBy("complained")} unsubscribed.
            {" "}Click tracking since {state.trackingSince ? new Date(state.trackingSince).toLocaleDateString("en-NZ") : "the next send"}.
          </p>
        </section>

        <section className="rounded-2xl border border-ink-700 bg-ink-900 p-5 text-sm text-ink-200">
          <h2 className="font-display text-xl font-bold text-paper">The rules it works to</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>Never more than {MARKETING_PER_30_DAYS} non-billing emails to one person in 30 days. Billing, trial and account email is never held.</li>
            <li>Each run, each person gets at most the single most valuable email they qualify for: paying moments, then offers, then getting started, then tips.</li>
            <li>Spacing since their last email: paying moment {MIN_DAYS_SINCE_LAST.moment} days, offer {MIN_DAYS_SINCE_LAST.offer}, getting started {MIN_DAYS_SINCE_LAST.activation}, tip {MIN_DAYS_SINCE_LAST.engagement} (and only if nothing else went that month).</li>
            <li>Scheduled email arrives {SEND_HOURS.from}am to {SEND_HOURS.to - 12}pm in their time zone; email their own action triggers goes at once.</li>
            <li>Three emails in a row with no open or click: offers and paying moments only, one a month. Nobody is judged before tracking data exists.</li>
            <li>Stops itself at 2 spam complaints or a 5% bounce rate in 30 days; slows at one complaint or a run of unsubscribes. Bounced and complained addresses are suppressed at once.</li>
            <li>A campaign&apos;s own clicks and upgrades only reorder it after {MIN_SENDS_TO_LEARN} sends. Pause everything: EMAIL_MARKETING_PAUSED=1 in Vercel.</li>
          </ul>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-ink-700 bg-ink-900 p-5">
          <h2 className="font-display text-xl font-bold">Campaigns, last 90 days</h2>
          <table className="mt-3 w-full min-w-[720px] text-left text-sm" data-testid="email-brain-campaigns">
            <thead className="text-xs uppercase tracking-wider text-ink-400">
              <tr><th className="py-2">Email</th><th>Kind</th><th>Sent</th><th>Opened</th><th>Clicked</th><th>Upgraded in 7 days</th><th>Bounced</th><th>Learning</th></tr>
            </thead>
            <tbody>
              {rows.map((type) => {
                const s = campaigns.stats[type];
                const sent = s?.sent ?? 0;
                return (
                  <tr key={type} className="border-t border-ink-800">
                    <td className="py-2 font-mono text-xs">{type}</td>
                    <td>{CLASS_LABEL[EMAIL_CLASS[type]]}</td>
                    <td>{sent}</td>
                    <td>{pct(s?.opened ?? 0, sent)}</td>
                    <td>{pct(s?.clicked ?? 0, sent)}</td>
                    <td>{s?.converted ?? 0}</td>
                    <td>{s?.bounced ?? 0}</td>
                    <td className="text-xs text-ink-400">{sent >= MIN_SENDS_TO_LEARN ? `score ${campaignScore(s).toFixed(3)}` : `${sent}/${MIN_SENDS_TO_LEARN} sends`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-ink-700 bg-ink-900 p-5 text-sm">
          <h2 className="font-display text-xl font-bold">Welcome-back offer: {WINBACK_LABEL}</h2>
          <p className="mt-2 text-ink-300">
            Granted {g.length} · emailed {g.filter((x) => x.email_sent_at).length} · opened billing {g.filter((x) => x.clicked_at).length} · started checkout {g.filter((x) => x.checkout_started_at).length} · came back {g.filter((x) => x.redeemed_at).length}
          </p>
        </section>

        <section className="overflow-x-auto rounded-2xl border border-ink-700 bg-ink-900 p-5">
          <h2 className="font-display text-xl font-bold">Last 25 non-billing emails</h2>
          <table className="mt-3 w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-ink-400"><tr><th className="py-2">When</th><th>Email</th><th>Resend says</th><th>Opened</th><th>Clicked</th></tr></thead>
            <tbody>
              {(recent.data ?? []).map((r, i) => (
                <tr key={i} className="border-t border-ink-800">
                  <td className="py-2">{new Date(r.sent_at as string).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland" })}</td>
                  <td className="font-mono text-xs">{r.email_type as string}</td>
                  <td>{r.delivery_status === "failed" ? "failed to send" : String((r.metadata as Record<string, unknown> | null)?.provider_status ?? "not checked yet")}</td>
                  <td>{r.opened_at ? "yes" : ""}</td>
                  <td>{r.clicked_at ? "yes" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
