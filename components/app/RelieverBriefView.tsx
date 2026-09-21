import type { RelieverBrief } from "@/lib/reliever-brief";

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" });

/** The printable brief. Pure: everything shown comes from the assembled brief. */
export default function RelieverBriefView({ brief }: { brief: RelieverBrief }) {
  return (
    <article className="card mt-5 p-6 sm:p-8 print:mt-0 print:border-0 print:p-0 print:shadow-none">
      <p className="section-title mb-1">Reliever brief · {longDate(brief.date)}</p>
      <h1 className="font-display text-3xl font-bold leading-tight text-ink-900">
        {brief.childCount} {brief.childCount === 1 ? "child" : "children"} in this room
      </h1>

      <ul className="mt-4 space-y-1.5">
        {brief.headlines.map((line) => (
          <li key={line} className="text-[15px] leading-relaxed text-ink-700">{line}</li>
        ))}
      </ul>

      {brief.childCount === 0 ? (
        <p className="mt-6 text-sm text-ink-500">
          No child profiles yet. Add them on Child profiles and this page fills itself from the stories your team writes.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 print:grid-cols-2">
          {brief.entries.map((entry) => (
            <section
              key={entry.childId}
              className={`break-inside-avoid rounded-2xl border p-4 ${entry.needsNoticing ? "border-clay-300 bg-cream-50" : "border-clay-100"}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-lg font-bold text-ink-900">{entry.name}</h2>
                {entry.ageGroup && <span className="text-xs text-ink-500">{entry.ageGroup}</span>}
              </div>

              {entry.needsNoticing && (
                <p className="mt-1 text-xs font-semibold text-clay-700">
                  {entry.daysSinceLastMoment === null
                    ? "Nothing captured yet. Anything you notice helps."
                    : `Nothing captured for ${entry.daysSinceLastMoment} days.`}
                </p>
              )}

              {entry.languages.length > 0 && (
                <p className="mt-2 text-sm text-ink-700"><span className="text-ink-500">At home: </span>{entry.languages.join(", ")}</p>
              )}
              {entry.intoRightNow.length > 0 && (
                <p className="mt-1 text-sm text-ink-700"><span className="text-ink-500">Into: </span>{entry.intoRightNow.join(", ")}</p>
              )}
              {entry.settles && (
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-700"><span className="text-ink-500">From the team: </span>{entry.settles}</p>
              )}

              {entry.lastMoments.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Last moments</p>
                  <ul className="mt-1 space-y-1">
                    {entry.lastMoments.map((moment) => (
                      <li key={`${moment.date}-${moment.line}`} className="text-sm leading-relaxed text-ink-700">
                        <span className="text-ink-500">{shortDate(moment.date)} · </span>{moment.line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.openNextSteps.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Already planned</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {entry.openNextSteps.map((step) => (
                      <li key={step} className="text-sm leading-relaxed text-ink-700">{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 border-t border-clay-100 pt-4 text-xs leading-relaxed text-ink-500">
        Assembled from the stories and captured moments this team has already saved. Nothing here was generated, and it is
        not a full history of any child. If something matters that is not written down, ask the team.
      </p>
    </article>
  );
}
