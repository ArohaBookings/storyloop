"use client";

import { useState } from "react";
import { Check, Copy, Loader2, Pencil, Save, X } from "lucide-react";

type StoryHistoryItemProps = {
  story: {
    id: string;
    child_name: string | null;
    age_group: string | null;
    created_at: string;
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

export default function StoryHistoryItem({ story }: StoryHistoryItemProps) {
  const [storyText, setStoryText] = useState(story.story_text);
  const [draft, setDraft] = useState(story.story_text);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const metadata =
    story.metadata && typeof story.metadata === "object"
      ? (story.metadata as Record<string, unknown>)
      : {};
  const learningSummary =
    typeof metadata.learningSummary === "string" ? metadata.learningSummary : "";
  const learningDispositions = asStringArray(metadata.learningDispositions);
  const socialEmotionalLinks = asStringArray(metadata.socialEmotionalLinks);
  const culturalConnections = asStringArray(metadata.culturalConnections);
  const whanauConnection =
    typeof metadata.whanauConnection === "string" ? metadata.whanauConnection : "";

  const startEdit = () => {
    setDraft(storyText);
    setMessage("");
    setError("");
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
      setEditing(false);
      setMessage("Saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save story edits.");
    } finally {
      setSaving(false);
    }
  };

  const copyStory = async () => {
    await navigator.clipboard.writeText(storyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <details className="card p-6 group">
      <summary className="list-none flex items-start justify-between gap-4 cursor-pointer">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-display font-bold text-ink-900">{story.child_name ?? "Learning story"}</p>
            {story.age_group && <span className="text-xs text-ink-500">· {story.age_group}</span>}
            <span className="text-xs text-ink-400">
              · {new Date(story.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <p className="text-sm text-ink-600 line-clamp-2">{storyText.slice(0, 200)}...</p>
          {story.outcomes && story.outcomes.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {story.outcomes.map((outcome) => (
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
          <div className="flex items-center gap-2">
            {!editing && (
              <button onClick={startEdit} className="btn-ghost px-3 py-1.5 text-xs">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
            <button onClick={copyStory} className="btn-ghost px-3 py-1.5 text-xs">
              {copied ? <Check className="w-3 h-3 text-sage-600" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
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
              <p className="text-xs text-ink-500">Save keeps the same curriculum links and updates the story text in history.</p>
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
        {error && <p className="mt-3 text-xs font-semibold text-red-700">{error}</p>}

        {(learningSummary ||
          learningDispositions.length > 0 ||
          socialEmotionalLinks.length > 0 ||
          culturalConnections.length > 0 ||
          (story.next_steps?.length ?? 0) > 0 ||
          whanauConnection) && (
          <div className="mt-5 space-y-4">
            {learningSummary && (
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">What this learning shows</p>
                <p className="text-sm text-ink-700">{learningSummary}</p>
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

            {story.next_steps && story.next_steps.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Possible next steps</p>
                <ul className="space-y-1 text-sm text-ink-700">
                  {story.next_steps.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {whanauConnection && (
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Family or whanau link</p>
                <p className="text-sm text-ink-700">{whanauConnection}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
}
