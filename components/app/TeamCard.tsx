"use client";
import { useState } from "react";
import Link from "next/link";
import { Users, X } from "lucide-react";
import StartCentreMonth from "@/components/app/StartCentreMonth";
import { WORK_ROLES, WORK_ROLE_LABELS, decidesForCentre, type WorkRole } from "@/lib/work-role";

/**
 * One question, asked once after an educator's second story: what do you do?
 * A leader then sees their centre's free month in the same card; everyone else
 * gets one useful line and the card is gone. See lib/work-role.ts for why.
 */
export default function TeamCard({ start }: { start: "ask" | "centre" }) {
  const [view, setView] = useState<"ask" | "centre" | "thanks" | "gone">(start);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const post = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/me/role", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Could not save that. Try again.");
  };

  const answer = async (role: WorkRole) => {
    setBusy(true); setError("");
    try {
      await post({ role });
      setView(decidesForCentre(role) ? "centre" : "thanks");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save that. Try again.");
    } finally { setBusy(false); }
  };

  const dismiss = async () => {
    setView("gone");
    try { await post({ dismissCentreCard: true }); } catch { /* it comes back next visit, which is fine */ }
  };

  if (view === "gone") return null;

  return (
    <section className="card mb-6 min-w-0 p-5 md:p-6" data-testid="team-card" aria-live="polite">
      {view === "ask" && (
        <>
          <p className="section-title mb-1">One quick question</p>
          <h2 className="font-display text-xl font-bold text-ink-900">What do you do?</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">One tap, so StoryLoop shows you what fits your job.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2" role="group" aria-label="What do you do?">
            {WORK_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                disabled={busy}
                onClick={() => answer(role)}
                className="min-h-[48px] rounded-2xl border border-clay-200 bg-paper px-4 py-3 text-left text-sm font-semibold text-ink-800 transition-colors hover:border-clay-400 hover:bg-cream-50 disabled:opacity-60"
                data-testid={`role-${role}`}
              >
                {WORK_ROLE_LABELS[role]}
              </button>
            ))}
          </div>
          {error && <p role="alert" className="mt-3 text-xs text-clay-700">{error}</p>}
        </>
      )}

      {view === "centre" && (
        <div className="flex min-w-0 items-start gap-3" data-testid="team-card-centre">
          <div className="hidden h-11 w-11 flex-none items-center justify-center rounded-2xl bg-clay-700 text-paper sm:flex">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="section-title mb-1">For your whole team</p>
            <h2 className="font-display text-xl font-bold text-ink-900">Your centre&apos;s first month is free. No card.</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">
              Up to 10 educators and every child. Your team writes from their own notes, you see who is documenting and
              which children are thin, you can check a story in two minutes, and each child&apos;s end-of-year summary comes
              from the stories already saved. If it is not for you, do nothing: the month ends and nothing is charged.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <StartCentreMonth from="dashboard" className="btn-primary justify-center" />
              <Link href="/for-centres?utm_source=app&utm_medium=team_card" className="text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4">
                What centres get
              </Link>
            </div>
          </div>
          <button type="button" onClick={dismiss} aria-label="Not now" className="-mr-2 -mt-2 flex h-11 w-11 flex-none items-center justify-center rounded-full text-ink-400 hover:bg-cream-100 hover:text-ink-700" data-testid="team-card-dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {view === "thanks" && (
        <div data-testid="team-card-thanks">
          <p className="section-title mb-1">Thanks</p>
          <p className="text-sm leading-relaxed text-ink-700">
            Want a second pair of eyes on a story? Open it in{" "}
            <Link href="/history" className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4">History</Link>{" "}
            and tap &ldquo;Ask your leader to check it&rdquo;. They get a private link and need no account.
          </p>
        </div>
      )}
    </section>
  );
}
