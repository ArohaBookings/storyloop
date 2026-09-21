import type { EvidencePack } from "@/lib/evidence-pack";

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" });

const STATUS_LABEL: Record<string, string> = { tried: "tried", continue: "worth continuing" };

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid border-t border-clay-100 pt-5">
      <h2 className="font-display text-xl font-bold text-ink-900">{title}</h2>
      {note && <p className="mt-0.5 text-xs text-ink-500">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** The printable pack. Pure: everything shown is counted from saved stories. */
export default function EvidencePackView({ pack }: { pack: EvidencePack }) {
  const { cycle, reflection, family } = pack;

  return (
    <article className="card mt-5 p-6 sm:p-8 print:mt-0 print:border-0 print:p-0 print:shadow-none">
      <p className="section-title mb-1">Evidence pack · {pack.periodLabel}</p>
      <h1 className="font-display text-3xl font-bold leading-tight text-ink-900">
        {pack.storyCount} {pack.storyCount === 1 ? "story" : "stories"} across {pack.childCount}{" "}
        {pack.childCount === 1 ? "child" : "children"}
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        {shortDate(pack.periodStart)} to {shortDate(pack.periodEnd)}
      </p>

      {pack.gaps.length > 0 && (
        <section className="mt-5 break-inside-avoid rounded-2xl border border-clay-300 bg-cream-50 p-4">
          <h2 className="font-display text-lg font-bold text-ink-900">Worth fixing before anyone asks</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            {pack.gaps.map((gap) => (
              <li key={gap} className="text-sm leading-relaxed text-ink-700">{gap}</li>
            ))}
          </ul>
        </section>
      )}

      {pack.strengths.length > 0 && (
        <section className="mt-4 break-inside-avoid rounded-2xl border border-clay-100 p-4">
          <h2 className="font-display text-lg font-bold text-ink-900">What the records already show</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            {pack.strengths.map((line) => (
              <li key={line} className="text-sm leading-relaxed text-ink-700">{line}</li>
            ))}
          </ul>
        </section>
      )}

      <Section
        title="Every child, and when they were last documented"
        note={`Sorted by who has the least, not by name. Fewer than ${pack.thinCoverage} stories in this period reads as thin coverage.`}
      >
        {pack.coverage.length === 0 ? (
          <p className="text-sm text-ink-500">
            No child profiles yet. Add them on Child profiles and this table fills itself from the stories your team writes.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-clay-100 text-[10px] font-bold uppercase tracking-wider text-ink-500">
                <th className="pb-1.5">Child</th>
                <th className="pb-1.5 text-right tabular-nums">Stories</th>
                <th className="pb-1.5 text-right">Last documented</th>
              </tr>
            </thead>
            <tbody>
              {pack.coverage.map((row) => (
                <tr key={row.childId} className={`border-b border-clay-100/60 ${row.status === "none" ? "bg-cream-50" : ""}`}>
                  <td className="py-1.5 text-ink-900">{row.name}</td>
                  <td className="py-1.5 text-right tabular-nums text-ink-700">{row.stories}</td>
                  <td className="py-1.5 text-right text-ink-700">{row.lastDate ? shortDate(row.lastDate) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section
        title="The planning cycle, start to finish"
        note="A next step written down, and then what happened when the team came back to it."
      >
        <p className="text-sm leading-relaxed text-ink-700">
          {cycle.withNextSteps} of {pack.storyCount} {pack.storyCount === 1 ? "story" : "stories"} record a next step.{" "}
          {cycle.revisited} {cycle.revisited === 1 ? "has" : "have"} been revisited, and {cycle.openNow}{" "}
          {cycle.openNow === 1 ? "step is" : "steps are"} still open.
        </p>
        {cycle.examples.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {cycle.examples.map((example) => (
              <li key={`${example.story}-${example.step}`} className="text-sm leading-relaxed text-ink-700">
                <span className="text-ink-500">{example.story}: </span>
                {example.step} <span className="text-ink-500">({STATUS_LABEL[example.status] ?? example.status})</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Critical reflection" note="Written by the educator on the story itself.">
        <p className="text-sm leading-relaxed text-ink-700">
          {reflection.count} {reflection.count === 1 ? "story carries" : "stories carry"} an educator reflection.
        </p>
        {reflection.examples.length > 0 && (
          <ul className="mt-2 space-y-2">
            {reflection.examples.map((example) => (
              <li key={example.story} className="break-inside-avoid border-l-2 border-clay-200 pl-3 text-sm leading-relaxed text-ink-700">
                <span className="text-ink-500">{example.story}: </span>{example.text}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Family voice" note="What families said back, in their own words.">
        <p className="text-sm leading-relaxed text-ink-700">
          {family.count} {family.count === 1 ? "story carries" : "stories carry"} a family&apos;s own words.
        </p>
        {family.examples.length > 0 && (
          <ul className="mt-2 space-y-2">
            {family.examples.map((example) => (
              <li key={example.story} className="break-inside-avoid border-l-2 border-sage-200 pl-3 text-sm leading-relaxed text-ink-700">
                <span className="text-ink-500">{example.story}: </span>{example.text}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Curriculum links across the period" note="Counted once per story, commonest first.">
        {pack.curriculum.length === 0 ? (
          <p className="text-sm text-ink-500">No curriculum links are recorded on stories in this period.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {pack.curriculum.map((entry) => (
              <li key={entry.link} className="rounded-full border border-clay-100 px-3 py-1 text-sm text-ink-700">
                {entry.link} <span className="tabular-nums text-ink-500">{entry.stories}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="mt-6 border-t border-clay-100 pt-4 text-xs leading-relaxed text-ink-500">
        Counted from the stories this service saved between {shortDate(pack.periodStart)} and {shortDate(pack.periodEnd)}.
        Nothing here was generated, no child is scored or compared, and this is a summary of your own records rather than a
        judgement about your service. Documentation kept outside StoryLoop will not appear.
      </p>
    </article>
  );
}
