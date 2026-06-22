"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, LockKeyhole, Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { hasFeatureAccess, normalizePlanKey, type PlanKey } from "@/lib/plans";

type Preferences = {
  centrePhilosophy?: string;
  likedPhrases?: string[];
  avoidedPhrases?: string[];
  approvedStoryExample?: string;
  qualityNotes?: string;
  privacyRules?: string[];
  exportStyle?: string;
};

function lines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function csv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export default function CentreToolsPage() {
  const [plan, setPlan] = useState<PlanKey>("free");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [centrePhilosophy, setCentrePhilosophy] = useState("");
  const [likedPhrases, setLikedPhrases] = useState("");
  const [avoidedPhrases, setAvoidedPhrases] = useState("");
  const [approvedStoryExample, setApprovedStoryExample] = useState("");
  const [qualityNotes, setQualityNotes] = useState("");
  const [privacyRules, setPrivacyRules] = useState("");
  const [exportStyle, setExportStyle] = useState("balanced");

  const canUseCalibration = hasFeatureAccess(plan, "centreQualityCalibration");

  useEffect(() => {
    void fetch("/api/me")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const profile = data?.profile;
        const preferences = (profile?.story_preferences ?? {}) as Preferences;
        setPlan(normalizePlanKey(profile?.plan));
        setCentrePhilosophy(preferences.centrePhilosophy ?? "");
        setLikedPhrases(preferences.likedPhrases?.join(", ") ?? "");
        setAvoidedPhrases(preferences.avoidedPhrases?.join(", ") ?? "");
        setApprovedStoryExample(preferences.approvedStoryExample ?? "");
        setQualityNotes(preferences.qualityNotes ?? "");
        setPrivacyRules(preferences.privacyRules?.join("\n") ?? "");
        setExportStyle(preferences.exportStyle ?? "balanced");
      })
      .catch(() => setError("Could not load centre settings."))
      .finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centrePhilosophy,
          likedPhrases: csv(likedPhrases),
          avoidedPhrases: csv(avoidedPhrases),
          approvedStoryExample,
          qualityNotes,
          privacyRules: lines(privacyRules),
          exportStyle,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save centre settings.");
      setMessage("Centre quality settings saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save centre settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-clay-200 bg-gradient-to-br from-cream-100 via-white to-sage-50 p-6 md:p-8 shadow-warm">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-clay-300/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="section-title mb-3">Centre tools</p>
            <h1 className="font-display text-4xl font-bold text-ink-900">Quality calibration for consistent stories.</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-600 md:text-base">
              Set the centre voice, privacy rules, export preferences, and examples of what “good” sounds like. StoryLoop uses this as a style and safety guide, not as evidence.
            </p>
          </div>
          {!canUseCalibration && !loading && (
            <Link href="/billing?feature=centre-quality-calibration" className="btn-primary flex-shrink-0">
              Unlock Centre Starter
            </Link>
          )}
        </div>
      </div>

      {!loading && !canUseCalibration && (
        <div className="mt-6 rounded-3xl border border-clay-200 bg-cream-50 p-5 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-clay-700 text-paper">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-ink-900">Centre Quality Calibration is a Centre feature.</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                Individual plans keep personal voice memory. Centre Starter adds shared quality rules for team rollout.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading centre settings...
        </div>
      ) : (
        <div className={`mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr] ${canUseCalibration ? "" : "opacity-70"}`}>
          <section className="card p-5 md:p-6">
            <div className="mb-5 flex items-start gap-3">
              <SlidersHorizontal className="mt-1 h-5 w-5 text-clay-700" />
              <div>
                <p className="section-title mb-1">Centre voice memory</p>
                <h2 className="font-display text-2xl font-bold text-ink-900">Make drafts sound like your service.</h2>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Centre philosophy or room voice</label>
                <textarea value={centrePhilosophy} onChange={(event) => setCentrePhilosophy(event.target.value)} rows={5} disabled={!canUseCalibration} className="input resize-y text-sm" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label">Words or phrases to use</label>
                  <input value={likedPhrases} onChange={(event) => setLikedPhrases(event.target.value)} disabled={!canUseCalibration} className="input" placeholder="working theories, child agency, family partnership" />
                </div>
                <div>
                  <label className="label">Words or phrases to avoid</label>
                  <input value={avoidedPhrases} onChange={(event) => setAvoidedPhrases(event.target.value)} disabled={!canUseCalibration} className="input" placeholder="beautiful moment, demonstrated, mastered" />
                </div>
              </div>
              <div>
                <label className="label">Approved story example</label>
                <textarea value={approvedStoryExample} onChange={(event) => setApprovedStoryExample(event.target.value)} rows={7} disabled={!canUseCalibration} className="input resize-y text-sm" placeholder="Paste one strong, anonymised story. StoryLoop uses tone and structure only, not facts." />
              </div>
            </div>
          </section>

          <section className="card p-5 md:p-6">
            <div className="mb-5 flex items-start gap-3">
              <ShieldCheck className="mt-1 h-5 w-5 text-sage-700" />
              <div>
                <p className="section-title mb-1">Safety and exports</p>
                <h2 className="font-display text-2xl font-bold text-ink-900">Set the rules once.</h2>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Quality notes</label>
                <textarea value={qualityNotes} onChange={(event) => setQualityNotes(event.target.value)} rows={4} disabled={!canUseCalibration} className="input resize-y text-sm" placeholder="Example: keep stories concise, name educator response, avoid exaggerated claims." />
              </div>
              <div>
                <label className="label">Privacy rules</label>
                <textarea value={privacyRules} onChange={(event) => setPrivacyRules(event.target.value)} rows={6} disabled={!canUseCalibration} className="input resize-y text-sm" placeholder={"One rule per line\nDo not include surnames\nDo not mention diagnosis unless family-approved"} />
              </div>
              <div>
                <label className="label">Default export style</label>
                <select value={exportStyle} onChange={(event) => setExportStyle(event.target.value)} disabled={!canUseCalibration} className="input">
                  <option value="balanced">Balanced</option>
                  <option value="storypark">Storypark-style</option>
                  <option value="educa">Educa-style</option>
                  <option value="kinderloop">Kinderloop-style</option>
                  <option value="brightwheel">Brightwheel-style</option>
                </select>
              </div>
              <button type="button" onClick={saveSettings} disabled={saving || !canUseCalibration} className="btn-primary w-full justify-center py-3 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save centre settings
              </button>
              {message && <p className="flex items-center gap-1.5 text-xs font-semibold text-sage-700"><CheckCircle2 className="h-4 w-4" /> {message}</p>}
              {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
