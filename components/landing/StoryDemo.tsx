"use client";
import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, HelpCircle, PenLine } from "lucide-react";
import Link from "next/link";
import GeneratingIndicator from "@/components/app/GeneratingIndicator";
import { track } from "@/lib/analytics/client";

const PLACEHOLDER = `• Noah (3yo) filled a bucket with damp sand
• Turned it over carefully and tapped the sides
• Built a tower beside Amelia, then swapped the spade when she asked
• Said "I'm making a castle for the dragon"
• When one side collapsed, he packed more sand around the base and tried again`;

/**
 * Pre-filled on load. An empty textarea is where intent dies: half our traffic
 * is on a phone, arriving mid-scroll from a Facebook group, and asking them to
 * type before they have seen anything is the single largest drop in the funnel
 * (649 page views produced only 45 demo starts).
 */
const SAMPLE = `Noah (3yo) filled a bucket with damp sand, turned it over carefully and tapped the sides. He built a tower beside Amelia, then swapped the spade when she asked. He said "I'm making a castle for the dragon". When one side collapsed, he packed more sand around the base and tried again.`;

/**
 * Real StoryLoop output, shown at rest so the promise is proven before anyone
 * lifts a finger. Labelled as an example everywhere it appears: this is a
 * genuine draft from a different note, never passed off as the visitor's own.
 */
const EXAMPLE_OUTPUT = `Making the tower stronger

Learning Story
Tama built a tower with the blocks, stacking them one at a time until it stood taller than his knees. When it tipped and fell, he did not walk away. He crouched down, looked at the pieces spread on the mat, and started again with a wider base. This time the tower held. He sat back on his heels and looked at it for a while before adding one more block to the top.

What learning we noticed
Tama was working through a real building problem. He noticed his first tower was not stable, changed his plan, and tested a new idea rather than repeating the one that failed. Making the base wider shows early thinking about balance and support. Staying with the problem after it collapsed shows he is comfortable sitting in the difficult part of a task.

Curriculum links
Exploration, Mana Aotūroa. Tama used trial and error on a problem he set for himself, which is the kind of working theory this strand describes.
Communication, Mana Reo. He tested an idea with his hands and his body before he had words for it.

Where to next
We can leave the blocks out tomorrow with some heavier pieces added, so there is something new to balance. We will watch whether Tama goes to the wide base straight away, and name what he is doing out loud so other children hear the thinking.

Whānau link
Tama is enjoying building things that stand up on their own. If you have boxes or containers at home, he might like stacking them to see how tall he can get before they tip.`;

/** Real fields the generator returns alongside the story. Listed, never faked. */
const ALSO_GENERATED = [
  "Evidence anchors",
  "Assumptions flagged",
  "Educator checks",
  "Privacy check",
  "Child voice",
  "Dispositions",
];

type Clarify = { reason: string; questions: string[] };

export default function StoryDemo({ compact = false }: { compact?: boolean }) {
  const [input, setInput] = useState(SAMPLE);
  const [touched, setTouched] = useState(false);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [clarify, setClarify] = useState<Clarify | null>(null);
  const [usage, setUsage] = useState(0);

  const handleGenerate = async (proceedWithoutClarification = false) => {
    if (!input.trim()) { setError("Add a few observations first"); return; }
    if (usage >= 1) {
      setError("You've used your free demo. Sign up to keep going with editable story history.");
      track("demo_limit");
      return;
    }
    setLoading(true); setError(""); setOutput(""); setClarify(null);
    track("demo_started", { inputWords: input.trim().split(/\s+/).length, prefilled: !touched });
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observations: input, ageGroup: "3-4 years", demo: true, proceedWithoutClarification }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      if (data.needsClarification) {
        setClarify({
          reason: typeof data.clarificationReason === "string" && data.clarificationReason.trim()
            ? data.clarificationReason
            : "Add a little more detail so the story stays grounded in what you actually saw.",
          questions: Array.isArray(data.clarificationQuestions)
            ? data.clarificationQuestions.filter((q: unknown): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 3)
            : [],
        });
        track("demo_clarification");
        return;
      }
      if (!data.story) throw new Error("No story came back. Please try again.");
      setOutput(data.story); setUsage(usage + 1);
      track("demo_completed", { storyWords: String(data.story).trim().split(/\s+/).length });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      track("demo_error", { message: e instanceof Error ? e.message.slice(0, 120) : "unknown" });
    } finally { setLoading(false); }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const rows = compact ? 5 : 8;
  const showingExample = !output && !loading && !clarify;

  return (
    <div className={compact ? "grid min-w-0 gap-4" : "grid min-w-0 gap-5 lg:grid-cols-2"}>
      {/* ---------------------------------------------------------- input */}
      <div className="card min-w-0 p-5 sm:p-6">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="demo-note" className="label mb-0">A real observation</label>
          <button
            type="button"
            onClick={() => { setInput(SAMPLE); setTouched(false); setError(""); setClarify(null); }}
            className="text-[11px] font-bold text-clay-700 hover:text-clay-900"
          >
            Reset example
          </button>
        </div>

        <textarea
          id="demo-note"
          value={input}
          onChange={(e) => { setInput(e.target.value); setTouched(true); if (clarify) setClarify(null); }}
          rows={rows}
          placeholder={PLACEHOLDER}
          className="input resize-none font-mono text-sm leading-relaxed"
        />

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-500">
            {touched ? "Your words stay exactly as you wrote them." : "Edit it, or run it as it is."}
          </p>
          <button
            onClick={() => handleGenerate()}
            disabled={loading || !input.trim()}
            className="btn-primary w-full flex-shrink-0 text-sm sm:w-auto"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {touched ? "Write my story" : "Watch it write this"}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-clay-200 bg-clay-50 px-3 py-2 text-xs text-clay-700">{error}</div>
        )}
      </div>

      {/* --------------------------------------------------------- output */}
      <div className="story-safe card-warm relative flex min-w-0 max-w-full flex-col overflow-hidden p-5 sm:p-6"
           style={{ minHeight: compact ? 240 : 300 }}>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <label className="section-title">
            {showingExample ? "Example draft" : "Your learning story"}
          </label>
          {output && (
            <button onClick={handleCopy} className="btn-ghost px-3 py-1 text-xs">
              {copied ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>

        {loading ? (
          <GeneratingIndicator />
        ) : clarify ? (
          <div className="flex flex-1 flex-col">
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-cream-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <HelpCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-base font-bold text-ink-900">One optional detail could make this stronger</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">{clarify.reason}</p>
                </div>
              </div>
              {clarify.questions.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {clarify.questions.map((q) => (
                    <li key={q} className="flex gap-2 text-sm text-ink-700">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-ink-500">Add anything you remember, or continue with what you have. This did not use your free try.</p>
                <button type="button" onClick={() => handleGenerate(true)} disabled={loading}
                        className="btn-primary flex-shrink-0 px-4 py-2 text-xs">
                  Write with what I have
                </button>
              </div>
            </div>
          </div>
        ) : output ? (
          <div className="story-safe flex min-w-0 flex-1 flex-col">
            <div className="story-safe prose prose-sm min-w-0 max-w-full flex-1 whitespace-pre-wrap break-words font-display font-normal italic leading-relaxed text-ink-700">
              {output}
            </div>
            <div className="mt-4 border-t border-clay-200 pt-4 text-center">
              <p className="mb-2 text-xs text-ink-600">Want to save, share and personalise with child names?</p>
              <Link href="/signup" className="btn-primary px-4 py-2 text-xs">Sign up — 3 more free stories</Link>
            </div>
          </div>
        ) : (
          /* At rest: show a real draft so the promise is proven before any effort. */
          <div className="story-safe flex min-w-0 flex-1 flex-col">
            <div className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-clay-200 bg-cream-50 px-2.5 py-1">
              <PenLine className="h-3 w-3 text-clay-600" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-clay-700">From a different note</span>
            </div>
            {/* Capped in the hero so a full-length draft cannot push the button
                below the fold on a phone. The scroll is the point: it shows
                there is more story than fits, which a short excerpt cannot. */}
            <div
              className={`story-safe prose prose-sm min-w-0 max-w-full flex-1 overflow-y-auto whitespace-pre-wrap break-words font-display font-normal italic leading-relaxed text-ink-500 ${compact ? "max-h-[15rem]" : ""}`}
            >
              {EXAMPLE_OUTPUT}
            </div>
            <div className="mt-3 border-t border-clay-100 pt-3">
              <p className="mb-2 text-[11px] leading-relaxed text-ink-400">
                Every draft also comes with:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ALSO_GENERATED.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-clay-100 bg-cream-50 px-2 py-0.5 text-[10px] font-semibold text-ink-500"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-2.5 text-[11px] leading-relaxed text-ink-400">
                Press the button and yours appears here in under a minute.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
