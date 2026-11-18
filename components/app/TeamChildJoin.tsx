"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Link2, Unlink } from "lucide-react";

type Suggestion = { name: string; profileIds: string[]; authors: number };
type Joined = { centreChildId: string; name: string; lists: number };

/**
 * The centre's own child list, built one tap at a time (18 Nov 2026). When two
 * educators who share both have a "Mia", the leader says whether that is one
 * child, so the team's evidence counts her once. Nothing is merged on its own,
 * and any join can be undone. No educator's own child profile changes.
 */
export default function TeamChildJoin({ suggestions, joined }: { suggestions: Suggestion[]; joined: Joined[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const call = async (method: "POST" | "DELETE", body: Record<string, unknown>, key: string) => {
    setBusy(key); setError("");
    try {
      const response = await fetch("/api/centres/team/children", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error ?? "That did not save. Try again."); return; }
      router.refresh();
    } catch {
      setError("That did not save. Check your connection and try again.");
    } finally {
      setBusy("");
    }
  };

  if (!suggestions.length && !joined.length) return null;
  const shown = suggestions.slice(0, 3);

  return (
    <div className="mt-4 space-y-2 print:hidden" data-testid="team-child-join">
      {shown.map((suggestion) => {
        const key = suggestion.profileIds.join(",");
        return (
          <div key={key} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-clay-200 bg-cream-50 p-3" data-testid="team-child-suggestion">
            <p className="min-w-0 text-sm text-ink-800">
              <strong className="font-semibold">{suggestion.name}</strong> is in {suggestion.authors} educators&apos; lists. The same child?
            </p>
            <button
              type="button"
              onClick={() => call("POST", { profileIds: suggestion.profileIds }, key)}
              disabled={Boolean(busy)}
              className="btn-secondary px-3 py-2 text-sm"
              data-testid="team-child-same"
            >
              {busy === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Same child, count once
            </button>
          </div>
        );
      })}
      {suggestions.length > shown.length && (
        <p className="text-xs text-ink-500">{suggestions.length - shown.length} more names to check after these.</p>
      )}
      {joined.length > 0 && (
        <details className="rounded-2xl border border-clay-100 p-3 text-sm text-ink-700">
          <summary className="cursor-pointer text-sm font-semibold text-ink-800">
            Counted once across lists ({joined.length})
          </summary>
          <ul className="mt-2 space-y-1.5">
            {joined.map((child) => (
              <li key={child.centreChildId} className="flex flex-wrap items-center justify-between gap-2">
                <span>{child.name} · in {child.lists} lists</span>
                <button
                  type="button"
                  onClick={() => call("DELETE", { centreChildId: child.centreChildId }, child.centreChildId)}
                  disabled={Boolean(busy)}
                  className="btn-ghost min-h-[44px] px-2 text-xs"
                  data-testid="team-child-split"
                >
                  {busy === child.centreChildId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlink className="h-3.5 w-3.5" />} Not the same child
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {error && <p role="alert" className="text-xs font-semibold text-clay-700">{error}</p>}
    </div>
  );
}
