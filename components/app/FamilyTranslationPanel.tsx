"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Languages, Loader2, LockKeyhole } from "lucide-react";
import { hasFeatureAccess } from "@/lib/plans";

type TranslationPack = {
  language: string;
  translatedMessage: string;
  plainEnglishVersion: string;
  readingLevelNote: string;
  teacherCheck: string;
};

type FamilyTranslationPanelProps = {
  storyId?: string;
  plan?: string;
  initialPack?: TranslationPack | null;
};

const LANGUAGE_PRESETS = ["Plain English", "Mandarin", "Arabic", "Hindi", "Spanish"];

export default function FamilyTranslationPanel({
  storyId,
  plan = "free",
  initialPack = null,
}: FamilyTranslationPanelProps) {
  const [language, setLanguage] = useState(initialPack?.language || "Plain English");
  const [pack, setPack] = useState<TranslationPack | null>(initialPack);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const canUseTranslation = hasFeatureAccess(plan, "translationReadability");

  const createPack = async () => {
    if (!storyId) {
      setError("Save this story first, then create a family translation or readability pack.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/stories/${encodeURIComponent(storyId)}/family-translation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create the family pack.");
      setPack(data.translationPack ?? null);
    } catch (translationError) {
      setError(translationError instanceof Error ? translationError.message : "Could not create the family pack.");
    } finally {
      setLoading(false);
    }
  };

  const copyPack = async () => {
    if (!pack) return;
    await navigator.clipboard.writeText([
      `Family message (${pack.language})`,
      pack.translatedMessage,
      "",
      "Plain English version",
      pack.plainEnglishVersion,
      "",
      "Reading note",
      pack.readingLevelNote,
      "",
      "Teacher check",
      pack.teacherCheck,
    ].join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (!canUseTranslation) {
    return (
      <section className="story-safe mt-5 max-w-full overflow-hidden rounded-3xl border border-clay-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-clay-700 text-paper">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <p className="section-title mb-1">Family translation + readability</p>
              <h3 className="font-display text-xl font-bold text-ink-900">Make family updates easier to understand.</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">
                Educator Pro adds plain-English rewriting, optional translations, and a teacher review warning.
              </p>
            </div>
          </div>
          <Link href="/billing?feature=family-translation" className="btn-secondary flex-shrink-0 text-xs">
            See Pro tools
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="story-safe mt-5 max-w-full overflow-hidden rounded-3xl border border-clay-200 bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="section-title mb-1">Family translation + readability</p>
          <h3 className="font-display text-xl font-bold text-ink-900">Create a family-friendly version educators still review.</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-600">
            Useful for multilingual families, simpler reading levels, and quick pickup messages.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="input py-2 text-xs">
            {LANGUAGE_PRESETS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <button type="button" onClick={createPack} disabled={loading} className="btn-primary px-4 py-2 text-xs disabled:opacity-50">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
            Create pack
          </button>
        </div>
      </div>

      {error && <p className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}

      {pack && (
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          {[
            ["Family message", pack.translatedMessage],
            ["Plain English version", pack.plainEnglishVersion],
            ["Reading level note", pack.readingLevelNote],
            ["Teacher check", pack.teacherCheck],
          ].filter(([, value]) => value).map(([label, value]) => (
            <div key={label} className="min-w-0 rounded-2xl border border-clay-100 bg-cream-50 p-4">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-clay-700">{label}</p>
              <p className="text-sm leading-relaxed text-ink-700">{value}</p>
            </div>
          ))}
          <button type="button" onClick={copyPack} className="btn-secondary md:col-span-2 w-fit px-3 py-2 text-xs">
            {copied ? <Check className="h-3 w-3 text-sage-700" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy translation pack"}
          </button>
        </div>
      )}
    </section>
  );
}
