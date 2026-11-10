"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Lock } from "lucide-react";
import StoryText from "@/components/app/StoryText";
import { track } from "@/lib/analytics/client";
import { FAMILY_REPLY_MAX, familyTokenFromHash, type FamilyView } from "@/lib/family-link";

const AT = { path: "/family" };

function day(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

/**
 * A family's page (lib/family-link.ts). The key is the part of the address
 * after the #, which this page reads and sends in the body of its requests, so
 * it never appears in a server log, in analytics, or in a referrer. Events are
 * filed under /family with no key and no child's name.
 */
export default function FamilyPage() {
  const [token, setToken] = useState("");
  const [view, setView] = useState<FamilyView | null>(null);
  const [phase, setPhase] = useState<"loading" | "open" | "gone">("loading");
  const [english, setEnglish] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState("");
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    const key = familyTokenFromHash(window.location.hash);
    if (!key) { setPhase("gone"); return; }
    setToken(key);
    fetch("/api/family", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: key, action: "open" }) })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.view) { setPhase("gone"); return; }
        setView(data.view); setPhase("open");
        track("family_link_opened", { stories: data.view.stories.length, translated: Boolean(data.view.language) }, AT);
      })
      .catch(() => setPhase("gone"));
  }, []);

  const reply = async (storyId: string) => {
    const text = (drafts[storyId] ?? "").trim();
    if (!text || sending) return;
    setSending(storyId); setError("");
    try {
      const response = await fetch("/api/family", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: "reply", storyId, text }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.view) { setError(data.error ?? "That did not send. Try again."); return; }
      setView(data.view);
      setDrafts((all) => ({ ...all, [storyId]: "" }));
      setSent((all) => ({ ...all, [storyId]: true }));
      track("family_reply_sent", { words: text.split(/\s+/).length }, AT);
    } catch {
      setError("That did not send. Check your connection and try again.");
    } finally { setSending(""); }
  };

  if (phase === "loading") {
    return <main className="flex min-h-screen items-center justify-center bg-paper p-6 text-ink-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening…</main>;
  }

  if (phase === "gone" || !view) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper p-6">
        <div className="card max-w-md p-7 text-center" data-testid="family-gone">
          <Lock className="mx-auto mb-3 h-8 w-8 text-clay-500" />
          <h1 className="font-display text-2xl font-bold text-ink-900">This link does not open anything.</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">It may have been cancelled, or part of it may be missing. Ask your child&apos;s teacher to send it again.</p>
        </div>
      </main>
    );
  }

  const rtl = view.language?.rtl === true;

  return (
    <main className="min-h-screen bg-paper pb-16">
      <header className="border-b border-clay-100 bg-cream-50/70 px-4 py-8 sm:py-10">
        <div className="mx-auto min-w-0 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-clay-700">A private page for {view.childName}&apos;s family</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink-900 text-balance sm:text-4xl" data-testid="family-title">{view.childName}&apos;s learning stories</h1>
          <p className="mt-2 text-base leading-relaxed text-ink-600">
            Written by {view.educator} from what {view.childName} did and said. Read them here, and tell {view.educator} what you see at home.
          </p>
        </div>
      </header>

      <div className="mx-auto min-w-0 max-w-2xl px-4">
        {view.stories.length === 0 && (
          <p className="card mt-6 p-6 text-center text-sm leading-relaxed text-ink-600" data-testid="family-empty">No stories have been shared yet. When {view.educator} shares one, it will be here.</p>
        )}

        {view.stories.map((story) => {
          const showEnglish = !story.translation || english[story.id] === true;
          return (
            <article key={story.id} className="card mt-6 min-w-0 p-5 sm:p-7" data-testid="family-story">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink-500">{day(story.writtenOn)}</p>
                {story.translation && view.language && (
                  <div className="inline-flex rounded-xl border border-clay-200 bg-paper p-0.5" role="group" aria-label="Language">
                    <button type="button" onClick={() => setEnglish((all) => ({ ...all, [story.id]: false }))} aria-pressed={!showEnglish} className={`min-h-[44px] rounded-lg px-3 text-sm font-semibold ${!showEnglish ? "bg-clay-700 text-paper" : "text-ink-600"}`} data-testid="family-lang-own">{view.language.endonym}</button>
                    <button type="button" onClick={() => setEnglish((all) => ({ ...all, [story.id]: true }))} aria-pressed={showEnglish} className={`min-h-[44px] rounded-lg px-3 text-sm font-semibold ${showEnglish ? "bg-clay-700 text-paper" : "text-ink-600"}`} data-testid="family-lang-en">English</button>
                  </div>
                )}
              </div>

              {showEnglish || !story.translation ? (
                <StoryText text={story.text} className="mt-3 text-[17px]" />
              ) : (
                <div dir={rtl ? "rtl" : "ltr"} lang={view.language?.code} data-testid="family-translation">
                  <StoryText text={story.translation.text} className="mt-3 text-[17px]" />
                  <p className="mt-4 rounded-xl border border-clay-100 bg-cream-50 px-3 py-2 text-xs leading-relaxed text-ink-600">{story.translation.notice}</p>
                </div>
              )}

              <div className="mt-6 border-t border-clay-100 pt-5">
                {story.replies.length > 0 && (
                  <ul className="mb-4 space-y-2" data-testid="family-my-replies">
                    {story.replies.map((item, index) => (
                      <li key={index} className="rounded-xl border border-sage-200 bg-sage-50 p-3 text-sm leading-relaxed text-ink-800">
                        <p className="whitespace-pre-wrap break-words">{item.body}</p>
                        <p className="mt-1 text-xs text-ink-500">You wrote this on {day(item.at)}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <label htmlFor={`reply-${story.id}`} className="block text-sm font-semibold text-ink-900">Write back to {view.educator}</label>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">What do you see at home? Write in any language.</p>
                <textarea
                  id={`reply-${story.id}`}
                  value={drafts[story.id] ?? ""}
                  onChange={(event) => { setDrafts((all) => ({ ...all, [story.id]: event.target.value })); setSent((all) => ({ ...all, [story.id]: false })); }}
                  rows={3}
                  maxLength={FAMILY_REPLY_MAX}
                  className="input mt-2 w-full resize-y text-base"
                  data-testid="family-reply-box"
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => reply(story.id)} disabled={Boolean(sending) || !(drafts[story.id] ?? "").trim()} className="btn-primary min-h-[44px] px-5 text-sm" data-testid="family-reply-send">
                    {sending === story.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send to {view.educator}
                  </button>
                  {sent[story.id] && <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-sage-800" data-testid="family-reply-sent"><Check className="h-4 w-4" /> Sent. {view.educator} will see it.</span>}
                </div>
              </div>
            </article>
          );
        })}

        {error && <p role="alert" className="mt-4 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-sm text-clay-800">{error}</p>}

        <footer className="mt-10 text-center text-xs leading-relaxed text-ink-500">
          <p className="flex items-center justify-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Only people with this link can open this page. No photographs are kept here.</p>
          <p className="mt-2">
            {view.educator} writes these with{" "}
            <Link href="/?utm_source=family_link&utm_medium=product" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4" data-track="family_footer_home">StoryLoop</Link>.
          </p>
        </footer>
      </div>
    </main>
  );
}
