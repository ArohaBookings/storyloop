import { AlertTriangle, CheckCircle2, Compass, Fingerprint, LockKeyhole, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { hasFeatureAccess } from "@/lib/plans";
import type { PlanKey } from "@/lib/plans";
import type { PrivacyGuardianResult } from "@/lib/privacy-guardian";

type StoryIntelligenceProps = {
  evidenceAnchors?: string[];
  educatorChecks?: string[];
  pedagogyLinks?: string[];
  frameworkEvidence?: string[];
  storyQuality?: {
    score?: number;
    passes?: boolean;
    revisionCount?: number;
    issues?: string[];
    strengths?: string[];
  };
  privacyGuardian?: PrivacyGuardianResult;
  plan?: PlanKey | string;
  familyQuestion?: string;
  followUpPrompt?: string;
};

export default function StoryIntelligence({
  evidenceAnchors = [],
  educatorChecks = [],
  pedagogyLinks = [],
  frameworkEvidence = [],
  storyQuality,
  privacyGuardian,
  plan = "free",
  familyQuestion = "",
  followUpPrompt = "",
}: StoryIntelligenceProps) {
  const advancedQuality = hasFeatureAccess(plan, "advancedQualityScore");
  if (
    evidenceAnchors.length === 0 &&
    educatorChecks.length === 0 &&
    pedagogyLinks.length === 0 &&
    frameworkEvidence.length === 0 &&
    !storyQuality &&
    !privacyGuardian &&
    !familyQuestion &&
    !followUpPrompt
  ) {
    return null;
  }

  return (
    <section className="story-safe mt-5 max-w-full overflow-hidden rounded-3xl border border-sage-200 bg-gradient-to-br from-sage-50 via-white to-cream-50 p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-700 text-paper">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="section-title mb-1">Story quality check</p>
          <h3 className="font-display text-xl font-bold text-ink-900">
            Evidence first, educator judgement last.
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">
            StoryLoop runs a draft improvement pass, then leaves the final judgement with you.
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        {storyQuality && (
          <div className="min-w-0 rounded-2xl border border-sage-100 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-ink-900">
              <Sparkles className="h-4 w-4 text-sage-700" /> Quality pass
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-600">
              {advancedQuality && typeof storyQuality.score === "number" ? `${storyQuality.score}/100 ` : ""}
              {storyQuality.passes ? "Ready for educator review." : "Generated with review notes for you to check."}
              {storyQuality.revisionCount ? ` Improved internally ${storyQuality.revisionCount} time${storyQuality.revisionCount === 1 ? "" : "s"}.` : ""}
            </p>
            {!advancedQuality && (
              <div className="mt-3 rounded-xl border border-clay-100 bg-cream-50 p-3 text-[11px] leading-relaxed text-ink-600">
                <p className="flex items-center gap-1.5 font-bold text-clay-700">
                  <LockKeyhole className="h-3.5 w-3.5" /> Advanced score details
                </p>
                <p className="mt-1">Educator Pro shows exact score, strengths, and targeted revision notes.</p>
              </div>
            )}
            {advancedQuality && storyQuality.strengths?.length ? (
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-sage-700">
                {storyQuality.strengths.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            ) : null}
            {advancedQuality && storyQuality.issues?.length ? (
              <ul className="mt-2 space-y-1 text-xs leading-relaxed text-ink-600">
                {storyQuality.issues.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            ) : null}
          </div>
        )}

        {privacyGuardian && (
          <div className={`min-w-0 rounded-2xl border bg-white p-4 ${
            privacyGuardian.status === "high"
              ? "border-red-100"
              : privacyGuardian.status === "review"
                ? "border-amber-100"
                : "border-sage-100"
          }`}>
            <p className="flex items-center gap-2 text-xs font-bold text-ink-900">
              {privacyGuardian.status === "clear" ? (
                <ShieldCheck className="h-4 w-4 text-sage-700" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-700" />
              )}
              Privacy + evidence guardian
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-600">
              {privacyGuardian.status === "clear"
                ? "No obvious privacy, diagnosis-language, or unsupported-claim flags found."
                : "Review these before sharing. StoryLoop flags risk; the educator still decides final wording."}
            </p>
            {privacyGuardian.issues.length > 0 && (
              <ul className="mt-2 space-y-2 text-xs leading-relaxed text-ink-600">
                {privacyGuardian.issues.map((item) => (
                  <li key={item.id}>
                    <strong className={item.severity === "high" ? "text-red-700" : "text-amber-700"}>{item.label}:</strong>{" "}
                    {item.detail}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {evidenceAnchors.length > 0 && (
          <div className="min-w-0 rounded-2xl border border-sage-100 bg-white p-4">
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
          <div className="min-w-0 rounded-2xl border border-clay-100 bg-white p-4">
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
          <div className="min-w-0 rounded-2xl border border-clay-100 bg-white p-4">
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

        {frameworkEvidence.length > 0 && (
          <div className="min-w-0 rounded-2xl border border-clay-100 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-bold text-ink-900">
              <Compass className="h-4 w-4 text-clay-700" /> Why these links fit
            </p>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-ink-600">
              {frameworkEvidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {(familyQuestion || followUpPrompt) && (
          <div className="min-w-0 rounded-2xl border border-clay-100 bg-white p-4">
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
