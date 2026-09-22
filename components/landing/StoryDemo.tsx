"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, Copy, Check, HelpCircle } from "lucide-react";
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
 * The real draft StoryLoop wrote for the note above, exactly as the production
 * model returned it on 2026-09-23 (quality 100). Shown at rest so the promise is
 * proven before anyone lifts a finger.
 *
 * It used to be a genuine draft from a DIFFERENT note, labelled as such, sitting
 * beside this one. Honest, but a visitor's first second was spent working out
 * why the box said Noah and the story said Tama. The note and its draft now
 * match, so the pairing reads the way it looks: this in, this out.
 */
const EXAMPLE_OUTPUT = `Building a castle for the dragon

Learning Story
Noah filled a bucket with damp sand, turned it over carefully and tapped the sides. He was using the bucket and sand with care, checking how the sand held together as he made his tower.

Noah built his tower beside Amelia. When Amelia asked for the spade, Noah swapped it with her. This showed us Noah was able to keep his play going while also responding to another child’s request.

As he built, Noah told us, "I'm making a castle for the dragon". His sand tower became part of a pretend story, not just a tower. When one side collapsed, Noah did not stop. He packed more sand around the base and tried again.

What learning we noticed
Noah was testing what damp sand can do. He used careful actions, turned the bucket over, tapped the sides, and changed his plan when the sand collapsed. Packing more sand around the base showed early problem solving. He noticed the tower needed more support and tried a new way to fix it.

We also noticed Noah bringing imagination into his building. The castle for the dragon gave his construction a clear purpose. He used words to share his idea, and he worked near Amelia while managing a simple turn with the spade.

Curriculum links
EYLF Outcome 4: Children are confident and involved learners. Noah tested the sand, noticed a problem when one side collapsed, and changed his building method by packing more sand around the base.

EYLF Outcome 5: Children are effective communicators. Noah used spoken language to explain his idea and connect his building to pretend play.

EYLF Outcome 2: Children are connected with and contribute to their world. Noah responded to Amelia’s request and swapped the spade, supporting shared play in the sand area.

Where to next / Responding
We can support Noah’s sand building by offering buckets, spades, moulds, and loose parts that let him test shape, strength, and balance. We can use simple language as he builds, such as base, sides, damp, collapse, stronger, and try again.

We will continue to notice how Noah shares his ideas with others, how he solves building problems, and whether his dragon castle story grows into more shared pretend play.

Family link
At home, Noah might enjoy telling or drawing what could live in his castle, or trying different ways to build with sand, blocks, boxes, or other materials.`;

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

  /**
   * Write the example draft on when it scrolls into view.
   *
   * 604 of 649 visitors never touched the demo, and the simulation says
   * stacking more things to click barely moves that: clicking is a fixed
   * budget. What reaches the people who will never press anything is showing
   * the draft appearing without asking them to act. No model call is involved,
   * so this costs nothing per visitor however much traffic arrives.
   *
   * Fails safe in every direction: the lines are visible by default in CSS,
   * so if the observer never fires, JS is off, or the visitor asked for
   * reduced motion, the whole draft is simply there.
   */
  const exampleRef = useRef<HTMLDivElement | null>(null);
  const hasWritten = useRef(false);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    if (!showingExample || hasWritten.current) return;
    const node = exampleRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        hasWritten.current = true;
        setWriting(true);
        observer.disconnect();
      },
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [showingExample]);

  const exampleLines = EXAMPLE_OUTPUT.split("\n");

  return (
    <div className={compact ? "grid min-w-0 gap-4" : "grid min-w-0 gap-5 lg:grid-cols-2"}>
      {/* ---------------------------------------------------------- input */}
      <div className="card min-w-0 p-5 sm:p-6">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <label htmlFor="demo-note" className="label mb-0">A real observation</label>
          <button
            type="button"
            onClick={() => { setInput(SAMPLE); setTouched(false); setError(""); setClarify(null); }}
            className="text-xs font-bold text-clay-700 hover:text-clay-900"
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
            {showingExample ? "The draft" : "Your learning story"}
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
              <p className="mb-2 text-xs text-ink-600">Save it, edit it and write your own. Three stories a month are free.</p>
              <Link href="/signup" className="btn-primary px-4 py-2 text-xs">Start free</Link>
            </div>
          </div>
        ) : (
          /* At rest: show a real draft so the promise is proven before any effort. */
          <div className="story-safe flex min-w-0 flex-1 flex-col">
            <p className="mb-2 text-xs text-ink-500">
              {touched ? "The draft StoryLoop wrote for the original note." : "What StoryLoop wrote from the note above."}
            </p>
            {/* Capped in the hero so a full-length draft cannot push the button
                below the fold on a phone. The scroll is the point: it shows
                there is more story than fits, which a short excerpt cannot. */}
            <div
              ref={exampleRef}
              tabIndex={0}
              role="region"
              aria-label="The learning story draft"
              className={`story-safe prose prose-sm min-w-0 max-w-full flex-1 overflow-y-auto rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-clay-500 whitespace-pre-wrap break-words font-display font-normal italic leading-relaxed text-ink-500 ${compact ? "max-h-[15rem]" : ""} ${writing ? "is-writing" : ""}`}
            >
              {exampleLines.map((line, index) => (
                <span
                  key={`${index}-${line.slice(0, 12)}`}
                  className="demo-line block"
                  style={writing ? { animationDelay: `${Math.min(index * 70, 1400)}ms` } : undefined}
                >
                  {line || " "}
                </span>
              ))}
            </div>
            <div className="mt-3 border-t border-clay-100 pt-3">
              <p className="mb-2 text-xs leading-relaxed text-ink-400">
                Every draft also comes with:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ALSO_GENERATED.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-clay-100 bg-cream-50 px-2 py-0.5 text-xs font-semibold text-ink-500"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-ink-400">
                Press the button and yours appears here in under a minute.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
