import type { LifecycleEmailType } from "./templates";

/**
 * The email brain (3 Nov 2026). Leo: "never more than 2 a month, be smart with
 * it… if it gets no data it shouldn't spam or make dumb decisions", and it
 * should slow itself down when it looks spammy. Plain rules, no AI: every
 * decision here can be read, tested and explained in the admin page.
 *
 * Before this, nudges were capped at one a week, so in the 30 days to 3 Nov
 * sixteen people got three to six non-billing emails each, and nothing knew
 * whether any of them were opened, clicked or bounced.
 *
 * Pure functions only. lib/email/send.ts asks the gate before every send;
 * lib/email/automation.ts uses the ordering to send each person only the most
 * valuable email they qualify for; app/(admin)/admin/email shows the state.
 */

export type EmailClass = "transactional" | "moment" | "offer" | "activation" | "engagement";

/** What every email is. Transactional mail (receipts, trial and payment notices, referral credits) is never held. */
export const EMAIL_CLASS: Record<LifecycleEmailType, EmailClass> = {
  welcome: "transactional",
  trial_ending: "transactional",
  payment_succeeded: "transactional",
  payment_failed: "transactional",
  payment_failed_final: "transactional",
  cancellation_scheduled: "transactional",
  subscription_cancelled: "transactional",
  referral_earned: "transactional",
  referral_joined: "transactional",
  // The moments someone is deciding whether to pay.
  two_free_stories_used: "moment",
  free_limit_reached: "moment",
  checkout_abandoned: "moment",
  // A real discount, granted to that one account.
  winback_offer: "offer",
  pro_month_offer: "offer",
  // Getting someone to value, or back to it.
  no_first_story: "activation",
  paid_no_usage_checkin: "activation",
  went_quiet: "activation",
  usage_tips: "activation",
  // Tips and asks: only when nothing better is due and the person is reading.
  // "How did your first story feel?" is a feedback ask, so it waits behind the paying moments.
  first_story_created: "engagement",
  weekly_value: "engagement",
  feedback_request: "engagement",
  family_pack_prompt: "engagement",
  centre_planning_prompt: "engagement",
  story_quality_upgrade: "engagement",
  referral_invite: "engagement",
};

export const isMarketing = (type: LifecycleEmailType) => EMAIL_CLASS[type] !== "transactional";

/** Leo's rule: never more than two non-billing emails to one person in 30 days. */
export const MARKETING_PER_30_DAYS = 2;
/**
 * How someone uses StoryLoop decides how much they hear (Leo, 3 Nov 2026): "if
 * they're using a lot of it, then don't send as much… maybe only send one",
 * "signed up, not subscribed, and they're using a lot, then send a couple…
 * give them an offer", and "not using it at all… give them some tips".
 *
 * - A payer writing about a story a week or more is getting value: one email
 *   a month at most.
 * - A free educator who is writing stories gets the paying moments and the
 *   offer first; tips wait (inFreeDecisionWindow).
 * - Someone who has written nothing in 30 days gets getting-started help, and
 *   a tip may be their second email that month.
 * Unknown usage (the read failed) changes nothing: the usual two a month.
 */
export type Usage = { paying: boolean; storiesLast30: number };
export type UsageSegment = "regular_payer" | "deciding" | "not_using" | "other";
/** About one story a week. */
export const REGULAR_STORIES_30D = 4;
export const REGULAR_PAYER_PER_30_DAYS = 1;

export function usageSegment(usage: Usage | null | undefined): UsageSegment | null {
  if (!usage || !Number.isFinite(usage.storiesLast30)) return null;
  if (usage.paying && usage.storiesLast30 >= REGULAR_STORIES_30D) return "regular_payer";
  if (usage.storiesLast30 <= 0) return "not_using";
  return usage.paying ? "other" : "deciding";
}

/** Days since that person's last non-billing email before each kind may go. */
export const MIN_DAYS_SINCE_LAST: Record<Exclude<EmailClass, "transactional">, number> = {
  moment: 3,
  offer: 7,
  activation: 5,
  engagement: 21,
};
/** At most this many non-billing emails a day across everyone, so a bug can never blast the whole list. */
export const DAILY_CEILING = 40;
export const SLOW_MODE_DAILY_CEILING = 15;
/** Local hours a scheduled email may arrive in. Emails a person's own action triggers go at once. */
export const SEND_HOURS = { from: 8, to: 19 } as const;

const CLASS_PRIORITY: Record<EmailClass, number> = { transactional: 1000, moment: 100, offer: 80, activation: 70, engagement: 40 };

export type SentEmail = {
  type: LifecycleEmailType;
  sentAt: string;
  opened?: boolean;
  clicked?: boolean;
  /** What Resend last reported (lib/email/delivery-sync.ts): delivered, bounced, complained… */
  providerStatus?: string | null;
};

export type GlobalEmailState = {
  /** Why all non-billing email is stopped, or null. */
  pausedReason: string | null;
  /** Fewer emails and no tips, after a run of unsubscribes. */
  slowMode: boolean;
  /** Non-billing emails sent in the last 24 hours, everyone. */
  sentLast24h: number;
  /** When link tracking started; before that, "never clicked" means "unknown", not "not interested". */
  trackingSince: string | null;
  /** Override for DAILY_CEILING (EMAIL_DAILY_CEILING); the local test server raises it. */
  dailyCeiling?: number;
  /** Override for SEND_HOURS (EMAIL_SEND_HOURS="8-19"); the local test server opens it to 0-24. */
  sendHours?: { from: number; to: number };
};

export type HoldReason = "paused" | "monthly_cap" | "too_soon" | "quiet_hours" | "daily_ceiling" | "slow_mode" | "not_reading";
export type GateResult = { allow: true } | { allow: false; reason: HoldReason; detail: string };

const DAY = 86_400_000;

/** The time zone an educator most likely reads email in, from their own curriculum setting. */
export function timezoneFor(defaultFramework: string | null | undefined): string {
  switch ((defaultFramework ?? "").toUpperCase()) {
    case "NZ":
      return "Pacific/Auckland";
    case "UK":
      return "Europe/London";
    case "IE":
      return "Europe/Dublin";
    default:
      return "Australia/Sydney";
  }
}

export function localHour(now: Date, timeZone: string): number {
  try {
    const hour = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(now);
    return Number(hour) % 24;
  } catch {
    return now.getUTCHours();
  }
}

/**
 * Someone who has had three emails since tracking began and opened or clicked
 * none of them. They only hear about real offers and paying moments, once a
 * month. Without tracking data nobody is ever judged unread.
 */
export function isNotReading(history: SentEmail[], trackingSince: string | null, now: Date): boolean {
  if (!trackingSince) return false;
  const since = Math.max(Date.parse(trackingSince), now.getTime() - 90 * DAY);
  const tracked = history.filter((e) => isMarketing(e.type) && Date.parse(e.sentAt) >= since && e.providerStatus !== "bounced");
  return tracked.length >= 3 && tracked.every((e) => !e.opened && !e.clicked);
}

/** May this non-billing email go to this person now? Transactional email always may. */
export function gateEmail(input: {
  type: LifecycleEmailType;
  history: SentEmail[];
  global: GlobalEmailState;
  now: Date;
  timeZone: string;
  /** Sent because of something the person just did (wrote a story, hit the limit): they are awake. */
  triggeredByUser?: boolean;
  /** How they use StoryLoop (usageSegment); null when it could not be read. */
  usage?: Usage | null;
}): GateResult {
  const cls = EMAIL_CLASS[input.type];
  if (cls === "transactional") return { allow: true };
  const { history, global, now } = input;

  if (global.pausedReason) return { allow: false, reason: "paused", detail: global.pausedReason };
  if (global.slowMode && cls === "engagement") return { allow: false, reason: "slow_mode", detail: "Tips are off while unsubscribes are high." };
  const ceiling = global.slowMode ? Math.min(SLOW_MODE_DAILY_CEILING, global.dailyCeiling ?? DAILY_CEILING) : (global.dailyCeiling ?? DAILY_CEILING);
  if (global.sentLast24h >= ceiling) return { allow: false, reason: "daily_ceiling", detail: `${global.sentLast24h} sent in 24 hours (limit ${ceiling}).` };

  const marketing = history.filter((e) => isMarketing(e.type)).map((e) => Date.parse(e.sentAt)).filter(Number.isFinite).sort((a, b) => b - a);
  const in30 = marketing.filter((t) => now.getTime() - t < 30 * DAY).length;
  const notReading = isNotReading(history, global.trackingSince, now);
  const segment = usageSegment(input.usage);
  const cap = notReading || segment === "regular_payer" ? Math.min(REGULAR_PAYER_PER_30_DAYS, MARKETING_PER_30_DAYS) : MARKETING_PER_30_DAYS;
  if (in30 >= cap) {
    const why = segment === "regular_payer" && !notReading ? ", a regular payer" : "";
    return { allow: false, reason: "monthly_cap", detail: `${in30} in the last 30 days (limit ${cap}${why}).` };
  }
  // Tips take a slot only when nothing else has gone out in 30 days, so one
  // always stays free for "one story left", "out of free stories" or an offer.
  // Someone not using StoryLoop at all will not hit those moments, so for them
  // a tip may be the second email.
  if (cls === "engagement" && in30 > 0 && segment !== "not_using") {
    return { allow: false, reason: "too_soon", detail: "Tips only go when no other email has been sent in 30 days." };
  }
  if (notReading && (cls === "engagement" || cls === "activation")) {
    return { allow: false, reason: "not_reading", detail: "No opens or clicks on the last three emails: offers and paying moments only." };
  }
  // "One story left" and "out of free stories" answer what the person just did:
  // no waiting, though they still count toward the two a month.
  if (marketing.length && !(cls === "moment" && input.triggeredByUser)) {
    const days = (now.getTime() - marketing[0]) / DAY;
    const gap = MIN_DAYS_SINCE_LAST[cls];
    if (days < gap) return { allow: false, reason: "too_soon", detail: `Last email ${days.toFixed(1)} days ago (wait ${gap}).` };
  }
  if (!input.triggeredByUser) {
    const hour = localHour(now, input.timeZone);
    const hours = global.sendHours ?? SEND_HOURS;
    if (hour < hours.from || hour >= hours.to) {
      return { allow: false, reason: "quiet_hours", detail: `${hour}:00 in ${input.timeZone}.` };
    }
  }
  return { allow: true };
}

/**
 * Whether email as a whole is healthy. Spam complaints and bounces hurt every
 * future email's chance of reaching an inbox, so they stop all non-billing
 * email (billing and account email continue); a run of unsubscribes slows it.
 */
export function deliverabilityGuard(stats: { sent30: number; bounced30: number; complained30: number; unsubscribed30: number }, pausedByLeo?: string | null) {
  const { sent30, bounced30, complained30, unsubscribed30 } = stats;
  if (pausedByLeo) return { pausedReason: "Paused by Leo (EMAIL_MARKETING_PAUSED).", slowMode: false };
  if (complained30 >= 2) return { pausedReason: `${complained30} spam complaints in 30 days. Paused until fewer than 2.`, slowMode: false };
  if (bounced30 >= 3 && bounced30 / Math.max(1, sent30) > 0.05) {
    return { pausedReason: `${bounced30} bounces in 30 days (${((bounced30 / Math.max(1, sent30)) * 100).toFixed(1)}%). Paused until under 5%.`, slowMode: false };
  }
  const slowMode = complained30 === 1 || (unsubscribed30 >= 3 && unsubscribed30 / Math.max(1, sent30) > 0.03);
  return { pausedReason: null, slowMode };
}

export type CampaignStats = { sent: number; clicked: number; converted: number };

/** Before a tip has data of its own, the more relevant one goes first (a centre hears about planning before family packs). */
const TIP_RELEVANCE: Partial<Record<LifecycleEmailType, number>> = {
  centre_planning_prompt: 6,
  referral_invite: 5,
  family_pack_prompt: 4,
  first_story_created: 3,
  feedback_request: 2,
  weekly_value: 1,
};

/**
 * A free educator who has used some, but not all, of this month's free
 * stories is deciding whether to pay: tips wait, so the two-a-month allowance
 * is there for "one story left" and "out of free stories".
 */
export function inFreeDecisionWindow(input: { plan: string | null | undefined; storiesThisMonth: number | null | undefined; monthlyLimit: number | null | undefined }) {
  const free = (input.plan ?? "free") === "free";
  const used = input.storiesThisMonth ?? 0;
  const limit = input.monthlyLimit ?? 0;
  return free && limit > 0 && used >= 1 && used < limit;
}

/** A campaign's base click rate before any data, and how many sends of evidence that belief is worth. */
const PRIOR = { click: 0.04, convert: 0.01, strength: 50 };
/** Below this many sends a campaign's own numbers do not move it. */
export const MIN_SENDS_TO_LEARN = 20;

/**
 * How good a campaign has been: smoothed click and paid-conversion rates, so a
 * lucky first click cannot crown a campaign and no data means "average".
 */
export function campaignScore(stats: CampaignStats | undefined): number {
  const sent = stats?.sent ?? 0;
  if (sent < MIN_SENDS_TO_LEARN) return PRIOR.click + 5 * PRIOR.convert;
  const click = ((stats?.clicked ?? 0) + PRIOR.click * PRIOR.strength) / (sent + PRIOR.strength);
  const convert = ((stats?.converted ?? 0) + PRIOR.convert * PRIOR.strength) / (sent + PRIOR.strength);
  return click + 5 * convert;
}

/**
 * The order to try one person's candidate emails in: paying moments, then real
 * offers, then getting them to value, then tips (best performing first). Only
 * the first that is allowed goes; the rest wait for a later run.
 */
export function orderCandidates<T extends { type: LifecycleEmailType }>(candidates: T[], stats: Partial<Record<LifecycleEmailType, CampaignStats>> = {}): T[] {
  return [...candidates].sort((a, b) => {
    const pa = CLASS_PRIORITY[EMAIL_CLASS[a.type]];
    const pb = CLASS_PRIORITY[EMAIL_CLASS[b.type]];
    if (pa !== pb) return pb - pa;
    const byData = campaignScore(stats[b.type]) - campaignScore(stats[a.type]);
    if (byData !== 0) return byData;
    return (TIP_RELEVANCE[b.type] ?? 0) - (TIP_RELEVANCE[a.type] ?? 0);
  });
}

/** Hold reasons that apply to every non-billing email for this person this run, so there is no point trying the next one. */
export const HOLDS_EVERYTHING: ReadonlySet<HoldReason> = new Set(["paused", "monthly_cap", "daily_ceiling", "quiet_hours"]);
