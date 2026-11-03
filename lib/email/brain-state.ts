import { createAdminSupabase } from "@/lib/supabase/admin";
import type { LifecycleEmailType } from "./templates";
import { EMAIL_CLASS, deliverabilityGuard, isMarketing, type CampaignStats, type GlobalEmailState, type SentEmail, type Usage } from "./brain";
import { normalizePlanKey } from "@/lib/plans";

/**
 * What the email brain (lib/email/brain.ts) reads from the database: how much
 * non-billing email went out today, the last 30 days' bounces, complaints and
 * unsubscribes, each person's recent emails, and how every campaign has done.
 * Read-only. A failed read never means "send more": it falls back to the
 * strictest state.
 */

const DAY = 86_400_000;
export const MARKETING_TYPES = (Object.keys(EMAIL_CLASS) as LifecycleEmailType[]).filter(isMarketing);
/** Per person, "skipped_unconfigured" (an email that would have gone with an API key, as on the local test stack) counts too, to stay strict. */
const SENT_STATUSES = ["sent", "skipped_unconfigured"];

type EventRow = { user_id: string | null; email_type: LifecycleEmailType; sent_at: string; opened_at: string | null; clicked_at: string | null; metadata: Record<string, unknown> | null };

/** "8-19" style override for the waking-hours window; anything unreadable keeps the default. */
function sendHoursFromEnv(value: string | undefined) {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec((value ?? "").trim());
  if (!m) return undefined;
  const from = Number(m[1]);
  const to = Number(m[2]);
  return from >= 0 && to <= 24 && from < to ? { from, to } : undefined;
}

let cache: { at: number; state: GlobalEmailState & { stats30: { sent30: number; bounced30: number; complained30: number; unsubscribed30: number } } } | null = null;

export async function loadGlobalEmailState(now = new Date(), { fresh = false } = {}) {
  if (!fresh && cache && now.getTime() - cache.at < 120_000) return cache.state;
  const sb = createAdminSupabase();
  const since30 = new Date(now.getTime() - 30 * DAY).toISOString();
  const [events, unsubs, tracked] = await Promise.all([
    // Real sends only: the local test stack's "skipped_unconfigured" rows must not fill the daily ceiling.
    sb.from("email_events").select("email_type, sent_at, metadata").eq("delivery_status", "sent").in("email_type", MARKETING_TYPES).gte("sent_at", since30).limit(5000),
    sb.from("email_unsubscribes").select("reason").gte("created_at", since30).limit(5000),
    sb.from("email_events").select("sent_at").eq("delivery_status", "sent").eq("metadata->>tracked", "true").order("sent_at", { ascending: true }).limit(1),
  ]);
  if (events.error || unsubs.error) {
    // Unknown is treated as unsafe: no non-billing email until the numbers can be read.
    const state = { pausedReason: "Email numbers could not be read; non-billing email is held until they can.", slowMode: true, sentLast24h: 0, trackingSince: null, stats30: { sent30: 0, bounced30: 0, complained30: 0, unsubscribed30: 0 } };
    return state;
  }
  const rows = (events.data ?? []) as Pick<EventRow, "email_type" | "sent_at" | "metadata">[];
  const status = (r: { metadata: Record<string, unknown> | null }) => String(r.metadata?.provider_status ?? "");
  const stats30 = {
    sent30: rows.length,
    bounced30: rows.filter((r) => status(r) === "bounced").length,
    complained30: rows.filter((r) => status(r) === "complained").length,
    unsubscribed30: (unsubs.data ?? []).filter((u) => !["bounced", "complained"].includes(String(u.reason ?? ""))).length,
  };
  const guard = deliverabilityGuard(stats30, process.env.EMAIL_MARKETING_PAUSED || null);
  const state = {
    ...guard,
    sentLast24h: rows.filter((r) => now.getTime() - Date.parse(r.sent_at) < DAY).length,
    trackingSince: tracked.data?.[0]?.sent_at ?? null,
    dailyCeiling: Number(process.env.EMAIL_DAILY_CEILING) > 0 ? Number(process.env.EMAIL_DAILY_CEILING) : undefined,
    sendHours: sendHoursFromEnv(process.env.EMAIL_SEND_HOURS),
    stats30,
  };
  cache = { at: now.getTime(), state };
  return state;
}

/** After a send in the same run, so the daily ceiling counts it straight away. */
export function noteMarketingSent() {
  if (cache) cache.state = { ...cache.state, sentLast24h: cache.state.sentLast24h + 1 };
}

/** One person's sent emails in the last 90 days, newest first. On a failed read, assume the cap is already used. */
export async function loadUserHistory(userId: string, now = new Date()): Promise<SentEmail[] | null> {
  const { data, error } = await createAdminSupabase()
    .from("email_events")
    .select("email_type, sent_at, opened_at, clicked_at, metadata")
    .eq("user_id", userId)
    .in("delivery_status", SENT_STATUSES)
    .gte("sent_at", new Date(now.getTime() - 90 * DAY).toISOString())
    .order("sent_at", { ascending: false })
    .limit(200);
  if (error) return null;
  return ((data ?? []) as Omit<EventRow, "user_id">[]).map((r) => ({
    type: r.email_type,
    sentAt: r.sent_at,
    opened: Boolean(r.opened_at),
    clicked: Boolean(r.clicked_at),
    providerStatus: (r.metadata?.provider_status as string | undefined) ?? null,
  }));
}

/**
 * How this person uses StoryLoop, for usageSegment: on a paid plan or not, and
 * how many stories they wrote in the last 30 days. Null when either read
 * fails, which leaves the usual rules in place.
 */
export async function loadUsage(userId: string, now = new Date()): Promise<Usage | null> {
  const sb = createAdminSupabase();
  const [profile, stories] = await Promise.all([
    sb.from("profiles").select("plan").eq("id", userId).maybeSingle(),
    sb.from("stories").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", new Date(now.getTime() - 30 * DAY).toISOString()),
  ]);
  if (profile.error || !profile.data || stories.error || typeof stories.count !== "number") return null;
  return { paying: normalizePlanKey(profile.data.plan) !== "free", storiesLast30: stories.count };
}

/**
 * Every campaign's last 90 days: sent, clicked, and converted (the person
 * started a paid plan within 7 days of the email). This is what the brain
 * learns from, once a campaign has enough sends to mean anything.
 */
export async function loadCampaignStats(now = new Date()) {
  const sb = createAdminSupabase();
  const { data, error } = await sb
    .from("email_events")
    .select("user_id, email_type, sent_at, opened_at, clicked_at, metadata")
    .eq("delivery_status", "sent")
    .in("email_type", MARKETING_TYPES)
    .gte("sent_at", new Date(now.getTime() - 90 * DAY).toISOString())
    .limit(5000);
  if (error) return { stats: {} as Partial<Record<LifecycleEmailType, CampaignStats & { opened: number; bounced: number; complained: number }>>, error: error.message };
  const rows = (data ?? []) as EventRow[];
  const ids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))] as string[];
  const upgradedAt = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data: profiles } = await sb.from("profiles").select("id, upgraded_at").in("id", ids.slice(i, i + 200));
    for (const p of profiles ?? []) if (p.upgraded_at) upgradedAt.set(p.id as string, Date.parse(p.upgraded_at as string));
  }
  const stats: Partial<Record<LifecycleEmailType, CampaignStats & { opened: number; bounced: number; complained: number }>> = {};
  for (const r of rows) {
    const s = (stats[r.email_type] ??= { sent: 0, clicked: 0, converted: 0, opened: 0, bounced: 0, complained: 0 });
    s.sent += 1;
    if (r.clicked_at) s.clicked += 1;
    if (r.opened_at) s.opened += 1;
    const provider = String(r.metadata?.provider_status ?? "");
    if (provider === "bounced") s.bounced += 1;
    if (provider === "complained") s.complained += 1;
    const up = r.user_id ? upgradedAt.get(r.user_id) : undefined;
    const sent = Date.parse(r.sent_at);
    if (up && up > sent && up - sent <= 7 * DAY) s.converted += 1;
  }
  return { stats, error: null };
}
