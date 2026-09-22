/**
 * In-app notifications: the bell.
 *
 * THE RULE: a notification has to be something the educator would be glad to
 * have been told. Things that happened while they were away (a referral paid
 * out, a family opened a wall card, a centre invited them) and things coming up
 * that they can still act on (a trial ending, a term ending). Nothing that only
 * exists to bring them back, because by the time they see the bell they are
 * already here.
 *
 * THE RATE: roughly one or two a week at most, by construction rather than by
 * a throttle. Each notification has a stable id, and ids that repeat are
 * bucketed: the quiet-children note can appear at most once a fortnight, the
 * allowance note once a month, a term note once a term, a wall-card note only
 * when a milestone is crossed. Everything else is a real one-off event.
 *
 * THE PRIVACY LINE: no child's name ever appears in a notification. Counts
 * only. A bell is glanced at over a shoulder, on a shared room tablet, in a
 * screenshot sent to a colleague.
 *
 * Pure: no database, no clock. The route gathers the facts and passes `now`, so
 * every rule is tested exactly.
 */

import { hasFeatureAccess, type PlanKey } from "@/lib/plans";

export type NotificationKind = "billing" | "trial" | "referral" | "quiet" | "wall" | "term" | "allowance" | "invite";

export type AppNotification = {
  /** Stable. Read state is keyed on it, so the same fact is never "new" twice. */
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  /** When it became true. Used for ordering and "3 days ago". */
  date: string;
  urgent?: boolean;
};

export type NotificationFacts = {
  now: Date;
  plan: PlanKey;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  storiesThisMonth: number;
  /**
   * When the monthly count was last reset (profiles.last_reset_at). The reset
   * is a monthly job, so for the first hours of a month the count can still be
   * last month's; a count from before this month is not this month's.
   */
  usageResetAt: string | null;
  /** Null when the plan is unlimited. */
  monthlyLimit: number | null;
  referrals: Array<{ id: string; status: string; qualifiedAt: string | null; creditedAt: string | null }>;
  /** Children worth noticing on the quiet radar. Null when not computed. */
  quiet: { count: number; onHoliday: boolean } | null;
  /** Total wall-card opens across the educator's cards, and when the last was. */
  wall: { scans: number; lastScannedAt: string | null } | null;
  /** Only passed when the term calendar is known to be the educator's own. */
  term: { number: number; end: string; childrenWithNoMomentThisTerm: number | null } | null;
  invites: Array<{ id: string; centreName: string; token: string; createdAt: string }>;
};

export const WALL_MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
/** Days before a trial ends that the note appears. */
export const TRIAL_NOTICE_DAYS = 3;
/** Days before a term ends that the note appears. */
export const TERM_NOTICE_DAYS = 10;
/** The bell never shows more than this many; older ones drop off. */
export const MAX_NOTIFICATIONS = 8;

const DAY = 86_400_000;

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** A key that changes once a fortnight, so a repeating note repeats at most that often. */
export function fortnightKey(now: Date) {
  // Fortnights counted from a fixed Monday, so the boundary is stable.
  const epoch = Date.UTC(2026, 0, 5);
  const index = Math.floor((now.getTime() - epoch) / (14 * DAY));
  return `f${index}`;
}

function startOfFortnight(now: Date) {
  const epoch = Date.UTC(2026, 0, 5);
  const index = Math.floor((now.getTime() - epoch) / (14 * DAY));
  return new Date(epoch + index * 14 * DAY);
}

function monthKey(now: Date) {
  return now.toISOString().slice(0, 7);
}

function nextMonthFirst(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export function formatDay(value: string | Date) {
  const date = typeof value === "string" ? new Date(value.length === 10 ? `${value}T12:00:00Z` : value) : value;
  // "Friday 25 September": built from parts because en-NZ puts a comma after
  // the weekday, which reads like a list in the middle of a sentence.
  const parts = new Intl.DateTimeFormat("en-NZ", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function buildNotifications(facts: NotificationFacts): AppNotification[] {
  const { now } = facts;
  const out: AppNotification[] = [];

  // Billing first: the only kind that can stop someone working.
  if (facts.subscriptionStatus === "past_due") {
    out.push({
      id: `billing:past_due:${monthKey(now)}`,
      kind: "billing",
      title: "Your last payment did not go through",
      body: "Stripe is retrying it and nothing is switched off yet. Updating your card in Billing sorts it.",
      href: "/billing",
      date: now.toISOString(),
      urgent: true,
    });
  } else if (facts.subscriptionStatus === "payment_required") {
    out.push({
      id: `billing:blocked:${monthKey(now)}`,
      kind: "billing",
      title: "Payment is needed to keep writing",
      body: "Your stories are all still here. Add a payment method in Billing to carry on.",
      href: "/billing",
      date: now.toISOString(),
      urgent: true,
    });
  }

  if (facts.subscriptionStatus === "trialing" && facts.trialEndsAt) {
    const ends = new Date(facts.trialEndsAt);
    const daysLeft = (ends.getTime() - now.getTime()) / DAY;
    if (daysLeft > 0 && daysLeft <= TRIAL_NOTICE_DAYS) {
      out.push({
        id: `trial:${isoDate(ends)}`,
        kind: "trial",
        title: `Your free trial ends ${formatDay(ends)}`,
        body: "Nothing to do if you want to keep going. If not, you can cancel from Billing before then and you will not be charged.",
        href: "/billing",
        date: new Date(ends.getTime() - TRIAL_NOTICE_DAYS * DAY).toISOString(),
      });
    }
  }

  for (const invite of facts.invites) {
    out.push({
      id: `invite:${invite.id}`,
      kind: "invite",
      title: `${invite.centreName} has invited you to their team`,
      body: "Joining shares who is writing and when, never what you wrote, unless you turn sharing on yourself.",
      href: `/join?token=${encodeURIComponent(invite.token)}`,
      date: invite.createdAt,
    });
  }

  for (const referral of facts.referrals) {
    if (referral.status === "credited" && referral.creditedAt) {
      out.push({
        id: `referral:${referral.id}:credited`,
        kind: "referral",
        title: "Someone you invited has subscribed",
        body: "Your free time has been added to your account and comes off your next bills.",
        href: "/support",
        date: referral.creditedAt,
      });
    } else if (referral.status === "earned" && referral.qualifiedAt) {
      out.push({
        id: `referral:${referral.id}:earned`,
        kind: "referral",
        title: "Someone you invited has subscribed",
        body: "Your free time is being held for you. It is applied the moment you start a plan.",
        href: "/billing",
        date: referral.qualifiedAt,
      });
    }
  }

  if (facts.wall && facts.wall.scans > 0) {
    const reached = WALL_MILESTONES.filter((milestone) => facts.wall!.scans >= milestone).pop();
    if (reached) {
      out.push({
        id: `wall:${reached}`,
        kind: "wall",
        title: reached === 1 ? "A family opened one of your wall cards" : `Your wall cards have been opened ${reached} times`,
        body: "Only a count is kept. Nobody is tracked, and the page shows no names or photographs.",
        href: "/wall",
        date: facts.wall.lastScannedAt ?? now.toISOString(),
      });
    }
  }

  // Quiet children: only for plans that include the radar, so the note always
  // leads somewhere that shows which children. Never during a school holiday
  // the educator has told us they follow.
  if (facts.quiet && facts.quiet.count > 0 && !facts.quiet.onHoliday && hasFeatureAccess(facts.plan, "quietChildRadar")) {
    out.push({
      id: `quiet:${fortnightKey(now)}`,
      kind: "quiet",
      title: `${plural(facts.quiet.count, "child has", "children have")} had no moments in a while`,
      body: "Maybe a quiet week, maybe worth a look. The radar on Child profiles shows who, with no ranking.",
      href: "/children",
      date: startOfFortnight(now).toISOString(),
    });
  }

  if (facts.term) {
    const end = new Date(`${facts.term.end}T12:00:00Z`);
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / DAY);
    if (daysLeft >= 0 && daysLeft <= TERM_NOTICE_DAYS) {
      const missing = facts.term.childrenWithNoMomentThisTerm;
      out.push({
        id: `term:${facts.term.end}`,
        kind: "term",
        title: `Term ${facts.term.number} ends ${formatDay(facts.term.end)}`,
        body:
          missing && missing > 0
            ? `${plural(missing, "child has", "children have")} no moment recorded this term yet.`
            : "A good week to finish any stories you have been meaning to write.",
        href: missing && missing > 0 ? "/children" : "/today",
        date: new Date(end.getTime() - TERM_NOTICE_DAYS * DAY).toISOString(),
      });
    }
  }

  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const countIsThisMonths = !facts.usageResetAt || new Date(facts.usageResetAt).getTime() >= monthStart;
  if (
    facts.monthlyLimit !== null &&
    facts.monthlyLimit > 0 &&
    countIsThisMonths &&
    facts.storiesThisMonth >= facts.monthlyLimit
  ) {
    out.push({
      id: `allowance:${monthKey(now)}`,
      kind: "allowance",
      title: `You have used this month's ${facts.monthlyLimit} free stories`,
      body: `They come back on ${formatDay(nextMonthFirst(now))}. Everything you wrote is saved, and unlimited stories are on the Educator plan.`,
      href: "/billing",
      date: now.toISOString(),
    });
  }

  return out
    .sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)) || b.date.localeCompare(a.date))
    .slice(0, MAX_NOTIFICATIONS);
}

/** How many of these the educator has not opened the bell to see. */
export function unseenCount(items: AppNotification[], seen: Iterable<string>) {
  const seenSet = new Set(seen);
  return items.filter((item) => !seenSet.has(item.id)).length;
}

/** The ids remembered as seen, bounded so the stored list cannot grow forever. */
export function mergeSeen(previous: unknown, ids: string[], limit = 100): string[] {
  const earlier = Array.isArray(previous) ? previous.filter((value): value is string => typeof value === "string") : [];
  const merged = [...earlier.filter((id) => !ids.includes(id)), ...ids.filter((id) => typeof id === "string" && id.length <= 200)];
  return merged.slice(-limit);
}
