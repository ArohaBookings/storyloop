import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Brain, CheckCircle, LifeBuoy, Sparkles, Clock, BookOpen, TrendingUp, MessageCircleHeart, ClipboardList, Mic } from "lucide-react";
import { getMonthlyStoryLimit, getRemainingStories, getStoryAllowanceLabel } from "@/lib/story-limits";
import { billingStatusLabel, isBillingBlocked, isBillingPastDue } from "@/lib/billing-access";
import { redirect } from "next/navigation";
import { PLAN_DEFINITIONS, normalizePlanKey } from "@/lib/plans";
import { headers } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";
import ReviewPrompt from "@/components/app/ReviewPrompt";
import DashboardInsights, { topCurriculumLinks, type DashboardInsightsData } from "@/components/app/DashboardInsights";
import { PRO_MONTH_OFFER_ID, longDay } from "@/lib/offers";
import TrackOnce from "@/components/analytics/TrackOnce";

/** Stories, and days since the first, before StoryLoop asks for a review. */
const REVIEW_ASK_MIN_STORIES = 4;
const REVIEW_ASK_MIN_DAYS = 3;

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ upgraded?: string; plan?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const params = await searchParams;

  const [{ data: profile }, { data: recentStories, count: totalStories }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, plan, subscription_status, stories_this_month, monthly_story_limit_override, applied_access_code, stripe_customer_id")
      .eq("id", user.id)
      .single(),
    supabase.from("stories").select("id, story_text, outcomes, age_group, child_name, created_at", { count: "exact" })
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
  ]);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const plan = profile?.plan ?? "free";
  const used = profile?.stories_this_month ?? 0;
  const limit = getMonthlyStoryLimit(profile ?? {});
  const remaining = getRemainingStories(profile ?? {});
  const allowanceLabel = getStoryAllowanceLabel(profile ?? {});
  const billingBlocked = isBillingBlocked(profile ?? {});
  const billingPastDue = isBillingPastDue(profile ?? {});
  const upgraded = params?.upgraded === "true";
  // A centre that has just started its free month has bought nothing yet, and
  // its next step is its team, not its billing.
  const startedCentre = upgraded && (params?.plan === "centre_starter" || params?.plan === "centre_growth");

  // Whether to ask for a review: a few stories over a few days, never asked
  // of somebody who has already left one, and never of an internal account.
  // Best effort: any failure just means no ask today.
  let askForReview = false;
  if ((totalStories ?? 0) >= REVIEW_ASK_MIN_STORIES) {
    try {
      const admin = createAdminSupabase();
      const [{ data: firstStory }, { count: reviewCount, error: reviewError }, { data: internal }] = await Promise.all([
        admin.from("stories").select("created_at").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle(),
        admin.from("reviews").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        admin.from("profiles").select("is_internal").eq("id", user.id).maybeSingle(),
      ]);
      const firstAt = firstStory?.created_at ? new Date(firstStory.created_at).getTime() : Date.now();
      askForReview =
        !reviewError &&
        (reviewCount ?? 0) === 0 &&
        !internal?.is_internal &&
        Date.now() - firstAt >= REVIEW_ASK_MIN_DAYS * 86_400_000;
    } catch {
      askForReview = false;
    }
  }

  // This month in numbers, and a free month if one is waiting. Best effort:
  // any failure shows the panel with what could be read.
  const insights: DashboardInsightsData = { storiesThisMonth: used, childrenTotal: 0, childrenWithStory: 0, topLinks: [], offer: null };
  try {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [{ data: recent }, { count: childCount }] = await Promise.all([
      supabase.from("stories").select("child_id, outcomes").eq("user_id", user.id).gte("created_at", since).limit(1000),
      supabase.from("child_profiles").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    insights.childrenTotal = childCount ?? 0;
    insights.childrenWithStory = new Set((recent ?? []).map((row) => row.child_id).filter(Boolean)).size;
    insights.topLinks = topCurriculumLinks((recent ?? []).map((row) => row.outcomes as string[] | null));
    if (plan === "free") {
      const { data: grant } = await createAdminSupabase()
        .from("offer_grants")
        .select("expires_at, redeemed_at")
        .eq("user_id", user.id)
        .eq("offer_id", PRO_MONTH_OFFER_ID)
        .maybeSingle();
      if (grant && !grant.redeemed_at && Date.parse(grant.expires_at) > Date.now()) {
        insights.offer = {
          claimBy: longDay(new Date(grant.expires_at)),
        };
      }
    }
  } catch (error) {
    console.error("Dashboard insights skipped:", error);
  }

  // The greeting in the educator's own time. This used the server's clock,
  // which runs on UTC: a kaiako opening StoryLoop at 9am in Auckland was
  // greeted "Good evening". Vercel sends the visitor's time zone.
  const requestHeaders = await headers();
  const timeZone = requestHeaders.get("x-vercel-ip-timezone") || "Pacific/Auckland";
  const localHour = (() => {
    try {
      return Number(new Intl.DateTimeFormat("en-NZ", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
    } catch {
      return Number(new Intl.DateTimeFormat("en-NZ", { hour: "numeric", hourCycle: "h23", timeZone: "Pacific/Auckland" }).format(new Date()));
    }
  })();
  const greeting = (() => {
    const h = localHour;
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      {upgraded && <TrackOnce event="checkout_success_view" metadata={{ plan: params?.plan }} />}
      {startedCentre && (
        <div className="mb-6 rounded-3xl border border-sage-200 bg-gradient-to-br from-sage-50 via-white to-cream-50 p-5 shadow-warm animate-fade-up" data-testid="centre-started">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-sage-600 text-paper">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">Your centre&apos;s free month has started.</h2>
                <p className="mt-1 text-base text-ink-600">
                  Next, name your centre and invite your team. It takes a couple of minutes, and nothing is charged
                  unless you add a card before the month ends.
                </p>
              </div>
            </div>
            <Link href="/centre" className="btn-primary flex-shrink-0">
              Set up my centre <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {upgraded && !startedCentre && (
        <div className="mb-6 rounded-3xl border border-sage-200 bg-gradient-to-br from-sage-50 via-white to-cream-50 p-5 shadow-warm animate-fade-up">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-sage-600 text-paper">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="section-title mb-1">Purchase confirmed</p>
                <h2 className="font-display text-2xl font-bold text-ink-900">Thanks for choosing StoryLoop.</h2>
                <p className="mt-1 text-sm text-ink-600">
                  Your subscription is handled securely by Stripe. You can manage billing anytime from Billing & plan.
                </p>
              </div>
            </div>
            <Link href="/billing" className="btn-secondary flex-shrink-0">
              Manage billing <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {(billingBlocked || billingPastDue) && (
        <div className={`mb-6 rounded-3xl border p-5 shadow-soft ${billingBlocked ? "border-red-100 bg-red-50" : "border-amber-100 bg-amber-50"}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className={`mt-1 h-5 w-5 flex-shrink-0 ${billingBlocked ? "text-red-700" : "text-amber-700"}`} />
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${billingBlocked ? "text-red-700" : "text-amber-700"}`}>
                  {billingStatusLabel(profile?.subscription_status)}
                </p>
                <p className="mt-1 text-sm text-ink-700">
                  {billingBlocked
                    ? "Payment is needed before creating new stories. Your saved history stays available."
                    : "Stripe is retrying payment. You can keep using StoryLoop during this grace period."}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/billing" className="btn-primary">
                {billingBlocked ? "Fix payment" : "Review billing"}
              </Link>
              <Link href="/support" className="btn-secondary">
                <LifeBuoy className="h-4 w-4" /> Support
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <p className="section-title mb-2">{greeting}</p>
        <h1 className="font-display text-4xl font-bold text-ink-900">Hi {firstName}. Ready to write?</h1>
        <p className="text-ink-600 mt-1">Turn real observations into editable learning story drafts with your educator judgement still at the centre.</p>
      </div>

      {/* Quick action — first-run onboarding for new educators, compact CTA for returning */}
      {(totalStories ?? 0) === 0 ? (
        <div className="card-warm animate-fade-up-1 p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-warm-mesh pointer-events-none" />
          <div className="relative z-10">
            <p className="section-title mb-2">Welcome to StoryLoop</p>
            <h2 className="font-display text-3xl font-bold text-ink-900 mb-2">Let&apos;s write your first learning story.</h2>
            <p className="text-sm text-ink-600 mb-6 max-w-2xl leading-relaxed">
              Most educators have a finished draft in under a minute. Capture a real moment any way you like.
              StoryLoop shapes the first draft, and your judgement stays at the centre.
            </p>
            <div className="grid gap-3 sm:grid-cols-3 mb-6">
              {[
                { icon: Mic, t: "1 · Capture the moment", d: "Voice note, bullet points or a quick braindump. No formal structure needed." },
                { icon: Sparkles, t: "2 · StoryLoop drafts it", d: "A warm, evidence-led draft with curriculum links, dispositions, and next steps." },
                { icon: CheckCircle, t: "3 · You review & share", d: "Edit in your own voice, run the checks, then send to families." },
              ].map(({ icon: StepIcon, t, d }) => (
                <div key={t} className="rounded-2xl border border-clay-100 bg-white/70 p-4">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-clay-700 text-paper">
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-bold text-ink-900">{t}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-600">{d}</p>
                </div>
              ))}
            </div>
            <Link href="/generate" className="btn-primary text-base">
              <Sparkles className="h-4 w-4" /> Write my first story
            </Link>
            {plan === "free" && <p className="mt-3 text-sm text-ink-500">The free plan includes 3 stories a month, no card needed.</p>}
          </div>
        </div>
      ) : (
        <div className="card-warm animate-fade-up-1 p-8 mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-warm-mesh pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink-900 mb-1">Start a new story</h2>
              <p className="text-sm text-ink-600">Voice note, bullet points, or a messy braindump. StoryLoop will shape a first draft you can review.</p>
            </div>
            <Link href="/generate" className="btn-primary text-base whitespace-nowrap">
              <Sparkles className="w-4 h-4" /> New story
            </Link>
          </div>
        </div>
      )}

      {(totalStories ?? 0) > 0 && <DashboardInsights data={insights} />}
      {(totalStories ?? 0) === 0 && insights.offer && <DashboardInsights data={{ ...insights, storiesThisMonth: 0 }} />}

      {/* Stats */}
      <div className="animate-fade-up-2 grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Stories this month",
            value: used,
            icon: BookOpen,
            sub: limit === null ? "Unlimited" : `${remaining ?? 0} left · ${allowanceLabel}`,
          },
          { label: "Total stories", value: totalStories ?? 0, icon: TrendingUp, sub: "Lifetime" },
          {
            label: "Current plan",
            // The plan's real name. This used to print the database key, so
            // an Educator Pro subscriber read "Educator_pro".
            value: PLAN_DEFINITIONS.find((definition) => definition.key === normalizePlanKey(plan))?.name ?? "Free",
            icon: Clock,
            sub: profile?.applied_access_code
              ? `${profile.applied_access_code.toUpperCase()} complimentary access`
              : plan === "free"
                ? "Upgrade for more"
                : "Active",
          },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-cream-100 border border-clay-200 flex items-center justify-center">
                <Icon className="w-4 h-4 text-clay-700" />
              </div>
            </div>
            <p className="font-display text-3xl font-bold text-ink-900">{value}</p>
            <p className="text-xs text-ink-500 mt-0.5">{label}</p>
            <p className="text-xs text-clay-600 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {plan === "free" && (
        <div className="mb-8 rounded-3xl border border-clay-200 bg-gradient-to-br from-cream-100 via-white to-sage-50 p-5 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="section-title mb-2">Upgrade only when it helps</p>
              <h2 className="font-display text-2xl font-bold text-ink-900">Paid plans unlock the work after the story.</h2>
              <div className="mt-3 grid gap-2 text-sm text-ink-600 sm:grid-cols-3">
                <p className="rounded-2xl bg-white/70 p-3"><MessageCircleHeart className="mb-2 h-4 w-4 text-clay-700" />Family messages, captions, and home questions.</p>
                <p className="rounded-2xl bg-white/70 p-3"><ClipboardList className="mb-2 h-4 w-4 text-clay-700" />Backlog Rescue for a week of messy notes.</p>
                <p className="rounded-2xl bg-white/70 p-3"><Brain className="mb-2 h-4 w-4 text-clay-700" />Learning threads and planning signals.</p>
              </div>
            </div>
            <Link href="/billing?offer=activation" className="btn-primary flex-shrink-0">
              See plan features <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Recent stories */}
      {(totalStories ?? 0) >= 2 && (
        <div className="mb-8 rounded-3xl border border-sage-200 bg-gradient-to-br from-sage-50 via-white to-cream-50 p-6 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-sage-700 text-paper">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <p className="section-title mb-1">Your practice memory is forming</p>
                <h2 className="font-display text-2xl font-bold text-ink-900">See learning across stories, not only one moment.</h2>
                <p className="mt-1 text-sm text-ink-600">
                  Learning Threads highlights recurring dispositions, curriculum patterns, and responses worth revisiting.
                </p>
              </div>
            </div>
            <Link href="/insights" className="btn-secondary flex-shrink-0">
              View learning threads <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {askForReview && <ReviewPrompt />}

      <div className="card animate-fade-up-3 overflow-hidden">
        <div className="px-6 py-4 border-b border-clay-100 flex items-center justify-between">
          <h2 className="font-display font-bold text-ink-900">Recent stories</h2>
          <Link href="/history" className="text-sm text-clay-700 hover:text-clay-900 font-semibold">View all →</Link>
        </div>
        {!recentStories?.length ? (
          <div className="p-14 text-center">
            <BookOpen className="w-12 h-12 text-clay-300 mx-auto mb-4" />
            <p className="font-display text-lg font-bold text-ink-900 mb-1">No stories yet</p>
            <p className="text-sm text-ink-500 mb-5">Write your first learning story draft.</p>
            <Link href="/generate" className="btn-primary"><Sparkles className="w-4 h-4" /> Write first story</Link>
          </div>
        ) : (
          <div className="divide-y divide-clay-50">
            {recentStories.map(s => (
              <Link key={s.id} href={`/history`} className="block px-6 py-4 hover:bg-cream-50 transition-colors">
                <div className="flex items-center justify-between gap-4 mb-1">
                  <p className="text-sm font-semibold text-ink-900">
                    {s.child_name ?? "Learning story"} {s.age_group && <span className="text-xs text-ink-500 font-normal">· {s.age_group}</span>}
                  </p>
                  <span className="text-xs text-ink-400 flex-shrink-0">{new Date(s.created_at).toLocaleDateString("en-AU")}</span>
                </div>
                <p className="text-sm text-ink-600 line-clamp-2">{s.story_text?.slice(0, 180)}...</p>
                {s.outcomes?.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {s.outcomes.slice(0, 3).map((o: string) => (
                      <span key={o} className="text-xs font-mono bg-cream-100 text-clay-700 px-2 py-0.5 rounded-full">{o}</span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
