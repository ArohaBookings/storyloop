import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, ArrowLeft } from "lucide-react";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isChargedWhileComped } from "@/lib/admin-guards";
import {
  demoReliability,
  emailTone,
  summarizeEmailEvents,
  webhookTone,
  worstTone,
  type Tone,
  type WebhookHealth,
} from "@/lib/system-health";

export const metadata = { title: "System health · StoryLoop Admin" };
export const dynamic = "force-dynamic";

const DAYS = 7;
const DAY = 24 * 60 * 60 * 1000;

type HealthRpc = {
  webhooks: WebhookHealth & {
    by_type: Array<{ type: string; total: number; failed: number }>;
    recent_failures: Array<{ type: string; status: string; at: string; error: string }>;
  };
};

const TONE: Record<Tone, { ring: string; dot: string; label: string }> = {
  ok: { ring: "border-sage-500/40", dot: "bg-sage-400", label: "Healthy" },
  warn: { ring: "border-amber-500/50", dot: "bg-amber-400", label: "Needs a look" },
  critical: { ring: "border-red-500/60", dot: "bg-red-400", label: "Act now" },
};

function Section({ title, tone, children, note }: { title: string; tone: Tone; children: ReactNode; note?: string }) {
  return (
    <section className={`rounded-2xl border ${TONE[tone].ring} bg-ink-900 p-5`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-200">
          <span className={`h-2 w-2 rounded-full ${TONE[tone].dot}`} /> {TONE[tone].label}
        </span>
      </div>
      {note && <p className="mt-1 text-xs leading-relaxed text-ink-400">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-400">{label}</p>
      <p className="font-display text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(1)}%`);

/**
 * System health. Read-only. One question per section: is something silently
 * broken that costs money or trust?
 */
export default async function SystemHealthPage() {
  const session = await verifyAdmin();
  if (!session) redirect("/admin-login");

  const sb = createAdminSupabase();
  const since = new Date(Date.now() - DAYS * DAY).toISOString();
  const countEvents = (type: string) =>
    sb.from("page_events").select("id", { count: "exact", head: true }).eq("event_type", type).gte("created_at", since);

  const [healthRes, emailsRes, startedRes, completedRes, errorsRes, subsRes] = await Promise.all([
    sb.rpc("admin_system_health", { p_days: DAYS }),
    sb.from("email_events").select("email_type, delivery_status").gte("sent_at", since).limit(20000),
    countEvents("demo_started"),
    countEvents("demo_completed"),
    countEvents("demo_error"),
    sb
      .from("profiles")
      .select("id, email, plan, subscription_status, stripe_subscription_id, is_internal")
      .not("stripe_subscription_id", "is", null)
      .limit(5000),
  ]);

  // ------------------------------------------------------------- billing
  const subscribed = subsRes.data ?? [];
  const chargedWhileComped = subscribed.filter((p) => isChargedWhileComped(p));
  const pastDue = subscribed.filter((p) => ["past_due", "payment_required"].includes(p.subscription_status ?? ""));
  const billingTone: Tone = chargedWhileComped.length ? "critical" : pastDue.length ? "warn" : "ok";

  // -------------------------------------------------------------- webhooks
  const rpcMissing = Boolean(healthRes.error);
  const health = (healthRes.data as HealthRpc | null)?.webhooks ?? null;
  const hooksTone = webhookTone(rpcMissing ? null : health);

  // ---------------------------------------------------------------- email
  const emails = summarizeEmailEvents(emailsRes.data ?? []);
  const mailTone = emailTone(emails);

  // ----------------------------------------------------------------- demo
  const demo = demoReliability({
    started: startedRes.count ?? 0,
    completed: completedRes.count ?? 0,
    errors: errorsRes.count ?? 0,
  });

  const overall = worstTone([billingTone, hooksTone, mailTone, demo.tone]);

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>

        <div className="mb-6 mt-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-clay-400">
              <Activity className="h-3.5 w-3.5" /> System health · last {DAYS} days
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold">Is anything silently broken?</h1>
          </div>
          <span className={`flex items-center gap-2 rounded-full border ${TONE[overall].ring} px-4 py-1.5 text-sm font-semibold`}>
            <span className={`h-2.5 w-2.5 rounded-full ${TONE[overall].dot}`} /> {TONE[overall].label}
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <Section
            title="Billing integrity"
            tone={billingTone}
            note="Accounts with a live Stripe subscription that the app treats as comped or free may be charged for access they do not have."
          >
            <div className="grid grid-cols-3 gap-3">
              <Figure label="Subscribed" value={subscribed.length} />
              <Figure label="Charged while comped" value={chargedWhileComped.length} />
              <Figure label="Past due" value={pastDue.length} />
            </div>
            {chargedWhileComped.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {chargedWhileComped.slice(0, 10).map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/users/${p.id}`} className="text-red-200 underline underline-offset-2 hover:text-white">
                      {p.email ?? p.id}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Stripe webhooks"
            tone={hooksTone}
            note={
              rpcMissing
                ? "Webhook history is not visible yet. Apply supabase/migrations/20260917_admin_system_health.sql to see it."
                : "Stuck means a handler was killed mid-run and has been claimed for over 15 minutes. With the stale lock recovery migration applied, Stripe's next retry reclaims it; without it, the event is lost."
            }
          >
            {health && !rpcMissing ? (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <Figure label="Received" value={health.total} />
                  <Figure label="Processed" value={health.processed} />
                  <Figure label="Failed" value={health.failed} />
                  <Figure label="Stuck" value={health.stuck_processing} />
                </div>
                {health.recent_failures.length > 0 && (
                  <ul className="mt-3 space-y-2 text-xs">
                    {health.recent_failures.slice(0, 6).map((f, i) => (
                      <li key={`${f.at}-${i}`} className="rounded-xl border border-ink-800 bg-ink-950 p-2">
                        <span className="font-semibold text-amber-200">{f.type}</span>
                        <span className="text-ink-400"> · {f.status} · {new Date(f.at).toLocaleString("en-NZ")}</span>
                        {f.error && <p className="mt-1 break-words text-ink-300">{f.error}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-400">No webhook data.</p>
            )}
          </Section>

          <Section
            title="Email delivery"
            tone={mailTone}
            note="Skipped because unconfigured means no email key in this environment, which stops payment notices as well as tips."
          >
            <div className="grid grid-cols-3 gap-3">
              <Figure label="Sent" value={emails.sent} />
              <Figure label="Failed" value={emails.failed} />
              <Figure label="Failure rate" value={pct(emails.failureRate)} />
            </div>
            {emails.byType.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[360px] text-xs">
                  <thead>
                    <tr className="text-left uppercase tracking-wide text-ink-400">
                      <th className="py-1.5 pr-2 font-semibold">Type</th>
                      <th className="py-1.5 pr-2 font-semibold">Sent</th>
                      <th className="py-1.5 pr-2 font-semibold">Failed</th>
                      <th className="py-1.5 font-semibold">Skipped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emails.byType.slice(0, 12).map((row) => (
                      <tr key={row.type} className="border-t border-ink-800 tabular-nums">
                        <td className="py-1.5 pr-2 text-ink-100">{row.type.replaceAll("_", " ")}</td>
                        <td className="py-1.5 pr-2">{row.sent}</td>
                        <td className={`py-1.5 pr-2 ${row.failed ? "text-red-300" : ""}`}>{row.failed}</td>
                        <td className="py-1.5 text-ink-400">{row.skipped}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section
            title="Landing demo"
            tone={demo.tone}
            note="The top of the funnel. A visitor who pressed the button and got an error rarely tries twice."
          >
            <div className="grid grid-cols-4 gap-3">
              <Figure label="Started" value={demo.started} />
              <Figure label="Completed" value={demo.completed} />
              <Figure label="Errors" value={demo.errors} />
              <Figure label="Error rate" value={pct(demo.errorRate)} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
