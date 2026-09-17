"use client";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Loader2 } from "lucide-react";
import { accountSignals, weeklyBuckets } from "@/lib/admin-activity";
import { normalizePlanKey } from "@/lib/plans";

type Detail = {
  profile: Record<string, unknown> & {
    id: string; email: string | null; full_name: string | null; plan: string | null;
    subscription_status: string | null; is_active: boolean | null; is_internal: boolean | null;
    created_at: string; last_seen_at: string | null; last_story_at: string | null;
    stories_this_month: number | null; monthly_story_limit_override: number | null;
    stripe_customer_id: string | null; stripe_subscription_id: string | null; current_period_end: string | null;
    signup_source?: string | null; signup_campaign?: string | null; signup_referrer_host?: string | null;
    marketing_unsubscribed_at: string | null;
  };
  billing: { liveStripeSubscription: boolean; chargedWhileComped: boolean };
  emails: Array<{ email_type: string; delivery_status: string; subject: string | null; sent_at: string }>;
  audit: Array<{ action: string; details: Record<string, unknown> | null; created_at: string }>;
  storyCount: number;
  storyDates: string[];
  membership: { role: string; status: string; shares_stories: boolean; joined_at: string } | null;
};

const WEEKS = 12;

const date = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : "—";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-800 py-2 last:border-0">
      <span className="text-xs text-ink-400">{label}</span>
      <span className="min-w-0 truncate text-right text-sm text-ink-100">{value}</span>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState("");
  const [override, setOverride] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`);
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Could not load this user."); return; }
    setData(json);
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!data) return;
    setBusy(action);
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId: data.profile.id, email: data.profile.email, ...extra }),
    });
    const json = await res.json();
    if (json.link) { await navigator.clipboard.writeText(json.link); setToast("Magic link copied to clipboard"); }
    else setToast(res.ok ? json.message ?? "Done" : json.error ?? "Failed");
    setBusy("");
    await load();
    window.setTimeout(() => setToast(""), 6000);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-ink-950 p-8 text-white">
        <Link href="/admin/users" className="text-sm text-ink-300 hover:text-white">← Users</Link>
        <p className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>
      </div>
    );
  }
  if (!data) {
    return <div className="flex min-h-screen items-center gap-2 bg-ink-950 p-8 text-ink-300"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  const p = data.profile;
  const plan = normalizePlanKey(p.plan);
  const buckets = weeklyBuckets(data.storyDates, WEEKS, new Date());
  const maxBucket = Math.max(1, ...buckets);
  const signals = accountSignals({
    plan: p.plan, subscriptionStatus: p.subscription_status, isActive: p.is_active,
    chargedWhileComped: data.billing.chargedWhileComped, storyCount: data.storyCount,
    lastStoryAt: p.last_story_at, now: new Date(),
  });
  const toneStyle = {
    critical: "border-red-500/50 bg-red-500/10 text-red-100",
    warn: "border-amber-500/50 bg-amber-500/10 text-amber-100",
    info: "border-ink-700 bg-ink-900 text-ink-200",
    good: "border-sage-500/50 bg-sage-500/10 text-sage-100",
  } as const;

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Users
        </Link>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-bold">{p.full_name || p.email || "Unnamed account"}</h1>
            <p className="mt-1 text-sm text-ink-300">{p.email} · joined {date(p.created_at)}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="rounded-full bg-clay-500/20 px-3 py-1 text-clay-300">{plan}</span>
            <span className="rounded-full bg-ink-800 px-3 py-1 text-ink-200">{p.subscription_status ?? "no status"}</span>
            {p.is_internal && <span className="rounded-full bg-ink-800 px-3 py-1 text-ink-400">internal</span>}
          </div>
        </div>

        {toast && <p className="mt-4 rounded-2xl border border-ink-700 bg-ink-900 p-3 text-sm text-ink-100">{toast}</p>}

        {signals.length > 0 && (
          <div className="mt-5 space-y-2">
            {signals.map((s) => (
              <div key={s.text} className={`flex items-start gap-2 rounded-2xl border p-3 text-sm ${toneStyle[s.tone]}`}>
                {s.tone === "good" ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" /> : s.tone === "info" ? <Info className="mt-0.5 h-4 w-4 flex-none" /> : <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />}
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {/* ----------------------------------------------------- activity */}
          <section className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
            <h2 className="font-display text-lg font-bold">Activity</h2>
            <div className="mt-3 flex h-24 items-end gap-1" aria-label={`Stories per week for the last ${WEEKS} weeks`}>
              {buckets.map((count, index) => (
                <div key={index} className="flex h-full flex-1 flex-col justify-end">
                  <div
                    className={`w-full rounded-t ${index === buckets.length - 1 ? "bg-clay-400" : "bg-clay-600/70"}`}
                    style={{ height: `${Math.max(count > 0 ? 6 : 2, (count / maxBucket) * 100)}%` }}
                    title={`${count} ${count === 1 ? "story" : "stories"}`}
                  />
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-400">Stories per week, last {WEEKS} weeks. Rightmost bar is the last 7 days.</p>
            <div className="mt-3">
              <Row label="Stories, all time" value={data.storyCount} />
              <Row label="Stories this month" value={p.stories_this_month ?? 0} />
              <Row label="Last story" value={date(p.last_story_at)} />
              <Row label="Last seen" value={date(p.last_seen_at)} />
            </div>
          </section>

          {/* ------------------------------------------------------ billing */}
          <section className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
            <h2 className="font-display text-lg font-bold">Billing</h2>
            <div className="mt-2">
              <Row label="Live Stripe subscription" value={data.billing.liveStripeSubscription ? "Yes" : "No"} />
              <Row label="Stripe customer" value={p.stripe_customer_id ?? "—"} />
              <Row label="Stripe subscription" value={p.stripe_subscription_id ?? "—"} />
              <Row label="Current period ends" value={date(p.current_period_end)} />
            </div>
            {data.billing.liveStripeSubscription && (
              <p className="mt-3 text-xs leading-relaxed text-ink-400">
                Plan changes and disabling are locked for this account. Make billing changes in Stripe and the webhook will
                update StoryLoop, so the card is never charged for access they do not have.
              </p>
            )}
          </section>

          {/* -------------------------------------------------- attribution */}
          <section className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
            <h2 className="font-display text-lg font-bold">Where they came from</h2>
            <div className="mt-2">
              <Row label="Source" value={p.signup_source ?? "unknown"} />
              <Row label="Campaign" value={p.signup_campaign ?? "—"} />
              <Row label="Referrer" value={p.signup_referrer_host ?? "—"} />
              <Row label="Centre" value={data.membership ? `${data.membership.role}, ${data.membership.shares_stories ? "sharing" : "activity only"}` : "none"} />
              <Row label="Product tips" value={p.marketing_unsubscribed_at ? `unsubscribed ${date(p.marketing_unsubscribed_at)}` : "subscribed"} />
            </div>
          </section>

          {/* ----------------------------------------------------- controls */}
          <section className="rounded-2xl border border-ink-700 bg-ink-900 p-5">
            <h2 className="font-display text-lg font-bold">Support controls</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button disabled={!!busy} onClick={() => act("reset_password")} className="rounded-xl border border-ink-700 px-3 py-2 text-xs hover:border-clay-500">Send password reset</button>
              <button disabled={!!busy} onClick={() => act("magic_link")} className="rounded-xl border border-ink-700 px-3 py-2 text-xs hover:border-clay-500">Copy magic link</button>
              <button disabled={!!busy} onClick={() => act("set_internal", { value: !p.is_internal })} className="rounded-xl border border-ink-700 px-3 py-2 text-xs hover:border-clay-500">
                {p.is_internal ? "Count in metrics" : "Exclude from metrics"}
              </button>
              <button disabled={!!busy} onClick={() => act(p.is_active === false ? "enable" : "disable")} className="rounded-xl border border-ink-700 px-3 py-2 text-xs hover:border-amber-500">
                {p.is_active === false ? "Enable login" : "Disable login"}
              </button>
            </div>

            {plan === "free" && (
              <div className="mt-4 border-t border-ink-800 pt-4">
                <label htmlFor="override" className="text-[11px] font-semibold uppercase tracking-wide text-ink-300">
                  Monthly story limit (free accounts only)
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input id="override" type="number" min="1" max="1000" value={override}
                    onChange={(e) => setOverride(e.target.value)}
                    placeholder={p.monthly_story_limit_override ? String(p.monthly_story_limit_override) : "3 (default)"}
                    className="w-28 rounded-xl border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-white" />
                  <button disabled={!!busy || !override} onClick={() => act("set_story_limit_override", { value: Number.parseInt(override, 10) })}
                    className="rounded-xl border border-ink-700 px-3 py-2 text-xs hover:border-clay-500">Set</button>
                  {p.monthly_story_limit_override !== null && (
                    <button disabled={!!busy} onClick={() => act("set_story_limit_override", { value: null })}
                      className="rounded-xl border border-ink-700 px-3 py-2 text-xs hover:border-clay-500">Clear</button>
                  )}
                </div>
              </div>
            )}
            {busy && <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Working…</p>}
          </section>
        </div>

        {/* ------------------------------------------------------- emails */}
        <section className="mt-5 rounded-2xl border border-ink-700 bg-ink-900 p-5">
          <h2 className="font-display text-lg font-bold">Emails</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-ink-400">
                  <th className="py-2 pr-3 font-semibold">Email</th>
                  <th className="py-2 pr-3 font-semibold">Result</th>
                  <th className="py-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody>
                {data.emails.map((e, i) => (
                  <tr key={`${e.sent_at}-${i}`} className="border-t border-ink-800">
                    <td className="py-2 pr-3 text-ink-100">{e.email_type.replaceAll("_", " ")}</td>
                    <td className={`py-2 pr-3 ${e.delivery_status === "sent" ? "text-sage-300" : e.delivery_status === "failed" ? "text-red-300" : "text-ink-400"}`}>
                      {e.delivery_status.replaceAll("_", " ")}
                    </td>
                    <td className="py-2 text-ink-400">{date(e.sent_at)}</td>
                  </tr>
                ))}
                {!data.emails.length && <tr><td colSpan={3} className="py-3 text-ink-400">No emails recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* -------------------------------------------------------- audit */}
        <section className="mt-5 rounded-2xl border border-ink-700 bg-ink-900 p-5">
          <h2 className="font-display text-lg font-bold">Admin history</h2>
          <ul className="mt-3 space-y-2">
            {data.audit.map((a, i) => (
              <li key={`${a.created_at}-${i}`} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-800 pb-2 text-sm last:border-0">
                <span className={a.action.startsWith("blocked_") ? "text-amber-300" : "text-ink-100"}>{a.action.replaceAll("_", " ")}</span>
                <span className="text-xs text-ink-400">{date(a.created_at)}</span>
              </li>
            ))}
            {!data.audit.length && <li className="text-sm text-ink-400">No admin actions on this account.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
