"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Eye, Loader2, Printer, QrCode, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { formatWallCode, type PublicWallCard, type ScrubReport } from "@/lib/wall-card";

type Card = {
  id: string;
  code: string;
  card: PublicWallCard;
  scrub_report: ScrubReport;
  status: "draft" | "published" | "revoked";
  expires_at: string;
  scan_count?: number;
};

type Story = { id: string; title: string; date: string };

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" });

/**
 * The educator's side of a wall card.
 *
 * The whole screen is built around one idea: before anything is printed, the
 * educator sees EXACTLY what a stranger in the corridor will see, rendered the
 * same way, not a summary of it. Everything else here is secondary to that
 * moment of recognition.
 */
export default function WallCards({ appUrl }: { appUrl: string }) {
  const [cards, setCards] = useState<Card[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Card | null>(null);

  const load = useCallback(async () => {
    try {
      const [cardsRes, storiesRes] = await Promise.all([fetch("/api/wall"), fetch("/api/wall/stories")]);
      if (cardsRes.ok) setCards((await cardsRes.json()).cards ?? []);
      if (storiesRes.ok) setStories((await storiesRes.json()).stories ?? []);
    } catch {
      setError("Could not load your wall cards.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const build = async (storyId: string) => {
    setBusy(storyId);
    setError("");
    try {
      const res = await fetch("/api/wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not build that card.");
      setDraft(data.card);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not build that card.");
    } finally {
      setBusy("");
    }
  };

  const act = async (id: string, action: "publish" | "revoke" | "renew") => {
    setBusy(id);
    setError("");
    try {
      const res = await fetch("/api/wall", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error([data.error, ...(data.blockers ?? [])].filter(Boolean).join(" "));
      if (draft?.id === id) setDraft(data.card);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update that card.");
    } finally {
      setBusy("");
    }
  };

  const published = cards.filter((c) => c.status === "published");

  return (
    <div className="mx-auto max-w-4xl">
      {error && (
        <p role="alert" className="mb-4 rounded-2xl border border-clay-300 bg-cream-50 p-3 text-sm text-ink-800 print:hidden">
          {error}
        </p>
      )}

      {/* ---------------------------------------------------- preview / print */}
      {draft && (
        <section className="card mb-8 p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3 print:hidden">
            <div>
              <p className="section-title mb-1">Step 2 · Check it</p>
              <h2 className="font-display text-2xl font-bold text-ink-900">Exactly what a parent will see</h2>
            </div>
            {draft.status === "published" && (
              <button type="button" onClick={() => window.print()} className="btn-secondary text-sm">
                <Printer className="h-4 w-4" /> Print this card
              </button>
            )}
          </div>

          {/* What was removed. Shown before the card, because it is the part an
              educator must actually read. */}
          {draft.scrub_report?.findings?.length > 0 && (
            <div className="mt-4 rounded-2xl border border-clay-100 bg-cream-50 p-4 print:hidden">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <ShieldCheck className="h-4 w-4 text-sage-600" /> Taken out before anyone can see it
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {draft.scrub_report.findings.map((finding) => (
                  <li
                    key={`${finding.term}-${finding.reason}`}
                    className={`rounded-full px-3 py-1 text-sm ${
                      finding.action === "removed" ? "bg-sage-100 text-sage-700" : "bg-clay-100 text-clay-700"
                    }`}
                  >
                    {finding.term}
                    <span className="ml-1.5 text-xs opacity-70">
                      {finding.action === "removed" ? `removed ×${finding.count}` : "check this"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {draft.scrub_report?.blockers?.length > 0 && (
            <div className="mt-3 rounded-2xl border border-clay-300 bg-cream-50 p-4 print:hidden">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <AlertTriangle className="h-4 w-4 text-clay-700" /> Not ready to print
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                {draft.scrub_report.blockers.map((blocker) => (
                  <li key={blocker} className="text-sm leading-relaxed text-ink-700">{blocker}</li>
                ))}
              </ul>
            </div>
          )}

          {/* The card as the public sees it. Same content, same order. */}
          <article className="mt-4 rounded-3xl border border-clay-200 bg-paper p-6 print:border-0 print:p-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-clay-700">The learning behind this</p>
            <h3 className="mt-2 font-display text-2xl font-bold leading-tight text-ink-900">{draft.card.heading}</h3>
            {draft.card.body.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-relaxed text-ink-700">{paragraph}</p>
            ))}
            {draft.card.dispositions.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {draft.card.dispositions.map((item) => (
                  <li key={item} className="rounded-full bg-cream-100 px-3 py-1 text-sm text-ink-700">{item}</li>
                ))}
              </ul>
            )}
            {draft.card.curriculum.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {draft.card.curriculum.map((item) => (
                  <li key={item} className="rounded-full border border-clay-200 px-3 py-1 text-sm text-ink-700">{item}</li>
                ))}
              </ul>
            )}
          </article>

          {draft.status === "published" ? (
            <PrintableCode code={draft.code} appUrl={appUrl} />
          ) : (
            <div className="mt-5 print:hidden">
              <button
                type="button"
                disabled={busy === draft.id || draft.scrub_report?.safe !== true}
                onClick={() => act(draft.id, "publish")}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {busy === draft.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                This is safe to put on the wall
              </button>
              <p className="mt-2 text-xs leading-relaxed text-ink-500">
                Nothing is printable until you say so. Read the card above first: once a code is on a wall, anyone who
                walks past can scan it.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ------------------------------------------------------- pick a story */}
      <section className="card p-6 sm:p-8 print:hidden">
        <p className="section-title mb-1">Step 1 · Choose</p>
        <h2 className="font-display text-2xl font-bold text-ink-900">Which display is this for?</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
          Pick the story behind what is going on the wall. StoryLoop rewrites it as the learning in that experience and
          takes out every name, date and age before you see it.
        </p>

        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading your stories…</p>
        ) : stories.length === 0 ? (
          <p className="mt-4 text-sm text-ink-600">
            No saved stories yet. <Link href="/generate" className="underline underline-offset-2">Write one first</Link> and it will show up here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-clay-100">
            {stories.map((story) => (
              <li key={story.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{story.title}</p>
                  <p className="text-xs text-ink-500">{dateLabel(story.date)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => build(story.id)}
                  disabled={Boolean(busy)}
                  className="btn-secondary flex-shrink-0 text-xs disabled:opacity-50"
                >
                  {busy === story.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
                  Make a card
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --------------------------------------------------- what is on walls */}
      {published.length > 0 && (
        <section className="card mt-6 p-6 sm:p-8 print:hidden">
          <h2 className="font-display text-2xl font-bold text-ink-900">On your walls now</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
            Take one down and its code stops working immediately, everywhere.
          </p>
          <ul className="mt-4 divide-y divide-clay-100">
            {published.map((card) => (
              <li key={card.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{card.card.heading}</p>
                  <p className="text-xs text-ink-500">
                    {formatWallCode(card.code)} · scanned {card.scan_count ?? 0}{" "}
                    {(card.scan_count ?? 0) === 1 ? "time" : "times"} · until {dateLabel(card.expires_at)}
                  </p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <button type="button" onClick={() => setDraft(card)} className="btn-secondary text-xs">
                    <Eye className="h-3.5 w-3.5" /> View
                  </button>
                  <button type="button" onClick={() => act(card.id, "renew")} disabled={Boolean(busy)} className="btn-secondary text-xs">
                    <RotateCcw className="h-3.5 w-3.5" /> Renew
                  </button>
                  <button
                    type="button"
                    onClick={() => act(card.id, "revoke")}
                    disabled={Boolean(busy)}
                    className="btn-secondary text-xs text-clay-700"
                  >
                    {busy === card.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Take down
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * What actually gets printed and stuck on the wall.
 *
 * The address is printed in words under the square on purpose. A QR code is
 * unreadable to a human, so if somebody swaps the sticker nobody can tell. The
 * printed address is what makes a swap visible, which is why it is not styled
 * away into a tiny grey line.
 */
function PrintableCode({ code, appUrl }: { code: string; appUrl: string }) {
  const host = appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <div className="mt-5 break-inside-avoid rounded-3xl border-2 border-dashed border-clay-300 p-6 text-center print:border-solid print:border-clay-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/wall/qr/${code}`} alt="" width={180} height={180} className="mx-auto h-44 w-44" />
      <p className="mt-3 font-display text-lg font-bold text-ink-900">Scan to see the learning behind this</p>
      <p className="mt-1 font-mono text-sm tracking-wide text-ink-700">
        {host}/w/{formatWallCode(code)}
      </p>
      <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-ink-500">
        No app and no sign-in needed. The page has no names, no photographs and no dates on it. If this printed address
        does not match where your phone takes you, tell a kaiako.
      </p>
    </div>
  );
}
