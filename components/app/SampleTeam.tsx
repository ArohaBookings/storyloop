"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, X } from "lucide-react";
import { SAMPLE_EDUCATORS } from "@/lib/sample-team";

async function setSample(on: boolean): Promise<string | null> {
  try {
    const response = await fetch("/api/centres/team/sample", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on }),
    });
    if (response.ok) return null;
    const data = await response.json().catch(() => ({}));
    return data.error ?? "That did not work. Try again.";
  } catch {
    return "That did not work. Check your connection and try again.";
  }
}

/**
 * For a leader with nobody invited yet: open the sample team (lib/sample-team.ts)
 * to see team stories and the team's evidence working before anyone joins.
 */
export function SampleTeamOffer({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const open = async () => {
    setBusy(true); setError("");
    const problem = await setSample(true);
    if (problem) { setError(problem); setBusy(false); return; }
    router.push("/team");
    router.refresh();
  };

  return (
    <div className={compact ? "" : "card border-dashed p-5"} data-testid="sample-team-offer">
      {!compact && (
        <>
          <h2 className="font-display text-lg font-bold text-ink-900">See it working before anyone joins</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            Open a sample team: three made-up educators and their stories. Try marking one, then look at the team&apos;s
            evidence. One tap removes it.
          </p>
        </>
      )}
      <button type="button" onClick={open} disabled={busy} className={compact ? "btn-secondary text-sm" : "btn-secondary mt-3 text-sm"} data-testid="sample-team-open">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Open the sample team
      </button>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-clay-700">{error}</p>}
    </div>
  );
}

/** At the top of every view of the sample team: what it is, and one tap to remove it. */
export function SampleTeamBanner({ evidenceLink = true }: { evidenceLink?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const names = SAMPLE_EDUCATORS.map((educator) => educator.firstName);

  const remove = async () => {
    setBusy(true); setError("");
    const problem = await setSample(false);
    if (problem) { setError(problem); setBusy(false); return; }
    router.push("/team");
    router.refresh();
  };

  return (
    <div className="mb-4 rounded-2xl border border-clay-300 bg-cream-50 p-4" data-testid="sample-team-banner" role="note">
      <p className="text-sm font-bold text-ink-900">This is a sample team</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-700">
        {names.slice(0, -1).join(", ")} and {names[names.length - 1]} are made up, and so are their children and stories.
        Nothing here is real, saved or counted.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <button type="button" onClick={remove} disabled={busy} className="btn-ghost min-h-[44px] px-0 text-sm font-semibold text-clay-800" data-testid="sample-team-remove">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Remove the sample team
        </button>
        {evidenceLink && (
          <Link href="/evidence?scope=sample" className="min-h-[44px] content-center text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2" data-testid="sample-team-evidence-link">
            See the sample team&apos;s evidence
          </Link>
        )}
      </div>
      {error && <p role="alert" className="mt-1 text-xs font-semibold text-clay-700">{error}</p>}
    </div>
  );
}
