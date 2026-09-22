"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ShieldCheck, Trash2 } from "lucide-react";
import ChildVoiceRecorder from "@/components/app/ChildVoiceRecorder";
import { describeProvenance, type Provenance } from "@/lib/child-voice";

type Child = { id: string; name: string; voice_consent_at: string | null };
type Note = { id: string; child_id: string; words: string; about: string | null; provenance: Provenance; said_at: string };

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });

export default function ChildVoices() {
  const [children, setChildren] = useState<Child[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const [childrenRes, notesRes] = await Promise.all([
        fetch("/api/child-voice/children"),
        fetch("/api/child-voice"),
      ]);
      if (childrenRes.ok) {
        const list: Child[] = (await childrenRes.json()).children ?? [];
        setChildren(list);
        // Open on a child who can actually record. Landing on a consent notice
        // makes the feature look like paperwork when it is the opposite.
        setSelected((current) => current || list.find((c) => c.voice_consent_at)?.id || list[0]?.id || "");
      }
      if (notesRes.ok) setNotes((await notesRes.json()).notes ?? []);
    } catch {
      setError("Could not load this page.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const child = children.find((c) => c.id === selected) ?? null;
  const childNotes = notes.filter((note) => note.child_id === selected);

  const setConsent = async (consented: boolean) => {
    if (!child) return;
    if (!consented) {
      const count = notes.filter((n) => n.child_id === child.id).length;
      const warning = count
        ? `Turning this off deletes the ${count} thing${count === 1 ? "" : "s"} ${child.name} has recorded. That cannot be undone.`
        : `Turn off voice notes for ${child.name}?`;
      if (!window.confirm(warning)) return;
    }
    setBusy("consent");
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/child-voice/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: child.id, consented }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not update that.");
      if (!consented && data.removed > 0) {
        setNotice(`Consent withdrawn, and ${data.removed} saved note${data.removed === 1 ? "" : "s"} deleted.`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update that.");
    } finally {
      setBusy("");
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    try {
      await fetch(`/api/child-voice?id=${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return <p className="flex items-center gap-2 text-sm text-ink-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>;
  }

  if (children.length === 0) {
    return (
      <div className="card p-6">
        <p className="text-sm leading-relaxed text-ink-600">
          Add a child on <Link href="/children" className="underline underline-offset-2">Child profiles</Link> first, and
          they can start telling you about their own work.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        {/* Who is talking. Faces would be better than names here, and that is
            what photos would buy, but photos of children are exactly what this
            feature has decided not to hold. */}
        <div className="flex flex-wrap gap-2">
          {children.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(option.id)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                option.id === selected ? "border-clay-700 bg-clay-700 text-paper" : "border-clay-200 text-ink-700 hover:border-clay-400"
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>

        {child && (
          <>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-clay-100 bg-cream-50 p-4">
              <p className="flex items-center gap-2 text-sm text-ink-700">
                <ShieldCheck className={`h-4 w-4 ${child.voice_consent_at ? "text-sage-600" : "text-clay-700"}`} />
                {child.voice_consent_at
                  ? `${child.name}'s family has agreed to voice notes.`
                  : `${child.name}'s family has not agreed to voice notes yet.`}
              </p>
              <button
                type="button"
                onClick={() => setConsent(!child.voice_consent_at)}
                disabled={busy === "consent"}
                className="btn-secondary text-xs"
              >
                {busy === "consent" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {child.voice_consent_at ? "Turn off" : "Record family consent"}
              </button>
            </div>

            {notice && <p className="mt-3 rounded-2xl border border-sage-200 bg-sage-50 p-3 text-sm text-sage-800">{notice}</p>}
            {error && <p role="alert" className="mt-3 rounded-2xl border border-clay-300 bg-cream-50 p-3 text-sm text-ink-800">{error}</p>}

            <div className="mt-4">
              <ChildVoiceRecorder child={child} onSaved={load} />
            </div>
          </>
        )}
      </div>

      <aside>
        <h2 className="font-display text-xl font-bold text-ink-900">
          {child ? `${child.name}'s own words` : "Their own words"}
        </h2>
        {childNotes.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Nothing yet. Anything they say here is kept exactly as they said it.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {childNotes.map((note) => (
              <li key={note.id} className="card p-4">
                <p className="text-[15px] leading-relaxed text-ink-900">&ldquo;{note.words}&rdquo;</p>
                {note.about && <p className="mt-1 text-xs text-ink-500">About: {note.about}</p>}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-ink-400">
                    {when(note.said_at)} · {describeProvenance(note.provenance)}
                  </p>
                  <button
                    type="button"
                    onClick={() => remove(note.id)}
                    disabled={busy === note.id}
                    aria-label="Delete this"
                    className="text-ink-400 transition-colors hover:text-clay-700"
                  >
                    {busy === note.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
