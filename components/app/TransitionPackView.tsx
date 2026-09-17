import type { PackAudience, TransitionPack } from "@/lib/transition-pack";

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** The printable pack itself. Pure: everything it shows comes from the assembled pack. */
export default function TransitionPackView({
  pack,
  childName,
  audience,
}: {
  pack: TransitionPack;
  childName: string;
  audience: PackAudience;
}) {
  const hasProfileDetail = pack.loves.length > 0 || pack.languages.length > 0;

  return (
    <article className="card mt-5 p-6 sm:p-8 print:mt-0 print:border-0 print:p-0 print:shadow-none">
      <p className="section-title mb-1">{pack.eyebrow}</p>
      <h1 className="font-display text-3xl font-bold leading-tight text-ink-900">{pack.title}</h1>
      {pack.destinationLine && <p className="mt-1 text-[15px] text-ink-600">{pack.destinationLine}</p>}

      {pack.familyWords.length > 0 && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="font-display text-lg font-bold text-ink-900">{pack.headings.family}</h2>
          <div className="mt-2 space-y-2">
            {pack.familyWords.map((words) => (
              <p key={words} className="whitespace-pre-line border-l-2 border-clay-300 pl-3 text-[15px] leading-relaxed text-ink-700">
                {words}
              </p>
            ))}
          </div>
        </section>
      )}

      {hasProfileDetail && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
          {pack.loves.length > 0 && (
            <section className="break-inside-avoid">
              <h2 className="font-display text-lg font-bold text-ink-900">{pack.headings.loves}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{pack.loves.join(", ")}</p>
            </section>
          )}
          {pack.languages.length > 0 && (
            <section className="break-inside-avoid">
              <h2 className="font-display text-lg font-bold text-ink-900">{pack.headings.languages}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{pack.languages.join(", ")}</p>
            </section>
          )}
        </div>
      )}

      {pack.learns.length > 0 && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="font-display text-lg font-bold text-ink-900">{pack.headings.learns}</h2>
          <ul className="mt-2 space-y-1.5 text-[15px] leading-relaxed text-ink-700">
            {pack.learns.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </section>
      )}

      {pack.moments.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-lg font-bold text-ink-900">{pack.headings.moments}</h2>
          <div className="mt-3 space-y-4">
            {pack.moments.map((moment) => (
              <div key={moment.id} className="break-inside-avoid border-l-2 border-sage-300 pl-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{longDate(moment.date)}</p>
                <h3 className="mt-0.5 font-semibold text-ink-900">{moment.title}</h3>
                {moment.summary && <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{moment.summary}</p>}
                {moment.childVoice && (
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">
                    <span className="text-xs font-semibold uppercase tracking-wider text-clay-700">Child&apos;s voice </span>
                    {moment.childVoice}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {pack.pickUp.length > 0 && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="font-display text-lg font-bold text-ink-900">{pack.headings.pickUp}</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-ink-700">
            {pack.pickUp.map((step) => <li key={step}>{step}</li>)}
          </ul>
        </section>
      )}

      <p className="mt-8 font-display text-lg text-ink-900">{pack.closing}</p>

      <p className="mt-6 border-t border-clay-100 pt-4 text-xs leading-relaxed text-ink-500">
        Assembled from {pack.moments.length} saved {pack.moments.length === 1 ? "learning story" : "learning stories"} and{" "}
        {childName}&apos;s profile. Nothing was added or rewritten.
        {audience === "teacher" ? " This is a companion to any official transition statement your state or service requires, not a replacement for it." : ""}
      </p>
    </article>
  );
}
