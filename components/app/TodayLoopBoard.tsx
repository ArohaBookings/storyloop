"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowRight,
  Check,
  CircleDotDashed,
  ClipboardList,
  Loader2,
  LockKeyhole,
  Plus,
  Sparkles,
  Sunrise,
} from "lucide-react";
import {
  buildTodayFocus,
  type DailyCapture,
  type TodayChild,
  type TodayFocus,
  type TodayStory,
} from "@/lib/today-loop";

type Allowance = {
  limit: number | null;
  used: number;
  remaining: number | null;
  allowed: boolean;
};

function FocusCard({ focus }: { focus: TodayFocus }) {
  const href = focus.sourceStoryId
    ? `/generate?from=${encodeURIComponent(focus.sourceStoryId)}`
    : focus.childId
      ? `/today?child=${encodeURIComponent(focus.childId)}#capture`
      : "/today#capture";

  return (
    <Link
      href={href}
      className="card group flex min-w-0 flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-clay-300 hover:shadow-warm"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-clay-600">{focus.eyebrow}</p>
      <h3 className="mt-2 font-display text-xl font-bold text-ink-900">{focus.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{focus.body}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-clay-700">
        Open focus <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export default function TodayLoopBoard({
  initialCaptures,
  childProfiles,
  stories,
  initialAllowance,
  requestedChildId,
}: {
  initialCaptures: DailyCapture[];
  childProfiles: TodayChild[];
  stories: TodayStory[];
  initialAllowance: Allowance;
  requestedChildId: string;
}) {
  const router = useRouter();
  const [captures, setCaptures] = useState(initialCaptures);
  const [allowance, setAllowance] = useState(initialAllowance);
  const [note, setNote] = useState("");
  const [childId, setChildId] = useState(requestedChildId);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const focus = useMemo(
    () => buildTodayFocus({ children: childProfiles, stories, captures }),
    [captures, childProfiles, stories]
  );
  const openCaptures = captures.filter((capture) => capture.status === "captured" || capture.status === "planned");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/daily-captures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, childId: childId || undefined }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not save this moment.");
        if (data.allowance) setAllowance(data.allowance);
        return;
      }
      setCaptures((current) => [data.capture, ...current]);
      setAllowance(data.allowance);
      setNote("");
      setChildId("");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
      router.refresh();
    } catch {
      setError("Could not save this moment.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (capture: DailyCapture, status: "planned" | "archived") => {
    setBusyId(capture.id);
    setError("");
    try {
      const response = await fetch(`/api/daily-captures/${encodeURIComponent(capture.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not update this moment.");
        return;
      }
      setCaptures((current) => current.map((item) => item.id === capture.id ? data.capture : item));
      router.refresh();
    } catch {
      setError("Could not update this moment.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-clay-200 bg-gradient-to-br from-cream-100 via-white to-sage-50 p-6 shadow-warm md:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-clay-300/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="section-title mb-3">Today Loop</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-ink-900 md:text-5xl">
              Stay present now. Decide what deserves documentation later.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 md:text-base">
              Capture one real moment in seconds. Today Loop brings forward unfinished next steps, then lets you
              turn a moment into a story, hold it for planning, or let it go.
            </p>
          </div>
          <div className="rounded-2xl border border-clay-200 bg-white/80 p-4 text-sm shadow-soft xl:w-72">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-ink-900">Captured this month</span>
              <span className="font-mono font-bold text-clay-700">
                {allowance.limit === null ? `${allowance.used} · unlimited` : `${allowance.used}/${allowance.limit}`}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              {allowance.limit === null
                ? "Your plan includes unlimited quick moments."
                : `${allowance.remaining ?? 0} free moments remain. Upgrade only if this becomes part of your daily rhythm.`}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-title mb-1">Today&apos;s focus</p>
            <h2 className="font-display text-3xl font-bold text-ink-900">Three prompts, never a child ranking.</h2>
          </div>
          <p className="max-w-md text-sm text-ink-500">
            These come from your own unfinished moments, open next steps, and saved history.
          </p>
        </div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-3">
          {focus.map((item) => <FocusCard key={item.id} focus={item} />)}
        </div>
      </section>

      <section id="capture" className="mt-7 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <form onSubmit={save} className="card-warm min-w-0 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-clay-700 text-paper">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="section-title mb-1">20-second capture</p>
              <h2 className="font-display text-2xl font-bold text-ink-900">What happened?</h2>
              <p className="mt-1 text-sm text-ink-600">One action, quote, attempt, change, or question. No analysis required yet.</p>
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="today-child" className="label">Child (optional)</label>
            <select
              id="today-child"
              value={childId}
              onChange={(event) => setChildId(event.target.value)}
              className="input"
            >
              <option value="">No child selected</option>
              {childProfiles.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
            </select>
          </div>

          <div className="mt-4">
            <label htmlFor="today-note" className="label">Moment</label>
            <textarea
              id="today-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
              maxLength={2000}
              className="input resize-y"
              placeholder="Mia returned to the ramp, changed the block underneath, then said “Now it goes faster.”"
            />
            <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-ink-500">
              <span>Keep the child&apos;s exact words exactly as spoken.</span>
              <span className="font-mono">{note.length}/2000</span>
            </div>
          </div>

          {error && <p className="mt-4 rounded-xl border border-clay-200 bg-white px-3 py-2 text-xs text-clay-800">{error}</p>}
          {saved && (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-xs font-semibold text-sage-800">
              <Check className="h-3.5 w-3.5" /> Saved. You can stay with the children.
            </p>
          )}

          <button
            type="submit"
            disabled={saving || note.trim().length < 10 || !allowance.allowed}
            className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : allowance.allowed ? <CircleDotDashed className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
            {allowance.allowed ? "Save this moment" : "Free moment limit reached"}
          </button>
          {!allowance.allowed && (
            <Link href="/billing?feature=unlimitedTodayLoop" className="btn-secondary mt-2 w-full">
              See unlimited plans <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </form>

        <div className="card min-w-0 overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-clay-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="section-title mb-1">Moment inbox</p>
              <h2 className="font-display text-2xl font-bold text-ink-900">Decide once, when you have time.</h2>
            </div>
            <span className="rounded-full bg-cream-100 px-3 py-1 text-xs font-bold text-clay-700">{openCaptures.length} open</span>
          </div>

          {openCaptures.length === 0 ? (
            <div className="p-10 text-center">
              <Sunrise className="mx-auto h-10 w-10 text-clay-300" />
              <p className="mt-3 font-display text-xl font-bold text-ink-900">Nothing waiting.</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">
                That is a healthy state. Today Loop is an inbox to clear, not a target to fill.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-clay-100">
              {openCaptures.map((capture) => (
                <article key={capture.id} className="min-w-0 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-clay-700">{capture.child_name ?? "Unassigned moment"}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          capture.status === "planned"
                            ? "bg-sage-100 text-sage-700"
                            : capture.status === "story_ready"
                              ? "bg-clay-100 text-clay-700"
                              : "bg-cream-100 text-ink-500"
                        }`}>
                          {capture.status === "story_ready" ? "story created" : capture.status}
                        </span>
                      </div>
                      <p className="story-safe mt-2 text-sm leading-relaxed text-ink-700">{capture.note}</p>
                    </div>
                    <time className="shrink-0 text-[11px] text-ink-400">
                      {new Date(capture.observed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                    </time>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {capture.status !== "story_ready" && (
                      <Link href={`/generate?capture=${encodeURIComponent(capture.id)}`} className="btn-primary px-3 py-2 text-xs">
                        <Sparkles className="h-3.5 w-3.5" /> Turn into story
                      </Link>
                    )}
                    {capture.status === "captured" && (
                      <button
                        type="button"
                        onClick={() => updateStatus(capture, "planned")}
                        disabled={busyId === capture.id}
                        className="btn-secondary px-3 py-2 text-xs disabled:opacity-50"
                      >
                        <ClipboardList className="h-3.5 w-3.5" /> Hold for planning
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => updateStatus(capture, "archived")}
                      disabled={busyId === capture.id}
                      className="btn-ghost px-3 py-2 text-xs disabled:opacity-50"
                    >
                      {busyId === capture.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                      Archive
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
