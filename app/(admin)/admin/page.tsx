import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CreditCard, LogOut, RefreshCcw, ShieldAlert } from "lucide-react";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { loadStripeSnapshot, loadStripeSnapshotFresh } from "@/lib/admin-command";
import { assessBillingRisk, worstRisk, type Risk } from "@/lib/billing-risk";
import { summariseFunnel, type EventRow } from "@/lib/admin-funnel";
import { audToNzdRate } from "@/lib/stripe-mrr";
import { MRR_GOAL_NZD } from "@/lib/mrr";
import { getPlanByKey, normalizePlanKey } from "@/lib/plans";
import CampaignPanel from "@/components/admin/CampaignPanel";

export const metadata = { title: "Command centre · StoryLoop Admin" };
export const maxDuration = 60;

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  plan: string | null;
  subscription_status: string | null;
  stripe_customer_id: string | null;
  created_at: string | null;
  last_seen_at: string | null;
  total_stories: number | null;
  stories_this_month: number | null;
  is_internal: boolean | null;
};

const NAV = [
  ["Overview (classic)", "/admin/overview"],
  ["Users", "/admin/users"],
  ["Growth", "/admin/growth"],
  ["Trends", "/admin/trends"],
  ["Economics", "/admin/economics"],
  ["System", "/admin/system"],
  ["Links", "/admin/links"],
  ["Reviews", "/admin/reviews"],
  ["Blog", "/admin/blog"],
  ["Index", "/admin/learning-index"],
] as const;

function nzd(value: number) {
  return `NZ$${value.toLocaleString("en-NZ", { maximumFractionDigits: 0 })}`;
}

function sym(currency: string) {
  return currency.toUpperCase() === "NZD" ? "NZ$" : currency.toUpperCase() === "AUD" ? "A$" : `${currency.toUpperCase()} `;
}

function day(seconds: number | null | undefined) {
  if (!seconds) return "n/a";
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", timeZone: "Pacific/Auckland" }).format(new Date(seconds * 1000));
}

function ago(iso: string | null | undefined) {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days}d ago`;
}

const RISK_STYLE: Record<string, string> = {
  high: "border-red-500/40 bg-red-500/10 text-red-200",
  medium: "border-amber-500/40 bg-amber-500/10 text-amber-100",
  low: "border-ink-700 bg-ink-800/60 text-ink-300",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-sage-500/20 text-sage-300",
  trialing: "bg-blue-500/20 text-blue-200",
  past_due: "bg-red-500/20 text-red-200",
  unpaid: "bg-red-500/20 text-red-200",
  incomplete: "bg-red-500/20 text-red-200",
  canceled: "bg-ink-700 text-ink-300",
};

function Panel({ title, kicker, children, id }: { title: string; kicker?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-2xl border border-ink-800 bg-ink-900 p-5">
      {kicker && <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-clay-400">{kicker}</p>}
      <h2 className="mt-1 font-display text-2xl font-bold text-paper">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function CommandCentre({ searchParams }: { searchParams: Promise<{ fresh?: string }> }) {
  const session = await verifyAdmin();
  if (!session) redirect("/admin-login");
  const fresh = (await searchParams).fresh === "1";

  const sb = createAdminSupabase();
  const sinceIso = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [profilesRes, eventsRes] = await Promise.all([
    sb.from("profiles").select("id, full_name, email, plan, subscription_status, stripe_customer_id, created_at, last_seen_at, total_stories, stories_this_month, is_internal").limit(10000),
    sb.from("page_events").select("event_type, session_id, user_id, path, referrer_host, utm_source, device, metadata, created_at").gte("created_at", sinceIso).order("created_at", { ascending: false }).limit(25000),
  ]);
  const profiles = (profilesRes.data ?? []) as Profile[];
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  const userIds = profiles.map((profile) => profile.id).sort();
  const customerIds = profiles.map((profile) => profile.stripe_customer_id).filter((id): id is string => Boolean(id)).sort();

  const stripe = fresh ? await loadStripeSnapshotFresh(userIds, customerIds) : await loadStripeSnapshot(userIds, customerIds);
  const rate = audToNzdRate();
  const toNzd = (amount: number, currency: string) => (currency.toUpperCase() === "AUD" ? amount * rate : amount);

  // --- Who is paying, and the risk on each.
  const live = stripe.subscriptions.filter((sub) => ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(sub.status));
  const rows = live
    .map((sub) => ({ sub, profile: byId.get(sub.userId), risks: assessBillingRisk(sub.facts) }))
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
      return (order[worstRisk(a.risks) ?? ""] ?? 3) - (order[worstRisk(b.risks) ?? ""] ?? 3) || toNzd(b.sub.monthly, b.sub.currency) - toNzd(a.sub.monthly, a.sub.currency);
    });
  const billed = live.filter((sub) => sub.status === "active" || sub.status === "past_due");
  const trialing = live.filter((sub) => sub.status === "trialing");
  const mrrNzd = billed.reduce((sum, sub) => sum + toNzd(sub.monthly, sub.currency), 0);
  const trialNzd = trialing.reduce((sum, sub) => sum + toNzd(sub.monthly, sub.currency), 0);
  const atRisk = rows.filter((row) => ["high", "medium"].includes(worstRisk(row.risks) ?? ""));
  const atRiskNzd = atRisk.reduce((sum, row) => sum + toNzd(row.sub.monthly, row.sub.currency), 0);
  const allRisks: Array<{ row: (typeof rows)[number]; risk: Risk }> = rows.flatMap((row) => row.risks.map((risk) => ({ row, risk })));

  // --- Money in the last 30 days.
  const since30 = Math.floor(Date.now() / 1000) - 30 * 86_400;
  const invoices30 = stripe.invoices.filter((invoice) => invoice.created >= since30);
  const collectedNzd = invoices30.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + toNzd(invoice.amountPaid, invoice.currency), 0);
  const failedInvoices = stripe.invoices.filter((invoice) => invoice.status === "open" && invoice.attemptCount > 0);
  const customerToProfile = new Map(profiles.filter((profile) => profile.stripe_customer_id).map((profile) => [profile.stripe_customer_id!, profile]));

  // --- The funnel and what visitors do.
  const payingUserIds = new Set(live.map((sub) => sub.userId));
  const funnel = summariseFunnel({
    events: (eventsRes.data ?? []) as EventRow[],
    profiles,
    checkouts: stripe.checkouts.map((checkout) => ({ userId: checkout.userId, status: checkout.status, created: checkout.created, plan: checkout.plan })),
    payingUserIds,
    sinceIso,
  });
  const maxDaily = Math.max(1, ...funnel.daily.map((d) => d.visitors));
  const eventsCapped = (eventsRes.data?.length ?? 0) >= 25000;

  const goalPercent = Math.min(100, Math.round((mrrNzd / MRR_GOAL_NZD) * 1000) / 10);

  return (
    <div className="min-h-screen bg-ink-950 text-paper">
      <header className="sticky top-0 z-30 border-b border-ink-800 bg-ink-950/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-clay-500/40 bg-clay-500/15">
              <ShieldAlert className="h-4 w-4 text-clay-300" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold">StoryLoop command centre</p>
              <p className="truncate font-mono text-[10px] tracking-widest text-ink-400">
                {session.email} · Stripe {stripe.ok ? `read ${new Date(stripe.fetchedAt).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", timeZone: "Pacific/Auckland" })}` : "unavailable"}
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-1.5 text-xs">
            {NAV.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-lg border border-ink-800 px-2.5 py-1.5 text-ink-300 hover:border-clay-500 hover:text-paper">{label}</Link>
            ))}
            <Link href="/admin?fresh=1" className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-2.5 py-1.5 text-ink-200 hover:border-clay-500"><RefreshCcw className="h-3.5 w-3.5" /> Refresh Stripe</Link>
            <Link href="/dashboard" className="rounded-lg bg-clay-600 px-2.5 py-1.5 text-paper hover:bg-clay-500">App</Link>
            <form action="/api/admin/logout" method="POST">
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-lg border border-ink-800 px-2.5 py-1.5 text-ink-400 hover:text-paper"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
            </form>
          </nav>
        </div>
      </header>

      <main className="space-y-5 p-4 sm:p-6">
        {!stripe.ok && (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Stripe could not be read ({stripe.error}). Billing panels below are empty until it can.
          </p>
        )}

        {/* The numbers that matter, at the top. */}
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "MRR, billed", value: nzd(mrrNzd), sub: `${billed.length} paying · ${goalPercent}% of ${nzd(MRR_GOAL_NZD)}` },
            { label: "In trial", value: nzd(trialNzd), sub: `${trialing.length} trials, if all convert` },
            { label: "Collected, 30 days", value: nzd(collectedNzd), sub: `${invoices30.filter((i) => i.status === "paid" && i.amountPaid > 0).length} payments` },
            { label: "MRR at risk", value: nzd(atRiskNzd), sub: `${atRisk.length} customers need attention`, warn: atRisk.length > 0 },
            { label: "Visitor to signup", value: funnel.overall.visitorToSignup != null ? `${funnel.overall.visitorToSignup}%` : "n/a", sub: `${funnel.funnel[0].count} visitors, ${funnel.funnel[3].count} signups (30d)` },
            { label: "Signup to first story", value: funnel.overall.signupToStory != null ? `${funnel.overall.signupToStory}%` : "n/a", sub: `${funnel.overall.signupToCheckout ?? 0}% of signups opened checkout` },
          ].map((kpi) => (
            <div key={kpi.label} className={`rounded-2xl border p-4 ${kpi.warn ? "border-amber-500/40 bg-amber-500/5" : "border-ink-800 bg-ink-900"}`}>
              <p className="text-xs text-ink-400">{kpi.label}</p>
              <p className="mt-1 font-display text-3xl font-bold tabular-nums">{kpi.value}</p>
              <p className="mt-1 text-[11px] text-ink-500">{kpi.sub}</p>
            </div>
          ))}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-800" role="progressbar" aria-valuenow={goalPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the MRR goal">
          <div className="h-full rounded-full bg-gradient-to-r from-clay-500 to-amber-400" style={{ width: `${Math.max(goalPercent, mrrNzd > 0 ? 1 : 0)}%` }} />
        </div>

        <div className="grid gap-5 2xl:grid-cols-[1.2fr_0.8fr]">
          <Panel title="Needs you now" kicker="Billing risk, from Stripe" id="risk">
            {allRisks.filter(({ risk }) => risk.level !== "low").length === 0 ? (
              <p className="text-sm text-ink-400">Nothing urgent. Every paying customer has a working card and no failed payment.</p>
            ) : (
              <ul className="space-y-2">
                {allRisks.filter(({ risk }) => risk.level !== "low").map(({ row, risk }, index) => (
                  <li key={`${row.sub.id}-${risk.code}-${index}`} className={`flex flex-col gap-1 rounded-xl border px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between ${RISK_STYLE[risk.level]}`}>
                    <span>
                      <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
                      <strong className="text-paper">{row.profile?.full_name || row.profile?.email || row.sub.userId}</strong>{" "}
                      <span className="text-ink-400">({getPlanByKey(normalizePlanKey(row.sub.plan)).name}, {sym(row.sub.currency)}{row.sub.monthly}/mo)</span> {risk.text}
                    </span>
                    <span className="flex flex-none gap-2 text-xs">
                      <a href={`https://dashboard.stripe.com/customers/${row.sub.customerId}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">Stripe <ArrowUpRight className="h-3 w-3" /></a>
                      <Link href={`/admin/users/${row.sub.userId}`} className="underline">Account</Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {allRisks.some(({ risk }) => risk.level === "low") && (
              <details className="mt-3 text-sm text-ink-300">
                <summary className="cursor-pointer text-ink-400">Coming up ({allRisks.filter(({ risk }) => risk.level === "low").length})</summary>
                <ul className="mt-2 space-y-1.5">
                  {allRisks.filter(({ risk }) => risk.level === "low").map(({ row, risk }, index) => (
                    <li key={`${row.sub.id}-low-${index}`} className={`rounded-lg border px-3 py-2 ${RISK_STYLE.low}`}>
                      <strong className="text-ink-100">{row.profile?.full_name || row.profile?.email}</strong>: {risk.text}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Panel>

          <Panel title="Money in and out" kicker="Last 30 days" id="money">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-ink-800 p-3"><dt className="text-ink-400">Collected</dt><dd className="font-display text-2xl font-bold tabular-nums">{nzd(collectedNzd)}</dd></div>
              <div className="rounded-xl border border-ink-800 p-3"><dt className="text-ink-400">Failed and unpaid</dt><dd className="font-display text-2xl font-bold tabular-nums text-red-200">{failedInvoices.length}</dd></div>
              <div className="rounded-xl border border-ink-800 p-3"><dt className="text-ink-400">Disputes</dt><dd className="font-display text-2xl font-bold tabular-nums">{stripe.disputes.length}</dd></div>
              <div className="rounded-xl border border-ink-800 p-3"><dt className="text-ink-400">Left Stripe without paying</dt><dd className="font-display text-2xl font-bold tabular-nums">{funnel.abandoned.length}</dd></div>
            </dl>
            {failedInvoices.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm">
                {failedInvoices.map((invoice) => {
                  const who = customerToProfile.get(invoice.customerId);
                  return (
                    <li key={invoice.id} className={`rounded-lg border px-3 py-2 ${RISK_STYLE.high}`}>
                      {who?.full_name || who?.email || invoice.customerId}: {sym(invoice.currency)}{invoice.amountDue} unpaid after {invoice.attemptCount} attempt{invoice.attemptCount === 1 ? "" : "s"}
                      {invoice.nextAttempt ? `, next try ${day(invoice.nextAttempt)}` : ", no more retries"}.
                      {invoice.hostedUrl && <a href={invoice.hostedUrl} target="_blank" rel="noopener noreferrer" className="ml-2 underline">Invoice</a>}
                    </li>
                  );
                })}
              </ul>
            )}
            {stripe.disputes.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm">
                {stripe.disputes.map((dispute) => (
                  <li key={dispute.id} className={`rounded-lg border px-3 py-2 ${RISK_STYLE.high}`}>
                    Dispute {sym(dispute.currency)}{dispute.amount} ({dispute.reason.replace(/_/g, " ")}), {dispute.status.replace(/_/g, " ")}
                    {dispute.dueBy ? `, respond by ${day(dispute.dueBy)}` : ""}.
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title={`Paying and trialing (${rows.length})`} kicker="Every StoryLoop subscription, live from Stripe" id="customers">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-ink-500">
                <tr>
                  {["Customer", "Plan", "Status", "Monthly", "Since", "Next charge", "Card", "Use", "Risk"].map((heading) => (
                    <th key={heading} className="px-2 py-2 font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {rows.map(({ sub, profile, risks }) => {
                  const worst = worstRisk(risks);
                  return (
                    <tr key={sub.id} className="align-top">
                      <td className="px-2 py-2.5">
                        <Link href={`/admin/users/${sub.userId}`} className="font-semibold text-paper hover:underline">{profile?.full_name || "(no name)"}</Link>
                        <p className="text-xs text-ink-400">{profile?.email}</p>
                      </td>
                      <td className="px-2 py-2.5 text-ink-200">
                        {getPlanByKey(normalizePlanKey(sub.plan)).name}
                        {sub.founding && <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">founding</span>}
                        {sub.offer && <span className="ml-1.5 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-200">free month</span>}
                      </td>
                      <td className="px-2 py-2.5"><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[sub.status] ?? "bg-ink-700 text-ink-200"}`}>{sub.status.replace("_", " ")}</span>{sub.facts.cancelAtPeriodEnd && <span className="ml-1 text-xs text-amber-300">cancelling</span>}</td>
                      <td className="px-2 py-2.5 tabular-nums text-ink-100">{sym(sub.currency)}{sub.monthly}</td>
                      <td className="px-2 py-2.5 text-ink-300">{day(sub.created)}</td>
                      <td className="px-2 py-2.5 text-ink-300">{sub.facts.cancelAtPeriodEnd ? "none" : day(sub.status === "trialing" ? sub.facts.trialEnd : sub.facts.periodEnd)}</td>
                      <td className="px-2 py-2.5 text-ink-300">
                        {sub.card ? <span className="inline-flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" />{sub.card.brand} ··{sub.card.last4} {String(sub.card.expMonth).padStart(2, "0")}/{String(sub.card.expYear).slice(-2)}</span> : <span className="text-ink-500">no card</span>}
                      </td>
                      <td className="px-2 py-2.5 text-xs text-ink-300">{profile?.stories_this_month ?? 0} this month<br /><span className="text-ink-500">seen {ago(profile?.last_seen_at)}</span></td>
                      <td className="px-2 py-2.5">
                        {worst ? (
                          <span className={`rounded-full border px-2 py-0.5 text-xs ${RISK_STYLE[worst]}`} title={risks.map((risk) => risk.text).join("\n")}>{worst}</span>
                        ) : (
                          <span className="text-xs text-sage-300">healthy</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={9} className="px-2 py-4 text-ink-400">No live StoryLoop subscriptions{stripe.ok ? "" : " (Stripe unavailable)"}.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-ink-500">{stripe.ignoredForeign} subscriptions on the shared Stripe account belong to other businesses and are left out.</p>
        </Panel>

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="From visit to paying" kicker="Last 30 days" id="funnel">
            <ol className="space-y-2">
              {funnel.funnel.map((step) => {
                const width = funnel.funnel[0].count ? Math.max(1.5, (step.count / funnel.funnel[0].count) * 100) : 0;
                return (
                  <li key={step.key}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-ink-200">{step.label}</span>
                      <span className="tabular-nums text-ink-300">
                        <strong className="text-paper">{step.count}</strong>
                        {step.rateFromPrevious != null && <span className="ml-2 text-xs text-ink-500">{step.rateFromPrevious}% of the step before</span>}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-ink-800"><div className="h-full rounded-full bg-clay-500" style={{ width: `${width}%` }} /></div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-xs text-ink-500">
              {funnel.cancelledAtStripe} sessions came back from Stripe without paying. Visitors are browser sessions; signups and stories come from accounts.
              {eventsCapped ? " Event history was capped at 25,000 rows." : ""}
            </p>
          </Panel>

          <Panel title="Left checkout without paying" kicker="Abandoned carts, from Stripe" id="abandoned">
            {funnel.abandoned.length === 0 ? (
              <p className="text-sm text-ink-400">Nobody in the last 30 days.</p>
            ) : (
              <ul className="divide-y divide-ink-800 text-sm">
                {funnel.abandoned.slice(0, 20).map((checkout) => {
                  const who = byId.get(checkout.userId);
                  return (
                    <li key={`${checkout.userId}-${checkout.created}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                      <span><strong className="text-paper">{who?.full_name || who?.email || checkout.userId}</strong> <span className="text-ink-400">{who?.email}</span></span>
                      <span className="text-ink-300">{getPlanByKey(normalizePlanKey(checkout.plan)).name}, {day(checkout.created)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink-500">Each of these gets the &ldquo;checkout abandoned&rdquo; email once, a day later, with the real terms.</p>
          </Panel>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <Panel title="What visitors click" kicker="Top 25, last 30 days" id="clicks">
            {funnel.clicks.length === 0 ? (
              <p className="text-sm text-ink-400">Click tracking starts with this release. Check back in a day.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="text-ink-500"><tr><th className="py-1">Clicked</th><th className="py-1">Where</th><th className="py-1 text-right">People</th></tr></thead>
                <tbody className="divide-y divide-ink-800">
                  {funnel.clicks.map((click) => (
                    <tr key={`${click.where}-${click.label}`}><td className="py-1.5 pr-2 text-ink-100">{click.label}</td><td className="py-1.5 pr-2 text-ink-400">{click.where}</td><td className="py-1.5 text-right tabular-nums text-ink-200">{click.sessions}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>

          <Panel title="How far they read the homepage" kicker={`${funnel.homeSessions} homepage visits`} id="reading">
            <p className="text-sm text-ink-300">Median time on the homepage: <strong className="text-paper">{funnel.homeSeconds != null ? `${funnel.homeSeconds}s` : "not yet measured"}</strong></p>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {funnel.depth.map((row) => (
                <div key={row.depth} className="rounded-lg border border-ink-800 p-2"><p className="font-display text-xl font-bold tabular-nums">{row.percent ?? 0}%</p><p className="text-[11px] text-ink-500">reached {row.depth}%</p></div>
              ))}
            </div>
            <ul className="mt-4 space-y-1.5">
              {funnel.sections.map((row) => (
                <li key={row.section} className="text-xs">
                  <div className="flex justify-between text-ink-300"><span>{row.section}</span><span className="tabular-nums">{row.percent}%</span></div>
                  <div className="mt-0.5 h-1.5 rounded-full bg-ink-800"><div className="h-full rounded-full bg-sage-500" style={{ width: `${row.percent ?? 0}%` }} /></div>
                </li>
              ))}
              {funnel.sections.length === 0 && <li className="text-sm text-ink-400">Section tracking starts with this release.</li>}
            </ul>
          </Panel>

          <Panel title="Where they come from" kicker="First touch, 30 days" id="sources">
            <table className="w-full text-left text-xs">
              <thead className="text-ink-500"><tr><th className="py-1">Source</th><th className="py-1 text-right">Visitors</th><th className="py-1 text-right">Signups</th><th className="py-1 text-right">Rate</th></tr></thead>
              <tbody className="divide-y divide-ink-800">
                {funnel.sources.map((row) => (
                  <tr key={row.source}><td className="py-1.5 text-ink-100">{row.source}</td><td className="py-1.5 text-right tabular-nums">{row.sessions}</td><td className="py-1.5 text-right tabular-nums">{row.signups}</td><td className="py-1.5 text-right tabular-nums text-ink-300">{row.rate ?? 0}%</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-ink-400">
              Devices: {funnel.devices.map((row) => `${row.device} ${row.sessions} (${row.rate ?? 0}% sign up)`).join(" · ")}
            </p>
            <p className="mt-2 text-xs text-ink-400">Top pages: {funnel.pages.slice(0, 8).map((row) => `${row.path} ${row.sessions}`).join(" · ")}</p>
          </Panel>
        </div>

        <Panel title="Visitors and signups by day" kicker="Last 30 days" id="daily">
          <div className="flex h-32 items-end gap-1" aria-label="Visitors per day, with signups marked">
            {funnel.daily.map((d) => (
              <div key={d.day} className="group relative flex flex-1 flex-col items-center justify-end" title={`${d.day}: ${d.visitors} visitors, ${d.signups} signups`}>
                <div className="w-full rounded-t bg-clay-500/70" style={{ height: `${(d.visitors / maxDaily) * 100}%` }} />
                {d.signups > 0 && <span className="absolute -top-4 text-[10px] font-bold text-sage-300">{d.signups}</span>}
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-500">Bars are visitors; the green numbers above them are signups that day.</p>
        </Panel>

        <Panel title="Pro free for a month" kicker="Email campaign" id="campaign">
          <CampaignPanel />
        </Panel>
      </main>
    </div>
  );
}
