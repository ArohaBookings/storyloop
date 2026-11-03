"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { forgetKeptStory, readKeptStory } from "@/lib/keep-story";
import { track } from "@/lib/analytics/client";

/**
 * Saves the story someone wrote in the no-signup demo into their account the
 * first time the app loads after they sign up (lib/keep-story.ts). Silent when
 * there is nothing kept; one short note when there is.
 */
export default function KeepStoryImporter() {
  const router = useRouter();
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    const kept = readKeptStory();
    if (!kept) {
      forgetKeptStory();
      return;
    }
    let cancelled = false;
    fetch("/api/stories/keep", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kept) })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        // Saved, or never going to save (invalid): either way stop retrying. A
        // failed save stays in the browser for the next visit.
        if (res.ok || res.status === 400) forgetKeptStory();
        if (res.ok && data.storyId) {
          setSaved(String(data.storyId));
          if (!data.already) track("keep_story_saved", {});
          router.refresh();
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!saved) return null;
  return (
    <div role="status" className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-sage-200 bg-paper p-4 shadow-warm sm:bottom-6">
      <Check className="mt-0.5 h-5 w-5 flex-none text-sage-700" />
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-ink-800">
        The story you wrote before signing up is saved.{" "}
        <Link href="/history" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2">See it in your stories</Link>
      </p>
      <button type="button" onClick={() => setSaved(null)} className="flex-none text-ink-500 hover:text-ink-900" aria-label="Close">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
