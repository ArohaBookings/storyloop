"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Copy, Download, Loader2, Pencil, RefreshCw, Save, X } from "lucide-react";
import StoryIntelligence from "@/components/app/StoryIntelligence";
import LearningLoopPanel from "@/components/app/LearningLoopPanel";
import {
  normalizeDepth,
  normalizeFramework,
  normalizePedagogyFocus,
  normalizeTeReoLevel,
  normalizeTone,
  type StoryDepth,
  type StoryFrameworkId,
  type PedagogyFocus,
  type StoryTone,
  type TeReoLevel,
} from "@/lib/story-options";

type StoryHistoryItemProps = {
  story: {
    id: string;
    child_name: string | null;
    age_group: string | null;
    observations: string | null;
    tone: string | null;
    location: string | null;
    created_at: string;
    updated_at?: string | null;
    story_text: string;
    outcomes: string[] | null;
    next_steps: string[] | null;
    metadata: unknown;
  };
};

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function toDownloadName(childName?: string | null) {
  return (childName || "learning-story").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learning-story";
}

export default function StoryHistoryItem({ story }: StoryHistoryItemProps) {
  const router = useRouter();
  const initialMetadata = asRecord(story.metadata);
  const initialSettings = asRecord(initialMetadata.storySettings);

  const [storyText, setStoryText] = useState(story.story_text);
  const [draft, setDraft] = useState(story.story_text);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [billingRequired, setBillingRequired] = useState(false);
  const [currentOutcomes, setCurrentOutcomes] = useState<string[]>(story.outcomes ?? []);
  const [currentNextSteps, setCurrentNextSteps] = useState<string[]>(story.next_steps ?? []);
  const [currentMetadata, setCurrentMetadata] = useState<Record<string, unknown>>(initialMetadata);
  const [currentUpdatedAt, setCurrentUpdatedAt] = useState(
    story.updated_at ?? (typeof initialMetadata.editedAt === "string" ? initialMetadata.editedAt : story.created_at)
  );
  const [regenerateTone, setRegenerateTone] = useState<StoryTone>(normalizeTone(story.tone ?? (initialSettings.tone as string | undefined)));
  const [regenerateDepth, setRegenerateDepth] = useState<StoryDepth>(normalizeDepth(initialSettings.depth as string | undefined));
  const [regenerateFramework, setRegenerateFramework] = useState<StoryFrameworkId>(
    normalizeFramework(story.location ?? (initialSettings.framework as string | undefined))
  );
  const [regenerateTeReo, setRegenerateTeReo] = useState<TeReoLevel>(
    normalizeTeReoLevel(initialSettings.includeTeReoLevel as string | undefined)
  );
  const [regenerateKowhiti, setRegenerateKowhiti] = useState(
    typeof initialSettings.includeKowhitiWhakapae === "boolean" ? initialSettings.includeKowhitiWhakapae : false
  );
  const [regenerateTapasa, setRegenerateTapasa] = useState(
    typeof initialSettings.includeTapasa === "boolean" ? initialSettings.includeTapasa : false
  );
  const [regeneratePedagogyFocus, setRegeneratePedagogyFocus] = useState<PedagogyFocus>(
    normalizePedagogyFocus(initialSettings.pedagogyFocus as string | undefined)
  );
  const [educatorReflection, setEducatorReflection] = useState(
    typeof initialMetadata.educatorReflection === "string" ? initialMetadata.educatorReflection : ""
  );
  const [followUpStatus, setFollowUpStatus] = useState<"open" | "revisited">(
    initialMetadata.followUpStatus === "revisited" ? "revisited" : "open"
  );
  const [savingReflection, setSavingReflection] = useState(false);

  const metadata = currentMetadata;
  const learningSummary = typeof metadata.learningSummary === "string" ? metadata.learningSummary : "";
  const childVoice = typeof metadata.childVoice === "string" ? metadata.childVoice : "";
  const curriculumLinks = asStringArray(metadata.curriculumLinks);
  const learningDispositions = asStringArray(metadata.learningDispositions);
  const socialEmotionalLinks = asStringArray(metadata.socialEmotionalLinks);
  const culturalConnections = asStringArray(metadata.culturalConnections);
  const assumptions = asStringArray(metadata.assumptions);
  const whanauConnection = typeof metadata.whanauConnection === "string" ? metadata.whanauConnection : "";
  const evidenceAnchors = asStringArray(metadata.evidenceAnchors);
  const educatorChecks = asStringArray(metadata.educatorChecks);
  const pedagogyLinks = asStringArray(metadata.pedagogyLinks);
  const familyQuestion = typeof metadata.familyQuestion === "string" ? metadata.familyQuestion : "";
  const followUpPrompt = typeof metadata.followUpPrompt === "string" ? metadata.followUpPrompt : "";
  const wasEdited = Boolean(currentUpdatedAt && currentUpdatedAt !== story.created_at);

  const startEdit = () => {
    setDraft(storyText);
    setMessage("");
    setError("");
    setUpgradeRequired(false);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(storyText);
    setEditing(false);
    setError("");
  };

  const saveStory = async () => {
    const nextStory = draft.trim();
    if (nextStory.length < 20) {
      setError("Keep at least 20 characters before saving.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    setUpgradeRequired(false);
    setBillingRequired(false);

    try {
      const response = await fetch(`/api/stories/${encodeURIComponent(story.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story: nextStory }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not save story edits.");
      }

      const savedStory = data.story ?? nextStory;
      setStoryText(savedStory);
      setDraft(savedStory);
      setCurrentUpdatedAt(data.updatedAt ?? new Date().toISOString());
      setEditing(false);
      setMessage("Saved.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save story edits.");
    } finally {
      setSaving(false);
    }
  };

  const regenerateStory = async () => {
    setRegenerating(true);
    setError("");
    setMessage("");
    setUpgradeRequired(false);

    try {
      const response = await fetch(`/api/stories/${encodeURIComponent(story.id)}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone: regenerateTone,
          depth: regenerateDepth,
          location: regenerateFramework,
          includeTeReoLevel: regenerateTeReo,
          includeKowhitiWhakapae: regenerateKowhiti,
          includeTapasa: regenerateTapasa,
          pedagogyFocus: regeneratePedagogyFocus,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setUpgradeRequired(Boolean(data.upgradeRequired));
        setBillingRequired(Boolean(data.billingRequired));
        throw new Error(data.error ?? "Could not regenerate story.");
      }

      setStoryText(data.story);
      setDraft(data.story);
      setCurrentOutcomes(data.outcomes ?? []);
      setCurrentNextSteps(data.nextSteps ?? []);
      setCurrentUpdatedAt(data.updatedAt ?? new Date().toISOString());
      setCurrentMetadata((previous) => ({
        ...previous,
        storyTitle: data.storyTitle,
        learningSummary: data.learningSummary,
        childVoice: data.childVoice,
        curriculumLinks: data.curriculumLinks,
        learningDispositions: data.learningDispositions,
        socialEmotionalLinks: data.socialEmotionalLinks,
        culturalConnections: data.culturalConnections,
        whanauConnection: data.whanauConnection,
        assumptions: data.assumptions,
        evidenceAnchors: data.evidenceAnchors,
        educatorChecks: data.educatorChecks,
        pedagogyLinks: data.pedagogyLinks,
        familyQuestion: data.familyQuestion,
        followUpPrompt: data.followUpPrompt,
        storySettings: {
          framework: regenerateFramework,
          tone: regenerateTone,
          depth: regenerateDepth,
          includeTeReoLevel: regenerateTeReo,
          includeKowhitiWhakapae: regenerateKowhiti,
          includeTapasa: regenerateTapasa,
          pedagogyFocus: regeneratePedagogyFocus,
        },
      }));
      setMessage("Regenerated from the original observation.");
      router.refresh();
    } catch (regenerateError) {
      setError(regenerateError instanceof Error ? regenerateError.message : "Could not regenerate story.");
    } finally {
      setRegenerating(false);
    }
  };

  const saveReflection = async () => {
    setSavingReflection(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/stories/${encodeURIComponent(story.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ educatorReflection, followUpStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save reflection.");
      setCurrentMetadata((previous) => ({
        ...previous,
        educatorReflection,
        followUpStatus,
      }));
      setCurrentUpdatedAt(data.updatedAt ?? new Date().toISOString());
      setMessage("Educator reflection saved.");
      router.refresh();
    } catch (reflectionError) {
      setError(reflectionError instanceof Error ? reflectionError.message : "Could not save reflection.");
    } finally {
      setSavingReflection(false);
    }
  };

  const copyStory = async () => {
    await navigator.clipboard.writeText(storyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadStory = () => {
    const blob = new Blob([storyText], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${toDownloadName(story.child_name)}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <details className="card p-6 group">
      <summary className="list-none flex items-start justify-between gap-4 cursor-pointer">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-display font-bold text-ink-900">{story.child_name ?? "Learning story"}</p>
            {story.age_group && <span className="text-xs text-ink-500">· {story.age_group}</span>}
            <span className="text-xs text-ink-400">· Created {formatDate(story.created_at)}</span>
            {wasEdited && <span className="text-xs text-clay-600">· Edited {formatDate(currentUpdatedAt)}</span>}
          </div>
          <p className="text-sm text-ink-600 line-clamp-2">{storyText.slice(0, 200)}...</p>
          {currentOutcomes.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {currentOutcomes.map((outcome) => (
                <span key={outcome} className="text-[10px] font-mono bg-cream-100 text-clay-700 px-2 py-0.5 rounded-full">
                  {outcome}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="text-clay-500 text-xl flex-shrink-0 group-open:rotate-45 transition-transform">+</span>
      </summary>

      <div className="mt-5 pt-5 border-t border-clay-100">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider">Saved story</p>
          <div className="flex items-center gap-2 flex-wrap">
            {!editing && (
              <button onClick={startEdit} className="btn-ghost px-3 py-1.5 text-xs">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
            <button onClick={copyStory} className="btn-ghost px-3 py-1.5 text-xs">
              {copied ? <Check className="w-3 h-3 text-sage-600" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={downloadStory} className="btn-ghost px-3 py-1.5 text-xs">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="input min-h-[280px] resize-y text-sm leading-relaxed font-display cursor-text"
              aria-label="Edit saved learning story"
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-ink-500">Save keeps the same curriculum links and updates the edited date.</p>
              <div className="flex items-center gap-2">
                <button onClick={cancelEdit} disabled={saving} className="btn-secondary px-4 py-2 text-xs">
                  <X className="w-3 h-3" /> Cancel
                </button>
                <button onClick={saveStory} disabled={saving || draft.trim().length < 20} className="btn-primary px-4 py-2 text-xs disabled:opacity-50">
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-ink-800 leading-relaxed whitespace-pre-wrap font-display">
            {storyText}
          </div>
        )}

        {message && <p className="mt-3 text-xs font-semibold text-sage-700">{message}</p>}
        {error && (
          <div className="mt-3 text-xs font-semibold text-red-700">
            <p>{error}</p>
            {upgradeRequired && (
              <Link href="/billing" className="underline">
                Upgrade for unlimited stories
              </Link>
            )}
            {billingRequired && (
              <span className="mt-1 flex flex-wrap gap-2">
                <Link href="/billing" className="underline">
                  Fix payment
                </Link>
                <Link href="/support" className="underline">
                  Contact support
                </Link>
              </span>
            )}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-clay-100 bg-cream-50 p-4">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1">Regenerate from original observation</p>
              <p className="text-xs text-ink-600">Use this when the observation is good but you want a different tone, depth, or curriculum lens.</p>
            </div>
            <div className="grid sm:grid-cols-5 gap-2">
              <select value={regenerateTone} onChange={(event) => setRegenerateTone(normalizeTone(event.target.value))} className="input text-xs">
                <option value="natural">Natural educator</option>
                <option value="warm">Warm reflective</option>
                <option value="professional">Professional</option>
                <option value="simple">Simple</option>
              </select>
              <select value={regenerateDepth} onChange={(event) => setRegenerateDepth(normalizeDepth(event.target.value))} className="input text-xs">
                <option value="concise">Concise</option>
                <option value="balanced">Balanced</option>
                <option value="detailed">Detailed</option>
              </select>
              <select value={regenerateFramework} onChange={(event) => setRegenerateFramework(normalizeFramework(event.target.value))} className="input text-xs">
                <option value="AU">EYLF</option>
                <option value="NZ">Te Whāriki</option>
              </select>
              <select value={regenerateTeReo} onChange={(event) => setRegenerateTeReo(normalizeTeReoLevel(event.target.value))} className="input text-xs">
                <option value="low">Low te reo</option>
                <option value="medium">Medium te reo</option>
                <option value="high">High te reo</option>
              </select>
              <select value={regeneratePedagogyFocus} onChange={(event) => setRegeneratePedagogyFocus(normalizePedagogyFocus(event.target.value))} className="input text-xs">
                <option value="balanced">Balanced lens</option>
                <option value="intentional_teaching">Intentional teaching</option>
                <option value="child_voice">Child voice</option>
                <option value="family_partnership">Family partnership</option>
                <option value="working_theories">Working theories</option>
              </select>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap gap-3 text-xs text-ink-600">
                <label className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={regenerateKowhiti} onChange={(event) => setRegenerateKowhiti(event.target.checked)} className="accent-clay-700" />
                  Kōwhiti Whakapae
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={regenerateTapasa} onChange={(event) => setRegenerateTapasa(event.target.checked)} className="accent-clay-700" />
                  Tapasā
                </label>
              </div>
              <button onClick={regenerateStory} disabled={regenerating || !story.observations} className="btn-secondary px-4 py-2 text-xs disabled:opacity-50">
                {regenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Regenerate
              </button>
            </div>
          </div>
        </div>

        {(learningSummary ||
          childVoice ||
          curriculumLinks.length > 0 ||
          learningDispositions.length > 0 ||
          socialEmotionalLinks.length > 0 ||
          culturalConnections.length > 0 ||
          currentNextSteps.length > 0 ||
          assumptions.length > 0 ||
          whanauConnection) && (
          <div className="mt-5 space-y-4">
            {learningSummary && (
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">What this learning shows</p>
                <p className="text-sm text-ink-700">{learningSummary}</p>
              </div>
            )}

            {childVoice && (
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Child&apos;s voice</p>
                <p className="text-sm text-ink-700">{childVoice}</p>
              </div>
            )}

            {curriculumLinks.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Curriculum links</p>
                <ul className="space-y-1 text-sm text-ink-700">
                  {curriculumLinks.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {learningDispositions.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Learning dispositions</p>
                <div className="flex gap-1.5 flex-wrap">
                  {learningDispositions.map((item) => (
                    <span key={item} className="text-[10px] font-mono bg-cream-100 text-clay-700 px-2 py-0.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {socialEmotionalLinks.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Social and emotional learning</p>
                <div className="flex gap-1.5 flex-wrap">
                  {socialEmotionalLinks.map((item) => (
                    <span key={item} className="text-[10px] font-mono bg-sage-50 text-sage-700 px-2 py-0.5 rounded-full border border-sage-100">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {culturalConnections.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Cultural and language links</p>
                <ul className="space-y-1 text-sm text-ink-700">
                  {culturalConnections.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {currentNextSteps.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Possible next steps</p>
                <ul className="space-y-1 text-sm text-ink-700">
                  {currentNextSteps.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {assumptions.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Assumptions or gaps</p>
                <ul className="space-y-1 text-sm text-ink-700">
                  {assumptions.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {whanauConnection && (
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Family or whānau link</p>
                <p className="text-sm text-ink-700">{whanauConnection}</p>
              </div>
            )}
          </div>
        )}

        <StoryIntelligence
          evidenceAnchors={evidenceAnchors}
          educatorChecks={educatorChecks}
          pedagogyLinks={pedagogyLinks}
          familyQuestion={familyQuestion}
          followUpPrompt={followUpPrompt}
        />

        <LearningLoopPanel
          storyId={story.id}
          childName={story.child_name}
          nextSteps={currentNextSteps}
          metadata={currentMetadata}
        />

        <div className="mt-5 rounded-2xl border border-clay-200 bg-white p-4">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-clay-600">Educator reflection</p>
              <p className="mt-1 text-xs text-ink-600">
                Add what changed in your thinking, what local context matters, or what you want to revisit.
              </p>
            </div>
            <textarea
              value={educatorReflection}
              onChange={(event) => setEducatorReflection(event.target.value)}
              className="input min-h-[96px] resize-y text-sm"
              placeholder="I noticed... I am wondering... Next time I will..."
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink-700">
                <input
                  type="checkbox"
                  checked={followUpStatus === "revisited"}
                  onChange={(event) => setFollowUpStatus(event.target.checked ? "revisited" : "open")}
                  className="accent-clay-700"
                />
                We revisited this learning or response
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={saveReflection}
                  disabled={savingReflection}
                  className="btn-secondary px-4 py-2 text-xs disabled:opacity-50"
                >
                  {savingReflection ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save reflection
                </button>
                <Link href={`/generate?from=${encodeURIComponent(story.id)}`} className="btn-primary px-4 py-2 text-xs">
                  Continue this learning <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {story.observations && (
          <div className="mt-5 pt-5 border-t border-clay-100">
            <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Original observation</p>
            <p className="text-xs text-ink-600 whitespace-pre-wrap font-mono">{story.observations}</p>
          </div>
        )}
      </div>
    </details>
  );
}
