"use client";

import { useEffect, useState } from "react";
import { Check, Copy, HeartHandshake, Loader2, Share2, X } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { WALL_LANGUAGES } from "@/lib/wall-languages";
import type { EducatorFamilyView } from "@/lib/family-link";

type State = { shared: boolean; child: { id: string; name: string } | null; family: EducatorFamilyView };
const WHO = ["Mum", "Dad", "Nana", "Grandad", "Caregiver"];

function when(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

/**
 * "Share with the family", on a saved story (lib/family-link.ts).
 *
 * Two steps, each the educator's own decision: share THIS story, and give the
 * child's family a private link. The link opens every story shared about that
 * child, in the family's language where a translation was prepared, and what
 * they write back lands here, beside the story it answers. The link is shown
 * once, straight after it is made: it is never stored.
 */
export default function FamilyShare({ storyId, childName }: { storyId: string; childName?: string | null }) {
  const [state, setState] = useState<State | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [making, setMaking] = useState(false);
  const [label, setLabel] = useState("Mum");
  const [language, setLanguage] = useState("");

  const first = (state?.child?.name ?? childName ?? "").trim().split(/\s+/)[0] || "this child";

  useEffect(() => {
    let live = true;
    fetch(`/api/stories/${encodeURIComponent(storyId)}/family`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (live && data && !data.error) setState(data); })
      .catch(() => {})
      .finally(() => { if (live) setLoaded(true); });
    return () => { live = false; };
  }, [storyId]);

  // Replies the educator is now looking at are read.
  useEffect(() => {
    if (!state?.family.replies.some((reply) => !reply.seen)) return;
    void fetch(`/api/stories/${encodeURIComponent(storyId)}/family`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "seen" }) }).catch(() => {});
  }, [state, storyId]);

  const share = async (method: "POST" | "DELETE") => {
    if (busy) return;
    setBusy(method === "POST" ? "share" : "unshare"); setError("");
    try {
      const response = await fetch(`/api/stories/${encodeURIComponent(storyId)}/family`, { method, headers: { "Content-Type": "application/json" }, body: method === "POST" ? "{}" : undefined });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error ?? "That did not work. Try again."); return; }
      setState(data);
      if (method === "POST") track("family_story_shared", { translated: data.translated ?? 0 });
    } catch {
      setError("That did not work. Check your connection and try again.");
    } finally { setBusy(""); }
  };

  const makeLink = async () => {
    if (busy || !state?.child) return;
    setBusy("link"); setError("");
    try {
      const response = await fetch(`/api/children/${encodeURIComponent(state.child.id)}/family-links`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, language: language || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error ?? "Could not make the link. Try again."); return; }
      setUrl(data.url ?? ""); setMaking(false);
      track("family_link_made", { language: language || "en" });
      const refreshed = await fetch(`/api/stories/${encodeURIComponent(storyId)}/family`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (refreshed && !refreshed.error) setState(refreshed);
    } catch {
      setError("Could not make the link. Check your connection and try again.");
    } finally { setBusy(""); }
  };

  const cancelLink = async (linkId: string) => {
    if (busy || !state?.child) return;
    setBusy(linkId); setError("");
    try {
      const response = await fetch(`/api/children/${encodeURIComponent(state.child.id)}/family-links`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkId }) });
      if (!response.ok) { setError("Could not cancel the link."); return; }
      setState({ ...state, family: { ...state.family, links: state.family.links.filter((link) => link.id !== linkId) } });
      setUrl("");
    } catch {
      setError("Could not cancel the link.");
    } finally { setBusy(""); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* the link is on screen to copy by hand */ }
  };
  const send = async () => {
    try { await navigator.share({ title: `${first}'s learning stories`, text: `${first}'s learning stories. This link is private to your family:`, url }); } catch { /* closed the share sheet */ }
  };

  if (!loaded) return null;
  const links = state?.family.links.filter((link) => link.state === "open") ?? [];
  const replies = state?.family.replies ?? [];

  return (
    <section className="mt-4 min-w-0 rounded-2xl border border-clay-200 bg-paper p-4 sm:p-5" data-testid="family-share">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-sage-600 text-paper"><HeartHandshake className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold text-ink-900">Share with {first}&apos;s family</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-600">
            A private link, with no app and no password. They read the stories you share, in their own language if you choose one, and can write back to you here.
          </p>
        </div>
      </div>

      {!state?.shared ? (
        <div className="mt-3">
          <button type="button" onClick={() => share("POST")} disabled={Boolean(busy)} className="btn-primary min-h-[44px] w-full justify-center text-sm sm:w-auto" data-testid="family-share-on">
            {busy === "share" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Share this story with the family
          </button>
          <p className="mt-2 text-xs leading-relaxed text-ink-500">Check it first: another child named in it, or anything the family should hear from you in person.</p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-sage-800" data-testid="family-shared">
            <Check className="h-4 w-4 flex-none" /> Shared with {first}&apos;s family.
            <button type="button" onClick={() => share("DELETE")} disabled={Boolean(busy)} className="inline-flex min-h-[44px] items-center text-xs font-semibold text-ink-500 underline decoration-clay-300 underline-offset-4" data-testid="family-share-off">
              Stop sharing
            </button>
          </p>

          {links.length > 0 && (
            <ul className="space-y-1.5" data-testid="family-links">
              {links.map((link) => (
                <li key={link.id} className="flex items-center justify-between gap-2 rounded-xl border border-clay-100 bg-cream-50 py-1 pl-3 pr-1 text-sm text-ink-700">
                  <span className="min-w-0 flex-1 break-words">
                    <strong className="font-semibold text-ink-900">{link.label}</strong>
                    {link.language ? `, ${WALL_LANGUAGES.find((l) => l.code === link.language)?.english ?? link.language}` : ""}
                    <span className="text-ink-500"> · {link.opened ? `opened ${when(link.lastOpenedAt)}` : "not opened yet"}</span>
                  </span>
                  <button type="button" onClick={() => cancelLink(link.id)} disabled={Boolean(busy)} aria-label={`Cancel ${link.label}'s link`} className="flex h-11 w-11 flex-none items-center justify-center rounded-full text-ink-400 hover:bg-cream-100 hover:text-ink-700">
                    {busy === link.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {url && (
            <div className="rounded-xl border border-sage-200 bg-sage-50 p-3" data-testid="family-link-url">
              <p className="text-sm font-semibold text-ink-900">Send this link to {label}. It is shown once.</p>
              <input readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="input mt-2 w-full font-mono text-xs" aria-label="The family's private link" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={copy} className="btn-secondary min-h-[44px] px-4 text-xs">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy link"}</button>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <button type="button" onClick={send} className="btn-secondary min-h-[44px] px-4 text-xs"><Share2 className="h-3.5 w-3.5" /> Send</button>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-600">Anyone holding it can read {first}&apos;s shared stories, so send it only to the family. You can cancel it here at any time.</p>
            </div>
          )}

          {making ? (
            <div className="rounded-xl border border-clay-100 bg-cream-50 p-3" data-testid="family-link-form">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-ink-700">
                  Who is it for?
                  <input list="family-who" value={label} onChange={(event) => setLabel(event.target.value)} maxLength={30} className="input mt-1 w-full text-sm" />
                  <datalist id="family-who">{WHO.map((who) => <option key={who} value={who} />)}</datalist>
                </label>
                <label className="block text-xs font-semibold text-ink-700">
                  Their language
                  <select value={language} onChange={(event) => setLanguage(event.target.value)} className="input mt-1 w-full text-sm" data-testid="family-language">
                    <option value="">English</option>
                    {WALL_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.english} ({l.endonym})</option>)}
                  </select>
                </label>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-500">Other languages are translated by machine on Educator Pro and Centre plans. {first}&apos;s own words are always left exactly as said.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={makeLink} disabled={Boolean(busy)} className="btn-primary min-h-[44px] px-4 text-sm" data-testid="family-link-make">
                  {busy === "link" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Make the link
                </button>
                <button type="button" onClick={() => setMaking(false)} className="btn-ghost min-h-[44px] px-4 text-sm">Not now</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { setMaking(true); setUrl(""); }} className="btn-secondary min-h-[44px] px-4 text-sm" data-testid="family-link-new">
              {links.length ? "Make a link for someone else" : `Make ${first}'s family link`}
            </button>
          )}

          {replies.length > 0 && (
            <div data-testid="family-replies">
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-sage-800">What the family wrote back</p>
              <ul className="space-y-2">
                {replies.map((reply) => (
                  <li key={reply.id} className="rounded-xl border border-sage-200 bg-sage-50 p-3 text-sm leading-relaxed text-ink-800">
                    <p className="whitespace-pre-wrap break-words">{reply.body}</p>
                    {reply.bodyEn && <p className="mt-2 whitespace-pre-wrap break-words border-t border-sage-200 pt-2 text-ink-700"><span className="font-semibold">In English (machine translation):</span> {reply.bodyEn}</p>}
                    <p className="mt-1 text-xs text-ink-500">{reply.from}, {when(reply.at)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-3 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-xs text-clay-800">{error}</p>}
    </section>
  );
}
