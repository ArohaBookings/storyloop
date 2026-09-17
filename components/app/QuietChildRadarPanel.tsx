import Link from "next/link";
import { Eye, Sun } from "lucide-react";
import { quietSentence, type QuietChildRadar } from "@/lib/quiet-radar";
import type { TermSettings } from "@/lib/term-settings";
import TermSettingsForm from "@/components/app/TermSettingsForm";

/**
 * Who has not been noticed lately. Server rendered, no client state.
 *
 * Educators on Educator Pro see their own children. Everyone else sees a short,
 * clearly labelled EXAMPLE with invented names: their own children are never
 * shown partially to push an upgrade, because holding someone's documentation
 * back to sell them something contradicts what StoryLoop promises.
 */
export default function QuietChildRadarPanel({
  radar,
  settings,
  hasAccess,
  settingsAvailable,
}: {
  radar: QuietChildRadar | null;
  settings: TermSettings;
  hasAccess: boolean;
  settingsAvailable: boolean;
}) {
  if (!hasAccess) {
    return (
      <section className="mb-6 rounded-3xl border border-clay-100 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="section-title mb-1">Educator Pro</p>
            <h2 className="font-display text-xl font-bold text-ink-900">Who hasn&apos;t been noticed lately?</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
              A quiet check across your children: anyone with no captured moments for eight working days. It skips
              weekends and, if your service closes, school holidays. No scores, no rankings. You decide whether it was a
              noticing gap or just a quiet week.
            </p>
          </div>
          <Link href="/billing?feature=quiet-child-radar" className="btn-primary flex-shrink-0 text-sm">
            See Educator Pro
          </Link>
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-clay-200 bg-cream-50 p-4" aria-label="Example">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-clay-700">Example, not your children</p>
          <ul className="space-y-1.5 text-sm text-ink-700">
            <li><strong className="font-semibold text-ink-900">Mere</strong> · No captured moments in 9 working days.</li>
            <li><strong className="font-semibold text-ink-900">Theo</strong> · No moments captured yet.</li>
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-3xl border border-clay-100 bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="section-title mb-1">{radar?.termLabel ?? "This term"}</p>
          <h2 className="font-display text-xl font-bold text-ink-900">Who hasn&apos;t been noticed lately?</h2>
        </div>
        {radar && (
          <p className="text-xs text-ink-500">
            No moments in {radar.threshold} working days or more
          </p>
        )}
      </div>

      {settingsAvailable && (
        <div className="mb-4">
          <TermSettingsForm
            jurisdiction={settings.jurisdiction}
            followsSchoolTerms={settings.followsSchoolTerms}
            configured={settings.configured}
          />
        </div>
      )}

      {!radar ? (
        <p className="text-sm text-ink-500">Add a child profile to see this.</p>
      ) : radar.onHoliday ? (
        <p className="flex items-start gap-2 rounded-2xl bg-sage-50 p-4 text-sm text-ink-700">
          <Sun className="mt-0.5 h-4 w-4 flex-none text-sage-600" />
          It is the school holidays, so nobody is flagged. Enjoy the break.
        </p>
      ) : radar.worthNoticing.length === 0 ? (
        <p className="flex items-start gap-2 rounded-2xl bg-sage-50 p-4 text-sm text-ink-700">
          <Eye className="mt-0.5 h-4 w-4 flex-none text-sage-600" />
          Every child has a captured moment within the last {radar.threshold} working days.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {radar.worthNoticing.map((entry) => (
              <li key={entry.childId} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-clay-100 bg-cream-50 px-4 py-3">
                <span className="min-w-0 text-sm text-ink-700">
                  <strong className="font-semibold text-ink-900">{entry.childName}</strong>
                  {" · "}
                  {quietSentence(entry, radar.termLabel)}
                </span>
                <Link href={`/today?child=${encodeURIComponent(entry.childId)}`} className="text-xs font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900">
                  Capture a moment
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            This is not a judgement about any child. It might be a noticing gap, or just a quiet week. That is your call.
          </p>
        </>
      )}
    </section>
  );
}
