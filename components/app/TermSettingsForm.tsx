"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { JURISDICTION_LABEL, type Jurisdiction } from "@/lib/terms";

const OPTIONS: Jurisdiction[] = ["NZ", "NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"];

export default function TermSettingsForm({
  jurisdiction,
  followsSchoolTerms,
  configured,
}: {
  jurisdiction: Jurisdiction;
  followsSchoolTerms: boolean;
  configured: boolean;
}) {
  const router = useRouter();
  const [place, setPlace] = useState<Jurisdiction>(jurisdiction);
  const [follows, setFollows] = useState(followsSchoolTerms);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/me/term-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jurisdiction: place, followsSchoolTerms: follows }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not save that.");
      setMessage("Saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save that.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-4 ${configured ? "border-clay-100 bg-cream-50" : "border-amber-200 bg-amber-50/70"}`}>
      {!configured && (
        <p className="mb-3 text-sm leading-relaxed text-ink-700">
          <strong className="font-semibold text-ink-900">Where is your service?</strong> So school holidays are not
          mistaken for a child going unnoticed.
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="term-place" className="label">Location</label>
          <select id="term-place" value={place} onChange={(e) => setPlace(e.target.value as Jurisdiction)} className="input">
            {OPTIONS.map((option) => (
              <option key={option} value={option}>{JURISDICTION_LABEL[option]}</option>
            ))}
          </select>
        </div>
        <label htmlFor="term-follows" className="flex cursor-pointer items-center gap-2 py-2 text-sm text-ink-700 sm:pb-3">
          <input id="term-follows" type="checkbox" checked={follows} onChange={(e) => setFollows(e.target.checked)} />
          We close in school holidays
        </label>
        <button type="button" onClick={save} disabled={saving} className="btn-secondary flex-shrink-0 text-sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-ink-500" role="status">{message}</p>}
    </div>
  );
}
