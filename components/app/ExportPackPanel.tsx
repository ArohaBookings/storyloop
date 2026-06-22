"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, LockKeyhole } from "lucide-react";
import { buildExportPacks, type ExportPlatform } from "@/lib/export-packs";
import { hasFeatureAccess } from "@/lib/plans";
import type { StoryFrameworkId } from "@/lib/story-options";

type ExportPackPanelProps = {
  plan?: string;
  childName?: string | null;
  ageGroup?: string | null;
  story: string;
  storyTitle?: string;
  observations?: string | null;
  learningSummary?: string;
  curriculumLinks?: string[];
  outcomes?: string[];
  nextSteps?: string[];
  familyQuestion?: string;
  framework?: StoryFrameworkId | string | null;
};

const PLATFORM_ORDER: ExportPlatform[] = ["storypark", "educa", "kinderloop", "brightwheel"];

export default function ExportPackPanel({
  plan = "free",
  childName,
  ageGroup,
  story,
  storyTitle,
  observations,
  learningSummary,
  curriculumLinks = [],
  outcomes = [],
  nextSteps = [],
  familyQuestion = "",
  framework = "AU",
}: ExportPackPanelProps) {
  const [platform, setPlatform] = useState<ExportPlatform>("storypark");
  const [copied, setCopied] = useState(false);
  const canExport = hasFeatureAccess(plan, "exportPacks");
  const packs = useMemo(
    () => buildExportPacks({
      childName,
      ageGroup,
      story,
      storyTitle,
      observations,
      learningSummary,
      curriculumLinks,
      outcomes,
      nextSteps,
      familyQuestion,
      framework,
    }),
    [ageGroup, childName, curriculumLinks, familyQuestion, framework, learningSummary, nextSteps, observations, outcomes, story, storyTitle]
  );
  const selected = packs.find((pack) => pack.platform === platform) ?? packs[0];

  const copyPack = async () => {
    await navigator.clipboard.writeText(selected.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const downloadPack = () => {
    const blob = new Blob([selected.text], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName = `${childName || "story"}-${selected.platform}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    anchor.href = url;
    anchor.download = `${safeName || "storyloop-export"}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  if (!story.trim()) return null;

  if (!canExport) {
    return (
      <section className="story-safe mt-5 max-w-full overflow-hidden rounded-3xl border border-clay-200 bg-cream-50 p-5 shadow-soft">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-clay-700 text-paper">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <p className="section-title mb-1">Export packs</p>
              <h3 className="font-display text-xl font-bold text-ink-900">Copy-ready formats for the system you already use.</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">
                Educator plans unlock Storypark, Educa, Kinderloop, and Brightwheel-friendly layouts.
              </p>
            </div>
          </div>
          <Link href="/billing?feature=export-packs" className="btn-primary flex-shrink-0 text-xs">
            Unlock export packs
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="story-safe mt-5 max-w-full overflow-hidden rounded-3xl border border-sage-200 bg-gradient-to-br from-white via-sage-50 to-cream-50 p-5 shadow-soft">
      <div className="mb-4">
        <p className="section-title mb-1">Export packs</p>
        <h3 className="font-display text-xl font-bold text-ink-900">Paste into Storypark, Educa, Kinderloop, or Brightwheel.</h3>
        <p className="mt-1 text-xs leading-relaxed text-ink-600">
          Same story, rearranged into the sections each platform usually expects.
        </p>
      </div>

      <div className="mb-4 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {PLATFORM_ORDER.map((option) => {
          const pack = packs.find((item) => item.platform === option);
          if (!pack) return null;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setPlatform(option)}
              className={`min-w-0 rounded-2xl border p-3 text-left text-xs transition-all ${
                platform === option
                  ? "border-clay-500 bg-clay-700 text-paper shadow-warm"
                  : "border-clay-100 bg-white text-ink-600 hover:border-clay-300"
              }`}
            >
              <span className="block font-bold">{pack.label}</span>
              <span className={platform === option ? "text-cream-200" : "text-ink-500"}>{pack.description}</span>
            </button>
          );
        })}
      </div>

      <div className="min-w-0 rounded-2xl border border-clay-100 bg-white p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-ink-900">{selected.label} copy pack</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyPack} className="btn-secondary px-3 py-2 text-xs">
              {copied ? <Check className="h-3 w-3 text-sage-700" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy pack"}
            </button>
            <button type="button" onClick={downloadPack} className="btn-ghost px-3 py-2 text-xs">
              <Download className="h-3 w-3" />
              Download
            </button>
          </div>
        </div>
        <div className="max-h-80 max-w-full overflow-y-auto overflow-x-hidden rounded-xl bg-cream-50 p-4">
          <pre className="story-safe whitespace-pre-wrap text-xs leading-relaxed text-ink-700">{selected.text}</pre>
        </div>
      </div>
    </section>
  );
}
