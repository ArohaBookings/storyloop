"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, MessageSquareText, UserCheck } from "lucide-react";
import SendToLeader from "@/components/app/SendToLeader";
import { CLASS_SET_EVENT, clearClassSet, listClassSet, type ClassPiece } from "@/lib/class-set";

type SentSet = { id: string; sentAt: string; opened: boolean; pieces: number; approved: number; changes: number; open: boolean; comments: Array<{ childName: string; comment: string }> };

/**
 * This sitting's statements, under the drafter on /statement (25 Nov 2026, A1,
 * switch CLASS_SET_ON; the page mounts it only when the switch is on). Quiet
 * until there is a finished draft: then one line, how many, and "Check with my
 * leader", which opens the send panel for the whole room. Kept in this tab
 * only until she sends it. Below it, how the sets she already sent stand.
 */
export default function ClassSetPanel() {
  const [pieces, setPieces] = useState<ClassPiece[]>([]);
  const [open, setOpen] = useState(false);
  const [sets, setSets] = useState<SentSet[]>([]);

  useEffect(() => {
    const read = () => setPieces(listClassSet());
    read();
    window.addEventListener(CLASS_SET_EVENT, read);
    fetch("/api/leader-sets").then((r) => (r.ok ? r.json() : null)).then((data) => { if (data?.sets) setSets(data.sets); }).catch(() => {});
    return () => window.removeEventListener(CLASS_SET_EVENT, read);
  }, []);

  const count = pieces.length;
  return (
    <>
      {count > 0 && (
        <section className="mt-6 rounded-2xl border border-clay-100 bg-cream-50/60 p-4 sm:p-5" data-testid="class-set-panel" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-ink-900" data-testid="class-set-count">{count} {count === 1 ? "statement" : "statements"} this sitting</h2>
              <p className="text-xs text-ink-600">{pieces.map((p) => p.childFirstName).join(", ")}. Kept in this tab until you send them.</p>
            </div>
            {!open && (
              <button type="button" onClick={() => setOpen(true)} className="btn-secondary min-h-[44px] px-4 text-xs" data-testid="class-set-send">
                <UserCheck className="h-3.5 w-3.5" /> Check with my leader
              </button>
            )}
          </div>
          {open && (
            <SendToLeader
              kind="set"
              pieces={pieces}
              where="statement"
              onSent={(result) => { if (result?.setId) { clearClassSet(); fetch("/api/leader-sets").then((r) => r.json()).then((d) => d?.sets && setSets(d.sets)).catch(() => {}); } }}
            />
          )}
        </section>
      )}
      {sets.length > 0 && (
        <section className="mt-6" data-testid="class-set-sent">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-500">Sent to your leader</h2>
          <ul className="mt-2 space-y-2">
            {sets.map((set) => (
              <li key={set.id} className="rounded-xl border border-clay-100 bg-paper p-3 text-sm text-ink-700" data-testid="class-set-sent-row">
                <p>
                  {set.pieces} {set.pieces === 1 ? "statement" : "statements"}, sent {new Date(set.sentAt).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}:{" "}
                  {set.approved + set.changes === 0
                    ? set.opened ? "opened, no answers yet." : "not opened yet."
                    : <><CheckCircle2 className="inline h-4 w-4 text-sage-700" /> {set.approved} {set.approved === 1 ? "looks" : "look"} good{set.changes ? <>, <MessageSquareText className="inline h-4 w-4 text-clay-700" /> {set.changes} {set.changes === 1 ? "suggestion" : "suggestions"}</> : null}.</>}
                </p>
                {set.comments.map((c, i) => (
                  <p key={i} className="mt-1 whitespace-pre-wrap text-xs text-ink-600"><strong className="font-semibold text-ink-800">{c.childName}:</strong> {c.comment}</p>
                ))}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
