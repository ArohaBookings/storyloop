import OpenAI from "openai";
import { Resend } from "resend";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { loadStripeSubscriptions, audToNzdRate } from "@/lib/stripe-mrr";
import { MRR_GOAL_NZD, computeMrr, goalProgress, mrrMovement } from "@/lib/mrr";
import { autoWritableTopics, rivalNames } from "@/lib/blog-topics";
import { getRuntimeSecret } from "@/lib/runtime-secrets";
import { EMAIL_FROM, SITE_URL } from "@/lib/email/config";
import { isMarketing } from "@/lib/email/brain";
import type { LifecycleEmailType } from "@/lib/email/templates";

/**
 * The business manager (3 Nov 2026). Leo: use AI "like a business manager
 * working for me… see how we're tracking, see our Google SEO, AEO, Geo, Bing,
 * see how many people are going through Facebook, get a rundown of
 * everything, see if we're on target for earnings. And then it can do 1 to 2
 * blog posts a week… aiming to 8% growth rate on SEO per week… be smart on the
 * ai calls… don't call any more than people are using stories."
 *
 * Everything that can be counted is counted here in code, from StoryLoop's own
 * records: first-party visits by where they came from, signups, stories, Stripe
 * and email. The model is asked once a week to read those numbers and say what
 * matters; it is given counts only, never anything about a child, a family or
 * an educator. With no key, or if the call fails or says something unusable,
 * the same report goes out with a plain summary written by code.
 *
 * It also sets the blog's pace (app/api/cron/blog): two guides a week while
 * search visits are growing slower than the 8% target, one when on target.
 */

export const SEARCH_GROWTH_TARGET = 0.08;
export const REPORT_ACTION = "weekly_business_report";
const DAY = 86_400_000;
const MANAGER_MODEL = process.env.OPENAI_MANAGER_MODEL?.trim() || "gpt-5.4-mini";

export type Channel = "google" | "bing" | "other_search" | "ai" | "facebook" | "email" | "ads" | "direct" | "other";
export const SEARCH_CHANNELS: Channel[] = ["google", "bing", "other_search"];

/** Where a visit came from, from its referrer and campaign tags. Pure. */
export function channelFor(referrerHost: string | null | undefined, utmSource?: string | null, utmMedium?: string | null): Channel {
  const host = (referrerHost ?? "").toLowerCase().replace(/^www\./, "");
  const source = (utmSource ?? "").toLowerCase();
  const medium = (utmMedium ?? "").toLowerCase();
  if (["cpc", "ppc", "paid", "paid_social", "paidsocial"].includes(medium)) return "ads";
  if (medium === "email" || ["email", "resend", "newsletter"].includes(source)) return "email";
  if (/^(chatgpt\.com|chat\.openai\.com|perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com|claude\.ai|you\.com)$/.test(host)) return "ai";
  if (/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|copilot|gemini|claude\.ai)/.test(source)) return "ai";
  if (/(^|\.)(facebook\.com|fb\.com|instagram\.com|threads\.net|messenger\.com)$/.test(host) || ["facebook", "fb", "instagram", "ig", "meta"].includes(source)) return "facebook";
  if (/(^|\.)google\.[a-z.]+$/.test(host) || host === "com.google.android.googlequicksearchbox") return "google";
  if (/(^|\.)bing\.com$/.test(host)) return "bing";
  if (/(^|\.)(search\.yahoo\.com|yahoo\.com|duckduckgo\.com|ecosia\.org|search\.brave\.com|yandex\.[a-z]+|startpage\.com|qwant\.com)$/.test(host)) return "other_search";
  if (!host || host === "storyloop.space") return source === "google" ? "google" : "direct";
  return "other";
}

/** This week against last, as a fraction; null when last week is too small to mean anything. Pure. */
export function weeklyGrowth(thisWeek: number, lastWeek: number, minimumBase = 10): number | null {
  if (!Number.isFinite(thisWeek) || !Number.isFinite(lastWeek) || lastWeek < minimumBase) return null;
  return thisWeek / lastWeek - 1;
}

/** Four weeks against the four before, as an average weekly rate, which one noisy week cannot swing. Pure. */
export function trendWeeklyGrowth(last28: number, previous28: number, minimumBase = 20): number | null {
  if (!Number.isFinite(last28) || !Number.isFinite(previous28) || previous28 < minimumBase || last28 <= 0) return null;
  return Math.pow(last28 / previous28, 1 / 4) - 1;
}

/** The weekly MRR growth that reaches the goal in a year from today's MRR. Pure. */
export function requiredWeeklyGrowth(mrrNzd: number, goalNzd = MRR_GOAL_NZD, weeks = 52): number | null {
  if (!(mrrNzd > 0)) return null;
  if (mrrNzd >= goalNzd) return 0;
  return Math.pow(goalNzd / mrrNzd, 1 / weeks) - 1;
}

/**
 * How many guides to publish this week: two while search is growing slower
 * than the target (or there is not yet enough data to say), one when it is on
 * target, none when the backlog is empty. Pure.
 */
export function blogPostsTarget(input: { searchGrowth: number | null; topicsLeft: number }): 0 | 1 | 2 {
  if (input.topicsLeft <= 0) return 0;
  const behind = input.searchGrowth === null || input.searchGrowth < SEARCH_GROWTH_TARGET;
  return behind && input.topicsLeft >= 2 ? 2 : 1;
}

export type ChannelCounts = Record<Channel, number>;
const emptyCounts = (): ChannelCounts => ({ google: 0, bing: 0, other_search: 0, ai: 0, facebook: 0, email: 0, ads: 0, direct: 0, other: 0 });
export const searchTotal = (counts: ChannelCounts) => SEARCH_CHANNELS.reduce((sum, channel) => sum + counts[channel], 0);

export type WeeklyMetrics = {
  weekEnding: string;
  visits: { thisWeek: ChannelCounts; lastWeek: ChannelCounts; last28: ChannelCounts; previous28: ChannelCounts };
  search: { thisWeek: number; lastWeek: number; weeklyGrowth: number | null; trendWeeklyGrowth: number | null; target: number; onTarget: boolean | null };
  signups: { thisWeek: number; lastWeek: number; bySource: Partial<ChannelCounts> };
  firstStories: number;
  stories: { thisWeek: number; lastWeek: number };
  revenue: { ready: boolean; mrrNzd: number | null; trialingNzd: number | null; payers: number | null; trialing: number | null; wonThisWeek: number | null; lostThisWeek: number | null; goalNzd: number; goalPercent: number | null; requiredWeeklyGrowth: number | null };
  email: { marketingSent: number; billingSent: number; clicked: number; unsubscribed: number };
  blog: { publishedThisWeek: number; topicsLeft: number; targetNextWeek: 0 | 1 | 2 };
  aiCalls: { storiesThisWeek: number; managerCallsThisWeek: number };
};

/** Every row of a select, a thousand at a time (the API's page size), up to a ceiling. */
async function allRows<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>, ceiling = 20_000): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < ceiling; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

type VisitRow = { session_id: string | null; referrer_host: string | null; utm_source: string | null; utm_medium: string | null; created_at: string };

/** Counts StoryLoop's week from its own records. Read-only. */
export async function collectWeeklyMetrics(now = new Date()): Promise<WeeklyMetrics> {
  const sb = createAdminSupabase();
  const t = now.getTime();
  const iso = (daysBack: number) => new Date(t - daysBack * DAY).toISOString();

  // Visits: the first page a session opened says where it came from.
  const views = await allRows<VisitRow>((from, to) =>
    sb.from("page_events").select("session_id, referrer_host, utm_source, utm_medium, created_at")
      .eq("event_type", "page_view").gte("created_at", iso(56)).order("created_at", { ascending: true }).range(from, to));
  const firstBySession = new Map<string, VisitRow>();
  for (const row of views) if (row.session_id && !firstBySession.has(row.session_id)) firstBySession.set(row.session_id, row);
  const visits = { thisWeek: emptyCounts(), lastWeek: emptyCounts(), last28: emptyCounts(), previous28: emptyCounts() };
  for (const row of firstBySession.values()) {
    const age = (t - Date.parse(row.created_at)) / DAY;
    const channel = channelFor(row.referrer_host, row.utm_source, row.utm_medium);
    if (age < 7) visits.thisWeek[channel] += 1;
    else if (age < 14) visits.lastWeek[channel] += 1;
    if (age < 28) visits.last28[channel] += 1;
    else if (age < 56) visits.previous28[channel] += 1;
  }
  const searchThis = searchTotal(visits.thisWeek);
  const searchLast = searchTotal(visits.lastWeek);
  const trend = trendWeeklyGrowth(searchTotal(visits.last28), searchTotal(visits.previous28));
  const week = weeklyGrowth(searchThis, searchLast);
  // The four-week trend decides "on target"; one week alone is too noisy.
  const growthForTarget = trend ?? week;

  const [signupRows, firstStoryCount, storiesThis, storiesLast, emailRows, unsubCount, blogRows, reports] = await Promise.all([
    allRows<{ created_at: string; signup_source: string | null; signup_referrer_host: string | null; signup_campaign: string | null; is_internal: boolean | null }>((from, to) =>
      sb.from("profiles").select("created_at, signup_source, signup_referrer_host, signup_campaign, is_internal").gte("created_at", iso(14)).range(from, to)),
    sb.from("profiles").select("id", { count: "exact", head: true }).gte("first_story_created_at", iso(7)).or("is_internal.is.null,is_internal.eq.false"),
    sb.from("stories").select("id", { count: "exact", head: true }).gte("created_at", iso(7)),
    sb.from("stories").select("id", { count: "exact", head: true }).gte("created_at", iso(14)).lt("created_at", iso(7)),
    allRows<{ email_type: LifecycleEmailType; clicked_at: string | null }>((from, to) =>
      sb.from("email_events").select("email_type, clicked_at").eq("delivery_status", "sent").gte("sent_at", iso(7)).range(from, to)),
    sb.from("email_unsubscribes").select("email", { count: "exact", head: true }).gte("created_at", iso(7)),
    sb.from("blog_posts").select("slug, published, published_at"),
    sb.from("admin_audit_log").select("details, created_at").eq("action", REPORT_ACTION).gte("created_at", iso(8)),
  ]);

  const signups = { thisWeek: 0, lastWeek: 0, bySource: {} as Partial<ChannelCounts> };
  for (const row of signupRows) {
    if (row.is_internal) continue;
    const age = (t - Date.parse(row.created_at)) / DAY;
    if (age < 7) {
      signups.thisWeek += 1;
      const channel = channelFor(row.signup_referrer_host ?? row.signup_source, row.signup_source, null);
      signups.bySource[channel] = (signups.bySource[channel] ?? 0) + 1;
    } else {
      signups.lastWeek += 1;
    }
  }

  // Revenue from Stripe itself, StoryLoop's subscriptions only (lib/mrr.ts).
  let revenue: WeeklyMetrics["revenue"] = { ready: false, mrrNzd: null, trialingNzd: null, payers: null, trialing: null, wonThisWeek: null, lostThisWeek: null, goalNzd: MRR_GOAL_NZD, goalPercent: null, requiredWeeklyGrowth: null };
  try {
    const stripeData = await loadStripeSubscriptions();
    if (!stripeData.error) {
      const ids = [...new Set(stripeData.subscriptions.map((s) => s.metadata?.user_id).filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)))];
      const storyLoopUserIds = new Set<string>();
      for (let index = 0; index < ids.length; index += 200) {
        const { data: rows } = await sb.from("profiles").select("id, is_internal").in("id", ids.slice(index, index + 200));
        for (const row of rows ?? []) if (!row.is_internal) storyLoopUserIds.add(row.id);
      }
      const rate = audToNzdRate();
      const mrr = computeMrr(stripeData.subscriptions, { storyLoopUserIds, audToNzd: rate });
      const moved = mrrMovement(stripeData.subscriptions, { storyLoopUserIds, sinceSeconds: Math.floor(t / 1000) - 7 * 86_400, audToNzd: rate });
      revenue = {
        ready: true,
        mrrNzd: Math.round(mrr.activeNzd * 100) / 100,
        trialingNzd: Math.round(mrr.trialingNzd * 100) / 100,
        payers: mrr.activeCustomers,
        trialing: mrr.trialingCustomers,
        wonThisWeek: moved.won,
        lostThisWeek: moved.lost,
        goalNzd: MRR_GOAL_NZD,
        goalPercent: goalProgress(mrr.activeNzd).percent,
        requiredWeeklyGrowth: requiredWeeklyGrowth(mrr.activeNzd),
      };
    }
  } catch (error) {
    console.error("Business manager: Stripe read failed", error);
  }

  const emails = { marketingSent: 0, billingSent: 0, clicked: 0, unsubscribed: unsubCount.count ?? 0 };
  for (const row of emailRows) {
    if (isMarketing(row.email_type)) emails.marketingSent += 1;
    else emails.billingSent += 1;
    if (row.clicked_at) emails.clicked += 1;
  }

  const posts = (blogRows.data ?? []) as Array<{ slug: string; published: boolean; published_at: string | null }>;
  const topicsLeft = autoWritableTopics(posts.map((p) => p.slug)).length;
  const publishedThisWeek = posts.filter((p) => p.published && p.published_at && t - Date.parse(p.published_at) < 7 * DAY).length;

  return {
    weekEnding: now.toISOString().slice(0, 10),
    visits,
    search: {
      thisWeek: searchThis,
      lastWeek: searchLast,
      weeklyGrowth: week,
      trendWeeklyGrowth: trend,
      target: SEARCH_GROWTH_TARGET,
      onTarget: growthForTarget === null ? null : growthForTarget >= SEARCH_GROWTH_TARGET,
    },
    signups,
    firstStories: firstStoryCount.count ?? 0,
    stories: { thisWeek: storiesThis.count ?? 0, lastWeek: storiesLast.count ?? 0 },
    revenue,
    email: emails,
    blog: { publishedThisWeek, topicsLeft, targetNextWeek: blogPostsTarget({ searchGrowth: growthForTarget, topicsLeft }) },
    aiCalls: { storiesThisWeek: storiesThis.count ?? 0, managerCallsThisWeek: (reports.data ?? []).filter((r) => (r.details as { ai?: { used?: boolean } } | null)?.ai?.used).length },
  };
}

const pct = (value: number | null | undefined) => (value === null || value === undefined ? "not enough data yet" : `${value >= 0 ? "+" : ""}${Math.round(value * 1000) / 10}%`);
const money = (value: number | null | undefined) => (value === null || value === undefined ? "unknown" : `NZ$${value.toLocaleString("en-NZ", { maximumFractionDigits: 2 })}`);

export type Rundown = { headline: string; summary: string; actions: string[] };

/** The rundown written by code, used when the model is unavailable. Pure. */
export function plainRundown(m: WeeklyMetrics): Rundown {
  const searchLine = `Search visits ${m.search.thisWeek} this week against ${m.search.lastWeek} last week (${pct(m.search.weeklyGrowth)}; four-week trend ${pct(m.search.trendWeeklyGrowth)} a week, target +8%).`;
  const ai = m.visits.thisWeek.ai;
  const fb = m.visits.thisWeek.facebook;
  const revenueLine = m.revenue.ready
    ? `MRR ${money(m.revenue.mrrNzd)} from ${m.revenue.payers} payers, ${m.revenue.trialing} on trial; ${m.revenue.wonThisWeek} new and ${m.revenue.lostThisWeek} lost this week. ${m.revenue.goalPercent}% of the NZ$10k goal.`
    : "Stripe could not be read this week, so revenue is not included.";
  const actions: string[] = [];
  if (m.search.onTarget === false) actions.push("Search is behind the 8% target: two guides go out this week, and the newest pages should be submitted for indexing.");
  if (m.signups.thisWeek > 0 && m.firstStories < m.signups.thisWeek) actions.push(`${m.signups.thisWeek - m.firstStories} of this week's signups have not written a first story yet; the getting-started emails will reach them.`);
  if (m.blog.topicsLeft < 4) actions.push(`Only ${m.blog.topicsLeft} guide topics are left in the backlog: add more before it runs out.`);
  if (!actions.length) actions.push("Nothing urgent: keep the pages and posts going.");
  return {
    headline: m.search.onTarget === false ? "Search is behind the 8% target" : m.search.onTarget ? "Search is on target" : "Not enough search data yet to call the target",
    summary: [searchLine, `Google ${m.visits.thisWeek.google}, Bing ${m.visits.thisWeek.bing}, AI assistants ${ai}, Facebook ${fb}.`, `Signups ${m.signups.thisWeek} (last week ${m.signups.lastWeek}); first stories ${m.firstStories}; stories written ${m.stories.thisWeek}.`, revenueLine].join(" "),
    actions: actions.slice(0, 3),
  };
}

const MANAGER_PROMPT = `You are the business manager for StoryLoop, a small New Zealand app that turns an early childhood educator's rough observation notes into learning stories. You report to Leo, the founder, once a week.

You are given this week's numbers as JSON. Write a short, blunt rundown Leo can read in thirty seconds.

RULES
- Use only the numbers given. Never invent a number, a cause you cannot see in the data, or a competitor.
- Say plainly whether search is on the +8% a week target (use the four-week trend when it exists) and whether revenue is on track for the NZ$10k MRR goal (compare actual movement to requiredWeeklyGrowth).
- Name the channels: Google, Bing, AI assistants (AEO/GEO), Facebook, direct.
- At most three actions, each one concrete and doable this week by one person. No paid tools.
- Plain New Zealand English. No em dashes or en dashes. No hype words.

Return JSON: {"headline": string (max 90 characters), "summary": string (max 700 characters), "actions": [string, string, string] (each max 180 characters)}`;

/** Cleans and checks the model's rundown; null when it is unusable. Pure. */
export function cleanRundown(raw: string): Rundown | null {
  try {
    const parsed = JSON.parse(raw) as { headline?: unknown; summary?: unknown; actions?: unknown };
    const scrub = (value: unknown, max: number) => String(value ?? "").replace(/\s*[–—]\s*/g, ", ").replace(/\s+/g, " ").trim().slice(0, max);
    const headline = scrub(parsed.headline, 120);
    const summary = scrub(parsed.summary, 900);
    const actions = (Array.isArray(parsed.actions) ? parsed.actions : []).map((a) => scrub(a, 220)).filter(Boolean).slice(0, 3);
    if (headline.length < 8 || summary.length < 40 || !actions.length) return null;
    // StoryLoop's own reports never name another product either.
    if (rivalNames([headline, summary, ...actions].join(" ")).length) return null;
    return { headline, summary, actions };
  } catch {
    return null;
  }
}

/** One model call: the numbers in, a rundown out. Null on any failure. */
async function writeRundown(m: WeeklyMetrics): Promise<{ rundown: Rundown; model: string } | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45_000, maxRetries: 0 });
    const params = {
      model: MANAGER_MODEL,
      max_completion_tokens: 2500,
      reasoning_effort: "low",
      response_format: { type: "json_object" as const },
      messages: [
        { role: "system" as const, content: MANAGER_PROMPT },
        { role: "user" as const, content: JSON.stringify(m) },
      ],
    };
    const res = await client.chat.completions.create(params as Parameters<typeof client.chat.completions.create>[0]);
    const content = "choices" in res ? res.choices[0]?.message?.content ?? "" : "";
    const rundown = cleanRundown(content);
    return rundown ? { rundown, model: MANAGER_MODEL } : null;
  } catch (error) {
    console.error("Business manager: rundown call failed", error);
    return null;
  }
}

export type WeeklyReport = { weekEnding: string; metrics: WeeklyMetrics; rundown: Rundown; ai: { used: boolean; model: string | null }; emailed: boolean };

/** The latest stored report, or null. */
export async function latestReport(): Promise<(WeeklyReport & { createdAt: string }) | null> {
  const { data } = await createAdminSupabase().from("admin_audit_log").select("details, created_at").eq("action", REPORT_ACTION).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data?.details) return null;
  return { ...(data.details as WeeklyReport), createdAt: data.created_at as string };
}

function reportEmail(report: WeeklyReport) {
  const m = report.metrics;
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
  const rows: Array<[string, string]> = [
    ["Search visits (Google, Bing, others)", `${m.search.thisWeek} (last week ${m.search.lastWeek}, ${pct(m.search.weeklyGrowth)})`],
    ["Four-week search trend", `${pct(m.search.trendWeeklyGrowth)} a week (target +8%)`],
    ["Google / Bing / AI assistants / Facebook", `${m.visits.thisWeek.google} / ${m.visits.thisWeek.bing} / ${m.visits.thisWeek.ai} / ${m.visits.thisWeek.facebook}`],
    ["Signups", `${m.signups.thisWeek} (last week ${m.signups.lastWeek})`],
    ["First stories / stories written", `${m.firstStories} / ${m.stories.thisWeek}`],
    ["MRR", m.revenue.ready ? `${money(m.revenue.mrrNzd)}, ${m.revenue.payers} payers, ${m.revenue.trialing} trialing (${m.revenue.goalPercent}% of NZ$10k)` : "Stripe not read"],
    ["Email", `${m.email.marketingSent} campaign, ${m.email.billingSent} account, ${m.email.clicked} clicked, ${m.email.unsubscribed} unsubscribed`],
    ["Guides", `${m.blog.publishedThisWeek} published, ${m.blog.topicsLeft} topics left, ${m.blog.targetNextWeek} planned next week`],
  ];
  const subject = `StoryLoop week to ${m.weekEnding}: ${report.rundown.headline}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#2f2925;max-width:620px;"><h2 style="margin:0 0 8px;">${esc(report.rundown.headline)}</h2><p>${esc(report.rundown.summary)}</p><ol>${report.rundown.actions.map((a) => `<li>${esc(a)}</li>`).join("")}</ol><table style="border-collapse:collapse;width:100%;font-size:14px;">${rows.map(([k, v]) => `<tr><td style="padding:6px 8px;border-top:1px solid #eee;color:#6f6660;">${esc(k)}</td><td style="padding:6px 8px;border-top:1px solid #eee;">${esc(v)}</td></tr>`).join("")}</table><p style="font-size:12px;color:#6f6660;">${report.ai.used ? `Written by ${esc(report.ai.model ?? "the model")} from the numbers above.` : "Written by code: the model was not used this week."} Full history: ${SITE_URL}/admin/manager</p></div>`;
  const text = [report.rundown.headline, "", report.rundown.summary, "", ...report.rundown.actions.map((a, i) => `${i + 1}. ${a}`), "", ...rows.map(([k, v]) => `${k}: ${v}`), "", `${SITE_URL}/admin/manager`].join("\n");
  return { subject, html, text };
}

/**
 * The weekly run: count, write the rundown (one model call at most), store it,
 * and email it to Leo. Once per week ending; a repeat run returns the stored one.
 */
export async function runWeeklyReport(options: { now?: Date; force?: boolean; dryRun?: boolean } = {}) {
  const now = options.now ?? new Date();
  const metrics = await collectWeeklyMetrics(now);
  if (options.dryRun) return { dryRun: true as const, metrics, rundown: plainRundown(metrics) };

  const sb = createAdminSupabase();
  if (!options.force) {
    const { data: existing } = await sb.from("admin_audit_log").select("id").eq("action", REPORT_ACTION).eq("target_id", metrics.weekEnding).limit(1);
    if (existing?.length) return { skipped: true as const, reason: `already reported for ${metrics.weekEnding}` };
  }

  const written = await writeRundown(metrics);
  const report: WeeklyReport = {
    weekEnding: metrics.weekEnding,
    metrics,
    rundown: written?.rundown ?? plainRundown(metrics),
    ai: { used: Boolean(written), model: written?.model ?? null },
    emailed: false,
  };

  const to = process.env.ADMIN_EMAIL?.trim();
  const apiKey = await getRuntimeSecret("RESEND_API_KEY", "resend_api_key");
  if (to && apiKey) {
    try {
      const email = reportEmail(report);
      const { error } = await new Resend(apiKey).emails.send({
        from: EMAIL_FROM,
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: { "Idempotency-Key": `business-report-${metrics.weekEnding}${options.force ? `-${now.getTime()}` : ""}` },
        tags: [{ name: "email_type", value: "business_report" }, { name: "product", value: "storyloop" }],
      });
      report.emailed = !error;
    } catch (error) {
      console.error("Business manager: report email failed", error);
    }
  }

  const { error } = await sb.from("admin_audit_log").insert({ action: REPORT_ACTION, target_type: "week", target_id: metrics.weekEnding, details: report });
  if (error) throw new Error(`Could not store the weekly report: ${error.message}`);
  return { stored: true as const, report };
}

/** How many guides the blog may publish in a week, from the latest report (one if there is none). */
export async function currentBlogTarget(): Promise<0 | 1 | 2> {
  try {
    const report = await latestReport();
    const target = report?.metrics?.blog?.targetNextWeek;
    return target === 0 || target === 1 || target === 2 ? target : 1;
  } catch {
    return 1;
  }
}
