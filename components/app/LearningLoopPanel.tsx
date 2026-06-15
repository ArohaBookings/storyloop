"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleDot, Loader2, MessageCircleHeart, Save } from "lucide-react";

type NextStepStatus = "planned" | "tried" | "continue";

type NextStepProgress = {
  text: string;
  status: NextStepStatus;
  note?: string;
};

type ReviewChecklist = {
  evidence: boolean;
  childVoice: boolean;
  curriculum: boolean;
  culture: boolean;
  privacy: boolean;
};

const REVIEW_ITEMS: Array<{ key: keyof ReviewChecklist; label: string }> = [
  { key: "evidence", label: "Claims are grounded in the recorded observation" },
  { key: "childVoice", label: "Child voice is quoted, observed, or clearly marked as interpretation" },
  { key: "curriculum", label: "Curriculum links are specific and useful for planning" },
  { key: "culture", label: "Identity, language, culture, and whānau context are represented respectfully" },
  { key: "privacy", label: "Unnecessary personal or sensitive details have been removed" },
];

function record(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function initialProgress(nextSteps: string[], metadata: Record<string, unknown>): NextStepProgress[] {
  if (Array.isArray(metadata.nextStepProgress)) {
    const saved = metadata.nextStepProgress.flatMap((entry) => {
      const item = record(entry);
      const text = typeof item.text === "string" ? item.text.trim() : "";
      const status: NextStepStatus =
        item.status === "tried" || item.status === "continue" ? item.status : "planned";
      const note = typeof item.note === "string" ? item.note : "";
      return text ? [{ text, status, ...(note ? { note } : {}) }] : [];
    });
    if (saved.length) return saved;
  }

  return nextSteps.map((text) => ({ text, status: "planned" }));
}

function initialChecklist(metadata: Record<string, unknown>): ReviewChecklist {
  const saved = record(metadata.reviewChecklist);
  return {
    evidence: saved.evidence === true,
    childVoice: saved.childVoice === true,
    curriculum: saved.curriculum === true,
    culture: saved.culture === true,
    privacy: saved.privacy === true,
  };
}

export default function LearningLoopPanel({
  storyId,
  childName,
  nextSteps,
  metadata: rawMetadata,
}: {
  storyId: string;
  childName: string | null;
  nextSteps: string[];
  metadata: unknown;
}) {
  const metadata = useMemo(() => record(rawMetadata), [rawMetadata]);
  const [progress, setProgress] = useState(() => initialProgress(nextSteps, metadata));
  const [whanauVoice, setWhanauVoice] = useState(
    typeof metadata.whanauVoice === "string" ? metadata.whanauVoice : ""
  );
  const [checklist, setChecklist] = useState(() => initialChecklist(metadata));
  const [reviewedAt, setReviewedAt] = useState(
    typeof metadata.reviewedAt === "string" ? metadata.reviewedAt : ""
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setProgress(initialProgress(nextSteps, metadata));
    setWhanauVoice(typeof metadata.whanauVoice === "string" ? metadata.whanauVoice : "");
    setChecklist(initialChecklist(metadata));
    setReviewedAt(typeof metadata.reviewedAt === "string" ? metadata.reviewedAt : "");
  }, [metadata, nextSteps]);

  const reviewComplete = Object.values(checklist).every(Boolean);

  const updateProgress = (index: number, updates: Partial<NextStepProgress>) => {
    setProgress((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item))
    );
  };

  const saveLoop = async (markReviewed: boolean) => {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/stories/${encodeURIComponent(storyId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whanauVoice,
          nextStepProgress: progress,
          reviewChecklist: checklist,
          markReviewed,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save the learning loop.");
      setReviewedAt(markReviewed ? data.reviewedAt ?? new Date().toISOString() : "");
      setMessage(markReviewed ? "Educator review complete." : "Learning loop saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the learning loop.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-sage-200 bg-sage-50/50 p-4">
        <div className="mb-4 flex items-start gap-3">
          <CircleDot className="mt-0.5 h-5 w-5 text-sage-700" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-sage-700">Response pathway</p>
            <h3 className="font-display text-lg font-bold text-ink-900">Turn next steps into a visible loop</h3>
            <p className="mt-1 text-xs text-ink-600">
              Track what was planned, tried, or worth continuing. This records educator response, not child performance.
            </p>
          </div>
        </div>
        {progress.length ? (
          <div className="space-y-3">
            {progress.map((item, index) => (
              <div key={`${item.text}-${index}`} className="rounded-xl border border-sage-100 bg-white p-3">
                <p className="text-sm font-semibold text-ink-800">{item.text}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-[150px_1fr]">
                  <select
                    value={item.status}
                    onChange={(event) => updateProgress(index, { status: event.target.value as NextStepStatus })}
                    className="input py-2 text-xs"
                    aria-label={`Status for ${item.text}`}
                  >
                    <option value="planned">Planned</option>
                    <option value="tried">Tried</option>
                    <option value="continue">Continue exploring</option>
                  </select>
                  <input
                    value={item.note ?? ""}
                    onChange={(event) => updateProgress(index, { note: event.target.value })}
                    className="input py-2 text-xs"
                    placeholder="What changed or what did you notice?"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-ink-500">No next steps were saved with this story.</p>
        )}
      </section>

      <section className="rounded-2xl border border-clay-200 bg-cream-50 p-4">
        <div className="mb-4 flex items-start gap-3">
          <MessageCircleHeart className="mt-0.5 h-5 w-5 text-clay-700" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-clay-700">Whānau voice bridge</p>
            <h3 className="font-display text-lg font-bold text-ink-900">Bring home knowledge back into planning</h3>
            <p className="mt-1 text-xs text-ink-600">
              Capture a response, connection, home-language phrase, or aspiration shared by family or whānau.
            </p>
          </div>
        </div>
        <textarea
          value={whanauVoice}
          onChange={(event) => setWhanauVoice(event.target.value)}
          className="input min-h-28 resize-y text-sm"
          placeholder={`${childName || "The family"} shared... At home they have noticed...`}
        />
      </section>

      <section className="rounded-2xl border border-clay-200 bg-white p-4 xl:col-span-2">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-clay-700">Reflective quality check</p>
            <h3 className="font-display text-lg font-bold text-ink-900">A human checkpoint before sharing</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {REVIEW_ITEMS.map((item) => (
                <label key={item.key} className="flex items-start gap-2 text-xs text-ink-700">
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={(event) =>
                      setChecklist((current) => ({ ...current, [item.key]: event.target.checked }))
                    }
                    className="mt-0.5 accent-clay-700"
                  />
                  {item.label}
                </label>
              ))}
            </div>
            {reviewedAt && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sage-700">
                <CheckCircle2 className="h-4 w-4" />
                Reviewed {new Date(reviewedAt).toLocaleDateString("en-AU")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveLoop(false)}
              disabled={saving}
              className="btn-secondary px-4 py-2 text-xs disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save loop
            </button>
            <button
              type="button"
              onClick={() => saveLoop(true)}
              disabled={saving || !reviewComplete}
              className="btn-primary px-4 py-2 text-xs disabled:opacity-50"
            >
              <CheckCircle2 className="h-3 w-3" />
              Mark educator reviewed
            </button>
          </div>
        </div>
        {message && <p className="mt-3 text-xs font-semibold text-sage-700">{message}</p>}
        {error && <p className="mt-3 text-xs font-semibold text-red-700">{error}</p>}
      </section>
    </div>
  );
}
