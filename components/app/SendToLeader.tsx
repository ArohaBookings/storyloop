"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Eye, Loader2, Mail, Share2, UserCheck, X } from "lucide-react";
import type { ClassPiece } from "@/lib/class-set";
import { CENTRE_NAME_MAX, CHECK_DAYS, type EducatorCheckView, type LeaderView } from "@/lib/story-check";
import type { SetView } from "@/lib/leader-sets";
import { suggestEmailFix } from "@/lib/email-typo";
import { trackEvent } from "@/lib/analytics/track-event";
import { LEADER_SEND_PLACES } from "@/lib/analytics/events";
import { LEADER_EMAIL_ON } from "@/lib/build-switches";
import LeaderCheckPage from "@/components/marketing/LeaderCheckPage";

/**
 * "Check with my leader": one story, or a whole room's statements as one set
 * (25 Nov 2026, switches LEADER_EMAIL_ON and CLASS_SET_ON).
 *
 * The centre's name, her leader's email (StoryLoop sends it for her) or the
 * link to copy, the join tick, and "See what your leader will see": the
 * leader's own page from this exact content, every button inert. The address
 * is read back large before anything is sent. With LEADER_EMAIL_ON off there
 * is no email box: the link to copy, as before.
 */
export type SendToLeaderProps = ({ kind: "story"; storyId: string } | { kind: "set"; pieces: ClassPiece[] }) & {
  onSent?: (result?: { check?: EducatorCheckView; setId?: string }) => void;
  /** Told when the panel shows its own link and Cancel (the done step), so a host hides its copies (R3-4). */
  onDoneChange?: (done: boolean) => void;
  /** Where the card is shown (a story, the statement page, the statement wall), recorded on leader_send_offered and leader_check_sent. */
  where?: LeaderSendPlace;
  /** Story only: the existing "how many children I have written about lately" tick. */
  showCounts?: boolean;
  /** Story only: the panel already has a live link, so the button makes a new one. */
  again?: boolean;
};

/** The join tick's words, exactly as ruled on 24 Nov (RULINGS.txt answer 1). */
export const JOIN_WORDS = "If my leader starts our centre on StoryLoop, add me to the team. My drafts stay private, and if I pay for my own plan I keep paying until I change it.";
/**
 * What the set panel says before she sends (RULINGS.txt answer 4, made true of
 * the code: the wipe is 7 days after the link ends or is cancelled, R1-12).
 */
export const KEEP_WORDS = "To send this, StoryLoop keeps these statements for 14 days so your leader can open them, and deletes them a week after the link ends.";

export type LeaderSendPlace = (typeof LEADER_SEND_PLACES)[number];

/** Where the card is, as recorded: what the page passed, else a story's or a set's usual place. Pure. */
export function leaderSendPlace(kind: "story" | "set", where?: LeaderSendPlace | null): LeaderSendPlace {
  if (where && (LEADER_SEND_PLACES as readonly string[]).includes(where)) return where;
  return kind === "set" ? "statement" : "history";
}

type Step = "form" | "confirm" | "done";
type Email = { asked: false } | { asked: true; sent: true } | { asked: true; sent: false; reason: string; message: string };

export default function SendToLeader(props: SendToLeaderProps) {
  const [step, setStep] = useState<Step>("form");
  const onDoneChange = props.onDoneChange;
  useEffect(() => { onDoneChange?.(step === "done"); }, [step, onDoneChange]);
  const [centreName, setCentreName] = useState("");
  const [address, setAddress] = useState("");
  const [firstName, setFirstName] = useState("");
  const [askName, setAskName] = useState(false);
  const [join, setJoin] = useState(true);
  const [counts, setCounts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [setId, setSetId] = useState("");
  const [email, setEmail] = useState<Email>({ asked: false });
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<LeaderView | SetView | null>(null);
  // Escape closes the preview, as Close does.
  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);
  const offered = useRef(false);
  const id = props.kind === "story" ? props.storyId : "set";
  const pieces = props.kind === "set" ? props.pieces : null;
  const place = leaderSendPlace(props.kind, props.where);

  useEffect(() => {
    if (offered.current) return;
    offered.current = true;
    trackEvent("leader_send_offered", { kind: props.kind, where: place });
  }, [props.kind, place]);

  if (props.kind === "set" && (!pieces || pieces.length === 0)) return null;

  const typed = address.trim().toLowerCase();
  const fix = typed ? suggestEmailFix(typed) : null;

  const openPreview = async () => {
    setError("");
    try {
      const response = props.kind === "story"
        ? await fetch(`/api/stories/${encodeURIComponent(props.storyId)}/check?preview=1&centre=${encodeURIComponent(centreName.trim())}&join=${join ? 1 : 0}`)
        : await fetch("/api/leader-sets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preview: true, pieces, centreName: centreName.trim(), joinConsent: join }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.view) { setError(data.error ?? "Could not show it. Try again."); return; }
      setPreview(data.view);
      trackEvent("leader_preview_opened", { kind: props.kind });
    } catch {
      setError("Could not show it. Check your connection and try again.");
    }
  };

  const send = async (withEmail: boolean) => {
    if (busy) return;
    setBusy(true); setError("");
    const body: Record<string, unknown> = { centreName: centreName.trim(), joinConsent: join };
    if (withEmail) body.email = typed;
    if (withEmail && firstName.trim()) body.firstName = firstName.trim();
    if (props.kind === "story") body.shareCounts = counts;
    else body.pieces = pieces;
    try {
      const response = props.kind === "story"
        ? await fetch(`/api/stories/${encodeURIComponent(props.storyId)}/check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        : await fetch("/api/leader-sets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) { setError(data.error ?? "That did not work. Try again."); setStep("form"); return; }
      const outcome = (data.email ?? { asked: false }) as Email;
      if (outcome.asked && !outcome.sent && outcome.reason === "no_name") {
        // The link exists; she is asked for her first name and can send from here or copy it.
        setAskName(true);
      }
      setUrl(data.url); setSetId(data.setId ?? ""); setEmail(outcome); setStep("done");
      trackEvent("leader_check_sent", {
        kind: props.kind,
        where: place,
        pieces: props.kind === "set" ? data.pieces ?? pieces?.length ?? 0 : 1,
        emailed: outcome.asked && outcome.sent,
        join_consent: join,
        sources: false,
        centre_name: Boolean(centreName.trim()),
        counts: props.kind === "story" ? counts : false,
        ...(props.kind === "story" ? { story_id: props.storyId } : {}),
      });
      props.onSent?.({ check: data.check, setId: data.setId });
    } catch {
      setError("That did not work. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  // The link is made; her account had no first name, so the email waits for it.
  const sendExisting = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/leader-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: url.split("#")[1] ?? "", email: typed, firstName: firstName.trim() }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error ?? "That did not work. Try again."); return; }
      const outcome = (data.email ?? { asked: false }) as Email;
      setEmail(outcome);
      setAskName(outcome.asked && !outcome.sent && outcome.reason === "no_name");
    } catch {
      setError("That did not work. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = props.kind === "story"
        ? await fetch(`/api/stories/${encodeURIComponent(props.storyId)}/check`, { method: "DELETE" })
        : await fetch(`/api/leader-sets?id=${encodeURIComponent(setId)}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error ?? "Could not cancel the link."); return; }
      setUrl(""); setStep("form"); setEmail({ asked: false });
      props.onSent?.({ check: data.check });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Press and hold the link to copy it.");
    }
  };
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const what = props.kind === "set" ? `${pieces?.length ?? 0} ${pieces?.length === 1 ? "statement" : "statements"}` : "this story";

  return (
    <div className="mt-3" data-testid="send-to-leader" data-kind={props.kind} data-where={place}>
      {step === "done" && url ? (
        <div data-testid="leader-check-link">
          {email.asked && email.sent ? (
            <p className="rounded-xl border border-sage-200 bg-sage-50 p-3 text-sm font-semibold leading-relaxed text-sage-900" role="status" data-testid="leader-email-sent">
              Sent to {typed}. If it is not opened in two days, StoryLoop sends one reminder. Then nothing more.
            </p>
          ) : email.asked ? (
            <div className="rounded-xl border border-clay-200 bg-clay-50 p-3" role="status">
              <p className="text-sm leading-relaxed text-clay-900" data-testid="leader-email-held">{email.message}</p>
              {/* A send that did not leave is not counted: she can try again with the same link. */}
              {email.reason === "failed" && (
                <button type="button" onClick={sendExisting} disabled={busy} className="btn-secondary mt-2 min-h-[44px] px-4 text-xs" data-testid="leader-email-retry">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />} Try again
                </button>
              )}
            </div>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-ink-700">
            {email.asked && email.sent ? "The same link, if you want it:" : `Send this link to your leader. It opens ${what}, with your notes beside ${props.kind === "set" ? "them" : "it"}, for ${CHECK_DAYS} days.`}
          </p>
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="input mt-2 font-mono text-xs" aria-label="Private link" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="btn-primary min-h-[44px] px-4 py-2 text-xs">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy link"}
            </button>
            {canShare && (
              <button type="button" onClick={() => navigator.share({ title: "Something to check", text: "Could you check this for me? It takes about two minutes.", url }).catch(() => {})} className="btn-secondary min-h-[44px] px-4 py-2 text-xs">
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            )}
            <button type="button" onClick={cancel} disabled={busy} className="btn-ghost min-h-[44px] px-3 py-2 text-xs">Cancel the link</button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-500">For safety the link is shown once and not kept. You can always make a new one.</p>
          {askName && (
            <div className="mt-3 rounded-xl border border-clay-100 bg-paper p-3" data-testid="leader-ask-name">
              <label htmlFor={`leader-first-${id}`} className="text-xs font-semibold text-ink-700">Your first name, so your leader knows who it is from</label>
              <div className="mt-1 flex gap-2">
                <input id={`leader-first-${id}`} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" className="input text-sm" data-testid="leader-first-name" />
                <button type="button" onClick={sendExisting} disabled={busy || !firstName.trim()} className="btn-primary min-h-[44px] flex-none px-4 text-xs" data-testid="leader-first-name-send">Send it</button>
              </div>
            </div>
          )}
        </div>
      ) : step === "confirm" ? (
        <div className="rounded-2xl border border-clay-200 bg-paper p-4" data-testid="leader-email-confirm">
          <p className="text-sm text-ink-600">Send {what} to</p>
          <p className="mt-1 break-all font-display text-2xl font-bold text-ink-900" data-testid="leader-email-readback">{typed}?</p>
          {fix && (
            <button type="button" onClick={() => setAddress(fix)} className="mt-2 min-h-[44px] text-sm font-semibold text-clay-700 underline underline-offset-2" data-testid="leader-email-fix">
              Did you mean {fix}?
            </button>
          )}
          <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
            <button type="button" onClick={() => send(true)} disabled={busy} className="btn-primary min-h-[48px] justify-center text-sm" data-testid="leader-email-yes">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Yes, send it
            </button>
            <button type="button" onClick={() => setStep("form")} disabled={busy} className="btn-secondary min-h-[48px] justify-center text-sm">Change it</button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:max-w-md">
          {place === "wall" && (
            // From "Ask my centre to pay": the leader is asked to check, never to pay (no offer in the
            // email, CONDUCTOR rule 6), so she is told to ask herself (R3-3, R4-8).
            <p className="text-sm leading-relaxed text-ink-700" data-testid="leader-wall-ask">
              Your leader gets these statements to check. Ask her yourself if the centre will pay: centres are free on StoryLoop until 31 January 2027.
            </p>
          )}
          <label htmlFor={`leader-centre-${id}`} className="text-xs font-semibold text-ink-700">
            Your centre&apos;s name <span className="font-normal text-ink-500">(optional)</span>
          </label>
          <input id={`leader-centre-${id}`} value={centreName} maxLength={CENTRE_NAME_MAX} onChange={(e) => setCentreName(e.target.value)} autoComplete="organization" className="input text-sm" data-testid="leader-check-centre-name" />
          {LEADER_EMAIL_ON && (
            <>
              <label htmlFor={`leader-email-${id}`} className="mt-1 text-xs font-semibold text-ink-700">
                Your leader&apos;s email <span className="font-normal text-ink-500">(optional: StoryLoop emails it for you, or leave it empty to copy the link)</span>
              </label>
              <input id={`leader-email-${id}`} type="email" inputMode="email" value={address} onChange={(e) => { setAddress(e.target.value); setError(""); }} autoComplete="off" className="input text-sm" data-testid="leader-email-input" />
            </>
          )}
          {props.kind === "story" && props.showCounts !== false && (
            <label className="flex min-h-[44px] cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-ink-700">
              <input type="checkbox" checked={counts} onChange={(e) => setCounts(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-clay-700" data-testid="leader-check-share-counts" />
              Also show my leader how many children I have written about lately (numbers only, no names)
            </label>
          )}
          {LEADER_EMAIL_ON && (
            <label className="flex min-h-[44px] cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-ink-700">
              <input type="checkbox" checked={join} onChange={(e) => setJoin(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none accent-clay-700" data-testid="leader-join-consent" />
              {JOIN_WORDS}
            </label>
          )}
          {props.kind === "set" && <p className="text-xs leading-relaxed text-ink-600" data-testid="leader-set-keep">{KEEP_WORDS}</p>}
          <div className="mt-1 flex flex-wrap gap-2">
            {LEADER_EMAIL_ON && typed ? (
              <button type="button" onClick={() => { setError(""); setStep("confirm"); }} disabled={busy} className="btn-primary min-h-[44px] px-4 py-2 text-xs" data-testid="leader-email-send">
                <Mail className="h-3.5 w-3.5" /> Send it to my leader
              </button>
            ) : (
              <button type="button" onClick={() => send(false)} disabled={busy} className="btn-secondary min-h-[44px] px-4 py-2 text-xs disabled:opacity-60" data-testid="leader-check-make">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                {props.again ? "Make a new link" : "Make the link"}
              </button>
            )}
            {LEADER_EMAIL_ON && (
              <button type="button" onClick={openPreview} className="btn-ghost min-h-[44px] px-3 py-2 text-xs" data-testid="leader-preview-open">
                <Eye className="h-3.5 w-3.5" /> See what your leader will see
              </button>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-3 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-xs text-clay-800" role="alert">{error}</p>}

      {/* On document.body, above the app header's stacking context, so Close is always on top (R3-1). */}
      {preview && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-cream-50" role="dialog" aria-modal="true" aria-label="What your leader will see" data-testid="leader-preview">
          <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-clay-100 bg-paper px-4 py-2">
            <p className="text-sm font-semibold text-ink-800">This is what your leader will see. The buttons do nothing here.</p>
            <button type="button" onClick={() => setPreview(null)} className="btn-secondary min-h-[44px] flex-none px-3 text-xs" data-testid="leader-preview-close">
              <X className="h-4 w-4" /> Close
            </button>
          </div>
          <div className="py-6">
            <LeaderCheckPage preview={preview} />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
