import { CheckCircle2, Compass, Fingerprint, MessageCircle, ShieldCheck } from "lucide-react";

type StoryIntelligenceProps = {
  evidenceAnchors?: string[];
  educatorChecks?: string[];
  pedagogyLinks?: string[];
  familyQuestion?: string;
  followUpPrompt?: string;
};

export default function StoryIntelligence({
  evidenceAnchors = [],
  educatorChecks = [],
  pedagogyLinks = [],
  familyQuestion = "",
  followUpPrompt = "",
}: StoryIntelligenceProps) {
  if (
    evidenceAnchors.length === 0 &&
    educatorChecks.length === 0 &&
    pedagogyLinks.length === 0 &&
    !familyQuestion &&
    !followUpPrompt
  ) {
    return null;
  }

  return (
    <section className="mt-5 rounded-3xl border border-sage-200 bg-gradient-to-br from-sage-50 via-white to-cream-50 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-700 text-paper">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="section-title mb-1">Draft integrity lens</p>
          <h3 className="font-display text-xl font-bold text-ink-900">
            Evidence first, educator judgement last.
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">
            Use these checks before copying or sharing. They are prompts, not automated sign-off.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {evidenceAnchors.length > 0 && (
          <div className="rounded-2xl border border-sage-100 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-ink-900">
              <Fingerprint className="h-4 w-4 text-sage-700" /> Evidence anchors
            </p>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-ink-600">
              {evidenceAnchors.map((item) => (
                <li key={item}>“{item}”</li>
              ))}
            </ul>
          </div>
        )}

        {educatorChecks.length > 0 && (
          <div className="rounded-2xl border border-clay-100 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-ink-900">
              <CheckCircle2 className="h-4 w-4 text-clay-700" /> Before you share
            </p>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-ink-600">
              {educatorChecks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {pedagogyLinks.length > 0 && (
          <div className="rounded-2xl border border-clay-100 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-ink-900">
              <Compass className="h-4 w-4 text-clay-700" /> Pedagogy in practice
            </p>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-ink-600">
              {pedagogyLinks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {(familyQuestion || followUpPrompt) && (
          <div className="rounded-2xl border border-clay-100 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-ink-900">
              <MessageCircle className="h-4 w-4 text-clay-700" /> Keep the loop moving
            </p>
            {familyQuestion && (
              <p className="mt-2 text-xs leading-relaxed text-ink-600">
                <strong className="text-ink-800">Ask family:</strong> {familyQuestion}
              </p>
            )}
            {followUpPrompt && (
              <p className="mt-2 text-xs leading-relaxed text-ink-600">
                <strong className="text-ink-800">Notice next:</strong> {followUpPrompt}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
