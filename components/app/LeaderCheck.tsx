"use client";

import { useState } from "react";
import { Check, CheckCircle2, Copy, Loader2, MessageSquareText, Share2, UserCheck } from "lucide-react";
import { track } from "@/lib/analytics/client";
import { CHECK_DAYS, type EducatorCheckView } from "@/lib/story-check";

function day(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

/**
 * "Ask your leader to check it", on a saved story (lib/story-check.ts).
 *
 * The educator makes a private link to this one story and sends it however
 * they already talk to their head teacher or mentor. The link is shown once,
 * here, straight after it is made: it is never stored, so after a reload the
 * panel shows where the check stands and offers a fresh link instead.
 */
export default function LeaderCheck({ storyId, initial }: { storyId: string; initial?: EducatorCheckView }) {
  const [check, setCheck] = useState<EducatorCheckView>(initial ?? { state: "none" });
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const call = async (method: "POST" | "DELETE") => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/stories/${encodeURIComponent(storyId)}/check`, { method });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error ?? "That did not work. Try again."); return; }
      setCheck(data.check ?? { state: "none" });
      setUrl(method === "POST" ? data.url ?? "" : "");
      if (method === "POST") track("leader_check_sent", {});
    } catch {
      setError("That did not work. Check your connection and try again.");
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

  const share = async () => {
    try {
      await navigator.share({ title: "A learning story to check", text: "Could you check this learning story for me? It takes two minutes.", url });
    } catch {
      /* closed the share sheet */
    }
  };

  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const who = check.state !== "none" && check.leaderName ? check.leaderName : "Your leader";
  const waiting = check.state === "open";
  const answered = check.state === "answered";

  return (
    <section className="mt-5 rounded-2xl border border-clay-100 bg-cream-50/60 p-4 sm:p-5" data-testid="leader-check-panel">
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
        <UserCheck className="h-4 w-4 text-clay-700" /> Ask your leader to check it
      </h3>

      {answered && (
        <div className="mt-3 rounded-xl border border-sage-200 bg-sage-50 p-3" data-testid="leader-check-result">
          <p className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-sage-900">
            {check.decision === "approved" ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" /> : <MessageSquareText className="mt-0.5 h-4 w-4 flex-none" />}
            {check.decision === "approved"
              ? `${who} checked this on ${day(check.decidedAt)}: looks good.`
              : `${who} suggested a change on ${day(check.decidedAt)}:`}
          </p>
          {check.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{check.comment}</p>}
        </div>
      )}

      {url ? (
        <div className="mt-3" data-testid="leader-check-link">
          <p className="text-sm leading-relaxed text-ink-700">
            Send this link to your head teacher or mentor. It opens this one story, with your note beside it, for {CHECK_DAYS} days.
          </p>
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="input mt-2 font-mono text-xs" aria-label="Private link to this story" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copy} className="btn-primary px-4 py-2 text-xs">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy link"}
            </button>
            {canShare && (
              <button type="button" onClick={share} className="btn-secondary px-4 py-2 text-xs">
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            )}
            <button type="button" onClick={() => call("DELETE")} disabled={busy} className="btn-ghost px-3 py-2 text-xs">Cancel the link</button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-500">
            Copy it now: for safety it is shown once and not kept. You can always make a new one.
          </p>
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm leading-relaxed text-ink-700">
            {waiting
              ? check.opened
                ? `Your leader opened it. Waiting for their answer (link made ${day(check.sentAt)}).`
                : `Waiting for your leader to open it (link made ${day(check.sentAt)}).`
              : answered
                ? "Edited it since? Send it again."
                : "Send your head teacher or mentor a private link to this one story. They see your note beside the story and answer in about two minutes. They do not need an account."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => call("POST")} disabled={busy} className="btn-secondary px-4 py-2 text-xs disabled:opacity-60" data-testid="leader-check-make">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
              {waiting || answered ? "Make a new link" : "Make the link"}
            </button>
            {waiting && (
              <button type="button" onClick={() => call("DELETE")} disabled={busy} className="btn-ghost px-3 py-2 text-xs">Cancel the link</button>
            )}
          </div>
          {waiting && <p className="mt-2 text-xs text-ink-500">A new link stops the old one working.</p>}
        </div>
      )}

      {error && <p className="mt-3 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-xs text-clay-800" role="alert">{error}</p>}
    </section>
  );
}
