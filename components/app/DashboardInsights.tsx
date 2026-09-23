import Link from "next/link";
import { ArrowRight, Clock, Compass, Gift, Users } from "lucide-react";

/**
 * A little more of what a dashboard should say: the time StoryLoop gave back
 * this month, which children have had a story, which parts of the curriculum
 * the educator has been writing to, and a free month waiting to be claimed if
 * they were offered one. Every number is counted from their own stories.
 */

/** The same estimate as the ROI page: 18 minutes saved a story. */
export const MINUTES_SAVED_PER_STORY = 18;

export type DashboardInsightsData = {
  storiesThisMonth: number;
  childrenTotal: number;
  childrenWithStory: number;
  topLinks: Array<{ label: string; count: number }>;
  offer: { claimBy: string } | null;
};

function hoursLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export default function DashboardInsights({ data }: { data: DashboardInsightsData }) {
  const minutes = data.storiesThisMonth * MINUTES_SAVED_PER_STORY;
  return (
    <div className="mb-8 space-y-4" data-testid="dashboard-insights">
      {data.offer && (
        <Link
          href="/offer/pro-month"
          className="flex flex-col gap-3 rounded-3xl border border-clay-300 bg-gradient-to-br from-cream-100 via-white to-clay-50 p-5 shadow-warm transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
          data-track="dashboard_offer"
        >
          <span className="flex items-start gap-3">
            <Gift className="mt-1 h-6 w-6 flex-none text-clay-700" />
            <span>
              <span className="block font-display text-xl font-bold text-ink-900">Your free month of Pro is waiting.</span>
              <span className="mt-0.5 block text-sm leading-relaxed text-ink-600">
                Unlimited stories and every feature for 30 days, nothing charged until the end. Claim by {data.offer.claimBy}.
              </span>
            </span>
          </span>
          <span className="btn-primary flex-none justify-center">Claim it <ArrowRight className="h-4 w-4" /></span>
        </Link>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <Clock className="h-5 w-5 text-sage-700" />
          <p className="mt-3 font-display text-3xl font-bold text-ink-900">{data.storiesThisMonth ? `About ${hoursLabel(minutes)}` : "Nothing yet"}</p>
          <p className="mt-0.5 text-sm text-ink-600">back this month</p>
          <p className="mt-1 text-xs text-ink-500">Estimated at {MINUTES_SAVED_PER_STORY} minutes saved a story.</p>
        </div>
        <div className="card p-5">
          <Users className="h-5 w-5 text-clay-700" />
          <p className="mt-3 font-display text-3xl font-bold tabular-nums text-ink-900">
            {data.childrenTotal ? `${data.childrenWithStory} of ${data.childrenTotal}` : data.childrenWithStory}
          </p>
          <p className="mt-0.5 text-sm text-ink-600">{data.childrenTotal ? "children have a story in the last 30 days" : "children in stories this month"}</p>
          <Link href={data.childrenTotal ? "/insights" : "/children"} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-clay-700 hover:underline">
            {data.childrenTotal ? "See who has not" : "Add your children"} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="card p-5">
          <Compass className="h-5 w-5 text-clay-700" />
          <p className="mt-3 text-sm font-semibold text-ink-800">Curriculum you have linked, last 30 days</p>
          {data.topLinks.length ? (
            <ul className="mt-2 space-y-1.5">
              {data.topLinks.map((link) => (
                <li key={link.label} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-ink-700" title={link.label}>{link.label}</span>
                  <span className="flex-none tabular-nums text-ink-500">{link.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-500">Your links show up here as you write.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Top curriculum links from stories' outcomes. Pure. */
export function topCurriculumLinks(outcomeLists: Array<string[] | null | undefined>, limit = 4) {
  const counts = new Map<string, number>();
  for (const list of outcomeLists) {
    for (const raw of list ?? []) {
      if (typeof raw !== "string") continue;
      // "EYLF Outcome 4: Children are confident..." -> "EYLF Outcome 4"; strands keep their name.
      const label = raw.split(/[:.|–-]\s/)[0].trim().slice(0, 48);
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, limit);
}
