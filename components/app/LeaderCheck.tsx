"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { CheckCircle2, MessageSquareText, UserCheck } from "lucide-react";
import SendToLeader from "@/components/app/SendToLeader";
import { type EducatorCheckView } from "@/lib/story-check";
import type { StoryCheckInput, StoryCheckResult } from "@/lib/check-my-story";
import StoryCheckList, { StoryCheckSummary } from "@/components/app/StoryCheckList";

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** True once the element has come near the screen (a closed Story history item never does). */
function useSeen(node: RefObject<HTMLElement | null>) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (seen || !node.current) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setSeen(true); observer.disconnect(); }
    }, { rootMargin: "300px" });
    observer.observe(node.current);
    return () => observer.disconnect();
  }, [node, seen]);
  return seen;
}

/**
 * Check my story on her own story, before she sends it (19 Nov 2026): the same
 * four questions her leader's queue shows. The one-line answer, with the four
 * lines open when something is worth a look and one tap away when nothing is.
 * Story history passes the saved story in; /generate passes nothing and the
 * saved story is read once, so the check is of exactly what the leader gets.
 *
 * Nothing happens until the panel comes near the screen, and the check's code
 * is fetched then, on its own: the story page and Story history load exactly
 * as fast as before, and a closed story in a long history costs nothing.
 */
function useOwnStoryCheck(storyId: string, review: StoryCheckInput | undefined, refreshKey: string | undefined, seen: boolean) {
  const [fetched, setFetched] = useState<StoryCheckInput | null>(null);
  const [result, setResult] = useState<StoryCheckResult | null>(null);
  const given = Boolean(review);
  useEffect(() => {
    if (given || !seen) return;
    let live = true;
    fetch(`/api/stories/${encodeURIComponent(storyId)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const saved = data?.story;
        if (!live || !saved || typeof saved.story_text !== "string") return;
        const metadata = saved.metadata && typeof saved.metadata === "object" ? (saved.metadata as Record<string, unknown>) : {};
        setFetched({
          story: saved.story_text,
          note: typeof saved.observations === "string" ? saved.observations : null,
          curriculumLinks: strings(metadata.curriculumLinks),
          childName: typeof saved.child_name === "string" ? saved.child_name : null,
        });
      })
      .catch(() => {});
    return () => { live = false; };
  }, [storyId, given, refreshKey, seen]);
  const story = review?.story ?? fetched?.story ?? "";
  const note = review?.note ?? fetched?.note ?? null;
  const outcomes = (review?.outcomes ?? []).join("\n");
  const links = (review?.curriculumLinks ?? fetched?.curriculumLinks ?? []).join("\n");
  const childName = review?.childName ?? fetched?.childName ?? null;
  useEffect(() => {
    if (!seen || !story) return;
    let live = true;
    import("@/lib/check-my-story")
      .then(({ checkMyStory }) => {
        if (!live) return;
        setResult(checkMyStory({ story, note, outcomes: outcomes ? outcomes.split("\n") : [], curriculumLinks: links ? links.split("\n") : [], childName }));
      })
      .catch(() => {});
    return () => { live = false; };
  }, [seen, story, note, outcomes, links, childName]);
  return result;
}

function day(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

/**
 * "Send this story to your leader", on a saved story (lib/story-check.ts).
 *
 * The educator makes a private link to this one story and sends it however
 * they already talk to their head teacher or mentor. The link is shown once,
 * here, straight after it is made: it is never stored, so after a reload the
 * panel shows where the check stands and offers a fresh link instead.
 *
 * 13 Nov 2026: two optional things before the link is made, both empty by
 * default: the centre's name, and a tick to show the leader a few numbers about
 * her own recent stories. Left as they are, the link is exactly what it was.
 * /history#leader-<story id> opens this panel (the dashboard's centre card).
 */
export default function LeaderCheck({
  storyId,
  initial,
  review,
  refreshKey,
}: {
  storyId: string;
  initial?: EducatorCheckView;
  /** The saved story and its note, for Check my story. Without it the saved story is read once. */
  review?: StoryCheckInput;
  /** Changes when the story on screen was saved again (on /generate), so the check reads it again. */
  refreshKey?: string;
}) {
  const [check, setCheck] = useState<EducatorCheckView>(initial ?? { state: "none" });
  // SendToLeader shows its own link and Cancel once sent: this panel then hides its copies (R3-4).
  const [sendDone, setSendDone] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const storyCheck = useOwnStoryCheck(storyId, review, refreshKey, useSeen(panel));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [where, setWhere] = useState<"generate" | "history">("history");
  useEffect(() => { if (window.location.pathname.startsWith("/generate")) setWhere("generate"); }, []);

  // Arriving from "Send a story to your leader": open this story and bring the panel into view.
  useEffect(() => {
    if (window.location.hash !== `#leader-${storyId}`) return;
    const details = panel.current?.closest("details");
    if (details) details.open = true;
    window.setTimeout(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }, [storyId]);

  // Cancel the link, answered or not (the form that makes a link is components/app/SendToLeader.tsx, 25 Nov 2026).
  const cancel = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/stories/${encodeURIComponent(storyId)}/check`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { setError(data.error ?? "That did not work. Try again."); return; }
      setCheck(data.check ?? { state: "none" });
    } catch {
      setError("That did not work. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const who = check.state !== "none" && check.leaderName ? check.leaderName : "Your leader";
  const waiting = check.state === "open";
  const answered = check.state === "answered";
  // A cancelled link keeps showing what the leader said, if they answered first.
  const cancelled = check.state === "cancelled";
  const decision = check.state === "none" ? null : check.decision;
  const hasAnswer = (answered || cancelled) && Boolean(decision);

  return (
    <section ref={panel} id={`leader-${storyId}`} className="mt-5 scroll-mt-24 rounded-2xl border border-clay-100 bg-cream-50/60 p-4 sm:p-5" data-testid="leader-check-panel">
      <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
        <UserCheck className="h-4 w-4 text-clay-700" /> Send this story to your leader
      </h3>

      {hasAnswer && "decision" in check && (
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

      <div className="mt-2">
        <p className="text-sm leading-relaxed text-ink-700">
          {waiting
            ? check.opened
              ? `Your leader opened it. Waiting for their answer (link made ${day(check.sentAt)}).`
              : `Waiting for your leader to open it (link made ${day(check.sentAt)}).`
            : answered
              ? "Edited it since? Send it again."
              : cancelled && hasAnswer
                ? "You cancelled the link, so it no longer opens this story. Edited it since? Send it again."
                : "Send your head teacher or mentor this one story. They see your note beside the story and answer in about two minutes. They do not need an account."}
        </p>
        {storyCheck && (
          <details className="group mt-3 min-w-0" open={storyCheck.looks > 0} data-testid="own-story-check">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
              <StoryCheckSummary check={storyCheck} as="span" />
              <span className="text-xs font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 group-open:hidden">What it checks</span>
            </summary>
            <StoryCheckList check={storyCheck} heading="What your leader will look for" className="mt-1" />
          </details>
        )}
        <SendToLeader
          kind="story"
          storyId={storyId}
          where={where}
          again={waiting || answered || hasAnswer}
          onSent={(result) => { if (result?.check) setCheck(result.check); }}
          onDoneChange={setSendDone}
        />
        {/* Answered too: the educator can always end a link, and the centre offer it carried (lib/story-check-server.ts endStoryLinks). */}
        {(waiting || answered) && !sendDone && (
          <button type="button" onClick={cancel} disabled={busy} className="btn-ghost mt-2 px-3 py-2 text-xs" data-testid="leader-check-cancel">Cancel the link</button>
        )}
        {waiting && !sendDone && <p className="mt-2 text-xs text-ink-500">A new link stops the old one working.</p>}
      </div>

      {error && <p className="mt-3 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-xs text-clay-800" role="alert">{error}</p>}
    </section>
  );
}
