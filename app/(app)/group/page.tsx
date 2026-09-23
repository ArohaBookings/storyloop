"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Loader2, Plus, Scissors, Sparkles, Users, X } from "lucide-react";
import { track } from "@/lib/analytics/client";

type ChildProfile = { id: string; name: string };
type Split = { children: Array<{ name: string; fragments: string[] }>; shared: string[]; source: "ai" | "rules"; notes: Record<string, string> };
type Draft = { name: string; note: string; include: boolean; childId: string | null };
type Result = { name: string; status: "waiting" | "writing" | "done" | "error"; title?: string; story?: string; error?: string };

export default function GroupMomentPage() {
  const [note, setNote] = useState("");
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [splitting, setSplitting] = useState(false);
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [results, setResults] = useState<Result[] | null>(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    fetch("/api/children")
      .then((res) => (res.ok ? res.json() : { children: [] }))
      .then((data) => setProfiles(((data.children ?? []) as ChildProfile[]).filter((child) => child.name?.trim())))
      .catch(() => {});
  }, []);

  // Children with a profile whose name appears in the note are offered first.
  const mentioned = useMemo(
    () => profiles.filter((child) => new RegExp(`(^|[^\\p{L}])${child.name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`, "iu").test(note)),
    [profiles, note],
  );

  const toggle = (name: string) => setNames((current) => (current.includes(name) ? current.filter((n) => n !== name) : [...current, name].slice(0, 8)));
  const addTyped = () => {
    const name = typed.trim();
    if (name && !names.includes(name)) setNames([...names, name].slice(0, 8));
    setTyped("");
  };

  const split = async () => {
    setSplitting(true); setError(""); setDrafts(null); setResults(null);
    track("click", { name: "group_split", children: names.length });
    try {
      const res = await fetch("/api/group-split", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note, names }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The note could not be split.");
      const result = data as Split;
      setDrafts(names.map((name) => {
        const text = result.notes?.[name] ?? "";
        const profile = profiles.find((child) => child.name.trim().toLowerCase() === name.toLowerCase());
        return { name, note: text, include: text.length > 0, childId: profile?.id ?? null };
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "The note could not be split.");
    } finally {
      setSplitting(false);
    }
  };

  const write = async () => {
    if (!drafts) return;
    const chosen = drafts.filter((draft) => draft.include && draft.note.trim());
    setResults(chosen.map((draft) => ({ name: draft.name, status: "waiting" })));
    track("click", { name: "group_write", stories: chosen.length });
    // One at a time: each is a full story, and the monthly allowance is
    // counted story by story, so a limit stops cleanly part way.
    for (const [index, draft] of chosen.entries()) {
      setResults((current) => current?.map((result, i) => (i === index ? { ...result, status: "writing" } : result)) ?? null);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ observations: draft.note, childId: draft.childId ?? undefined, childName: draft.name, proceedWithoutClarification: true }),
        });
        const data = await res.json();
        if (!res.ok || !data.story) throw new Error(data.error ?? "This story could not be written.");
        setResults((current) => current?.map((result, i) => (i === index ? { ...result, status: "done", title: data.storyTitle, story: data.story } : result)) ?? null);
      } catch (e) {
        const message = e instanceof Error ? e.message : "This story could not be written.";
        setResults((current) => current?.map((result, i) => (i >= index && result.status !== "done" ? { ...result, status: "error", error: i === index ? message : "Not written, because the one before it stopped." } : result)) ?? null);
        break;
      }
    }
  };

  const words = note.trim() ? note.trim().split(/\s+/).length : 0;
  const canSplit = words >= 6 && names.length >= 2 && !splitting;
  const writing = results?.some((result) => result.status === "writing");

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      <div className="mb-8 max-w-3xl">
        <p className="section-title mb-2">New</p>
        <h1 className="font-display text-4xl font-bold text-ink-900">One moment, many children</h1>
        <p className="mt-2 text-base leading-relaxed text-ink-600">
          Write the group moment once. StoryLoop splits your note by child, using only your words, and you check each part
          before a story is written for every child.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-5 sm:p-6">
          <label htmlFor="group-note" className="label">The moment</label>
          <textarea
            id="group-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={8}
            placeholder="Tui, Rawiri and Sam built a hut out of the crates and a sheet. Tui was in charge of the door and said 'password please'. Sam said banana and she let him in. Rawiri brought the cushions."
            className="input resize-y leading-relaxed"
          />
          <p className="mt-1.5 text-xs text-ink-500">{words} words. Name each child the way you would in any note.</p>

          <p className="label mt-5">Which children were part of it?</p>
          {mentioned.length > 0 && (
            <p className="mb-2 text-xs text-ink-500">In your note: tap to include.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {[...mentioned, ...profiles.filter((child) => !mentioned.includes(child))].slice(0, 30).map((child) => (
              <button
                key={child.id}
                type="button"
                aria-pressed={names.includes(child.name)}
                onClick={() => toggle(child.name)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${names.includes(child.name) ? "border-clay-700 bg-clay-700 text-paper" : mentioned.includes(child) ? "border-clay-400 bg-cream-50 text-ink-800" : "border-clay-200 bg-paper text-ink-600"}`}
              >
                {child.name}
              </button>
            ))}
            {names.filter((name) => !profiles.some((child) => child.name === name)).map((name) => (
              <span key={name} className="inline-flex items-center gap-1 rounded-full border border-clay-700 bg-clay-700 px-3 py-1.5 text-sm font-semibold text-paper">
                {name}
                <button type="button" onClick={() => toggle(name)} aria-label={`Remove ${name}`}><X className="h-3.5 w-3.5" /></button>
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              id="group-add-name"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTyped(); } }}
              placeholder="Add a first name"
              className="input max-w-xs"
              aria-label="Add a child's first name"
            />
            <button type="button" onClick={addTyped} className="btn-secondary px-3"><Plus className="h-4 w-4" /> Add</button>
          </div>

          <button type="button" onClick={split} disabled={!canSplit} className="btn-primary mt-6 w-full justify-center py-3 sm:w-auto" data-testid="group-split">
            {splitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" />}
            Split by child{names.length >= 2 ? ` (${names.length})` : ""}
          </button>
          {!canSplit && !splitting && (
            <p className="mt-2 text-xs text-ink-500">{words < 6 ? "Write a little more about the moment. " : ""}{names.length < 2 ? "Choose at least two children." : ""}</p>
          )}
          {error && <p role="alert" className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="rounded-3xl border border-sage-200 bg-sage-50/60 p-5 sm:p-6">
          <p className="flex items-center gap-2 font-display text-xl font-bold text-ink-900"><Users className="h-5 w-5 text-sage-700" /> How it stays true</p>
          <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-700">
            {[
              "The split only ever copies whole sentences from your note. It cannot add a word.",
              "You see and edit each child's part before anything is written.",
              "Each story is written the same way as any other StoryLoop story, with the same checks.",
              "A child the note says nothing about gets no story, rather than a made-up one.",
              "Each story counts as one story on your plan.",
            ].map((line) => (
              <li key={line} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-sage-600" />{line}</li>
            ))}
          </ul>
        </div>
      </div>

      {drafts && (
        <section className="mt-8" aria-label="Each child's part of the note">
          <h2 className="font-display text-2xl font-bold text-ink-900">Check each child&apos;s part</h2>
          <p className="mt-1 text-sm text-ink-600">Straight from your note. Edit anything, or leave a child out.</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {drafts.map((draft, index) => (
              <div key={draft.name} className={`card p-5 ${draft.include ? "" : "opacity-70"}`} data-private>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-display text-lg font-bold text-ink-900">{draft.name}</p>
                  <label className="flex items-center gap-2 text-sm text-ink-600">
                    <input
                      type="checkbox"
                      aria-label={`Write a story for ${draft.name}`}
                      checked={draft.include}
                      onChange={(e) => setDrafts(drafts.map((d, i) => (i === index ? { ...d, include: e.target.checked } : d)))}
                    />
                    Write a story
                  </label>
                </div>
                {draft.note ? (
                  <textarea
                    aria-label={`What the note says about ${draft.name}`}
                    value={draft.note}
                    onChange={(e) => setDrafts(drafts.map((d, i) => (i === index ? { ...d, note: e.target.value } : d)))}
                    rows={4}
                    className="input mt-3 resize-y text-sm leading-relaxed"
                  />
                ) : (
                  <p className="mt-3 rounded-xl border border-clay-200 bg-cream-50 px-3 py-2.5 text-sm text-ink-600">
                    Nothing in the note is about {draft.name}. Add what you saw, or leave them out.
                    <button type="button" className="ml-1 font-semibold text-clay-700 underline" onClick={() => setDrafts(drafts.map((d, i) => (i === index ? { ...d, note: `${draft.name} ` } : d)))}>Add a note</button>
                  </p>
                )}
                {!draft.childId && <p className="mt-2 text-xs text-ink-500">No child profile for {draft.name}, so the story will not be linked to one.</p>}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={write}
            disabled={Boolean(writing) || !drafts.some((draft) => draft.include && draft.note.trim())}
            className="btn-primary mt-6 py-3"
            data-testid="group-write"
          >
            {writing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Write {drafts.filter((draft) => draft.include && draft.note.trim()).length} stories
          </button>
        </section>
      )}

      {results && (
        <section className="mt-8 space-y-4" aria-label="The stories" aria-live="polite">
          {results.map((result) => (
            <div key={result.name} className="card p-5" data-private>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-display text-lg font-bold text-ink-900">{result.title || result.name}</p>
                <span className="text-sm text-ink-500">
                  {result.status === "waiting" && "Waiting"}
                  {result.status === "writing" && <span className="inline-flex items-center gap-1.5"><Loader2 className="h-4 w-4 animate-spin" /> Writing {result.name}&apos;s story</span>}
                  {result.status === "done" && <span className="text-sage-700">Saved to your history</span>}
                  {result.status === "error" && <span className="text-red-700">{result.error}</span>}
                </span>
              </div>
              {result.story && (
                <>
                  <div className="story-safe mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-[15px] leading-relaxed text-ink-800">{result.story}</div>
                  <button
                    type="button"
                    className="btn-ghost mt-3 px-3 py-1.5 text-xs"
                    onClick={async () => { await navigator.clipboard.writeText(result.story ?? ""); setCopied(result.name); setTimeout(() => setCopied(""), 2000); }}
                  >
                    {copied === result.name ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <Copy className="h-3.5 w-3.5" />} {copied === result.name ? "Copied" : "Copy"}
                  </button>
                </>
              )}
            </div>
          ))}
          {results.every((result) => result.status === "done" || result.status === "error") && (
            <Link href="/history" className="inline-flex items-center gap-1.5 text-base font-semibold text-clay-700 underline">
              Open them in your story history <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
