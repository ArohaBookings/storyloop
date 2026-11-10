import Link from "next/link";
import { Users } from "lucide-react";

/**
 * The centre's free month, on the guides people read while a whole room's
 * statements or summaries are due (10 Nov 2026).
 *
 * These pages bring the most search visitors on the site in November, and the
 * reader is a teacher with twenty of them to write, often the person who runs
 * the room or the kindergarten. Until now the only centre offer was three
 * clicks away on /for-centres, which 20 people opened in a month. This says it
 * once, under the place where they have just tried one.
 */
export default function CentreMonthBand({ what }: { what: "statements" | "summaries" }) {
  return (
    <section aria-labelledby="centre-month-title" className="border-b border-clay-100 bg-cream-50/70 py-10 md:py-12" data-testid="centre-month-band">
      <div className="wide-shell">
        <div className="flex min-w-0 max-w-3xl flex-col gap-4 sm:flex-row sm:items-start">
          <div className="hidden h-11 w-11 flex-none items-center justify-center rounded-2xl bg-clay-700 text-paper sm:flex">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="centre-month-title" className="font-display text-2xl font-bold leading-tight text-ink-900 md:text-3xl">
              Writing these for a whole room?
            </h2>
            <p className="mt-2 text-base leading-relaxed text-ink-700">
              Your centre&apos;s first month is free, with no card. Every teacher on your team gets their own login and
              unlimited drafts, and each child&apos;s {what === "statements" ? "statement" : "summary"} is drafted from the notes
              and stories your team already has, for you to check and finish. If it is not for you, do nothing: the month
              ends and nothing is charged.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/signup?plan=centre_starter" className="btn-primary justify-center" data-track="guide_centre_month">
                Start your centre&apos;s free month
              </Link>
              <Link
                href="/for-centres?utm_source=guide&utm_medium=centre_band"
                className="inline-flex min-h-[44px] items-center text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4"
                data-track="guide_centre_details"
              >
                What a centre gets, and the price after
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
