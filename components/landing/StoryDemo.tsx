"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, Copy, Check, HelpCircle, ListChecks, Quote } from "lucide-react";
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
 * pipeline returned it in the story evaluation run of 24 September 2026
 * (scripts/story-eval: pipeline quality 100, independent judge fidelity 9/10,
 * no invented speech). Shown at rest so the promise is proven before anyone
 * lifts a finger, and replayed when someone runs the example unchanged.
 *
 * Running the unchanged example does NOT call the model: it is the same note,
 * and this is the draft the model wrote for it, so a second call would cost
 * money to show the same thing. The moment the note is edited, the real writer
 * runs. That is the only thing that makes the two paths differ.
 */
const EXAMPLE_OUTPUT = `Noah’s sand castle idea

Learning Story
Noah worked carefully in the sandpit today. He filled a bucket with damp sand, turned it over, and tapped the sides before lifting it to make a tower. He built beside Amelia, sharing the space and continuing with his own plan.

When Amelia asked for the spade, Noah swapped with her. This was a small but meaningful social moment. He listened to Amelia’s request and adjusted what he was using so they could both keep playing.

Noah told us, "I'm making a castle for the dragon". His sand tower was not just a tower, it was part of an idea he was building in his mind. When one side collapsed, Noah did not stop. He packed more sand around the base and tried again, changing his method after noticing what had happened.

What learning we noticed
Noah used careful hand movements as he filled, turned, tapped, packed and rebuilt with the damp sand. He was testing how the sand held its shape and was beginning to use a practical strategy when the tower did not stay up. His dragon castle idea also showed symbolic play, with Noah using the sand structure to represent something from his imagination.

Curriculum links
This links with EYLF Outcome 4: Children are confident and involved learners. Noah tested an idea, noticed the side collapse, added more sand to the base, and tried again.

This also links with EYLF Outcome 5: Children are effective communicators. Noah shared his idea in words when he said he was making a castle for the dragon, helping us understand the story behind his building.

Where to next / Responding
We can support Noah’s sand construction by offering buckets, spades and different sized containers so he can keep testing shape, strength and balance. We can use simple language such as base, taller, damp, dry, collapse and steady as he builds, and notice the strategies he chooses when something does not work the first time.

Family link
You might notice Noah building or making stories at home too. His dragon castle idea could be a good way to talk about what he is planning before he starts creating.`;

/** The evidence the same run returned with that draft, unedited. */
const EXAMPLE_EVIDENCE: Evidence = {
  anchors: [
    "Noah filled a bucket with damp sand.",
    "He turned it over carefully and tapped the sides.",
    "He built a tower beside Amelia and swapped the spade when she asked.",
    "When one side collapsed, he packed more sand around the base and tried again.",
  ],
  checks: [
    "Confirm that the quoted words are exactly what Noah said.",
    "Check whether Amelia’s name can be included under your centre privacy practice.",
    "The exact sandpit setting and group size were not provided.",
    "No educator dialogue or response was supplied.",
  ],
};

/** How long the unchanged example "writes" for before the draft appears. */
const EXAMPLE_WRITE_MS = 2200;

type Clarify = { reason: string; questions: string[] };
type Evidence = { anchors: string[]; checks: string[] };

function stringList(value: unknown, max = 6): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, max) : [];
}

function normalise(text: string) {
  return text.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * The draft, with every quote that appears word for word in the note marked.
 * Display only: the text itself is never changed. A quote that is NOT in the
 * note is left unmarked, so the highlight is a promise the note can check.
 */
function HighlightedStory({ text, note }: { text: string; note: string }) {
  const noteKey = normalise(note);
  const parts = text.split(/("[^"\n]{2,160}"|“[^”\n]{2,160}”)/g);
  return (
    <>
      {parts.map((part, index) => {
        const quoted = /^["“]/.test(part);
        if (quoted && normalise(part.slice(1, -1)) && noteKey.includes(normalise(part.slice(1, -1)))) {
          return (
            <mark key={index} className="rounded bg-sage-100 px-1 font-semibold not-italic text-sage-800" title="The child's words, exactly as the note has them">
              {part}
            </mark>
          );
        }
        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}

/** What the draft rests on, and what to check before sharing it. */
function EvidencePanel({ evidence, onOpen }: { evidence: Evidence; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  if (!evidence.anchors.length && !evidence.checks.length) return null;
  return (
    <div className="mt-3 rounded-2xl border border-sage-200 bg-sage-50/70">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (!open) onOpen?.();
          setOpen(!open);
        }}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-sage-800"
        data-track="demo_evidence"
      >
        <span className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 flex-none" />
          What this draft is built on, and what to check
        </span>
        <span aria-hidden="true" className="text-lg leading-none">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="grid gap-4 border-t border-sage-200 px-4 py-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-sage-700">Straight from the note</p>
            <ul className="space-y-1.5 text-sm leading-relaxed text-ink-700">
              {evidence.anchors.map((item) => (
                <li key={item} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 flex-none text-sage-600" />{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-clay-700">Flagged for you to check</p>
            <ul className="space-y-1.5 text-sm leading-relaxed text-ink-700">
              {evidence.checks.map((item) => (
                <li key={item} className="flex gap-2"><HelpCircle className="mt-0.5 h-4 w-4 flex-none text-clay-600" />{item}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StoryDemo({ compact = false }: { compact?: boolean }) {
  const [input, setInput] = useState(SAMPLE);
  const [touched, setTouched] = useState(false);
  const [output, setOutput] = useState("");
  const [outputNote, setOutputNote] = useState("");
  const [evidence, setEvidence] = useState<Evidence>({ anchors: [], checks: [] });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [clarify, setClarify] = useState<Clarify | null>(null);
  const [usage, setUsage] = useState(0);

  const isUnchangedExample = input.trim() === SAMPLE.trim();

  const handleGenerate = async (proceedWithoutClarification = false) => {
    if (!input.trim()) { setError("Add a few observations first"); return; }

    // The unchanged example: the real draft for this exact note, shown after
    // a short write. No model call, no cost, and it does not use the free try.
    if (isUnchangedExample) {
      setLoading(true); setError(""); setOutput(""); setClarify(null);
      track("demo_example_played");
      await new Promise((resolve) => setTimeout(resolve, EXAMPLE_WRITE_MS));
      setOutput(EXAMPLE_OUTPUT);
      setOutputNote(SAMPLE);
      setEvidence(EXAMPLE_EVIDENCE);
      setLoading(false);
      return;
    }

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
          questions: stringList(data.clarificationQuestions, 3),
        });
        track("demo_clarification");
        return;
      }
      if (!data.story) throw new Error("No story came back. Please try again.");
      setOutput(data.story); setOutputNote(input); setUsage(usage + 1);
      setEvidence({
        anchors: stringList(data.evidenceAnchors),
        checks: [...stringList(data.educatorChecks, 3), ...stringList(data.assumptions, 3)],
      });
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
            {isUnchangedExample ? "Edit it, or run it as it is." : "Your words stay exactly as you wrote them."}
          </p>
          <button
            onClick={() => handleGenerate()}
            disabled={loading || !input.trim()}
            className="btn-primary w-full flex-shrink-0 text-sm sm:w-auto"
            data-track={isUnchangedExample ? "demo_run_example" : "demo_run_own"}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isUnchangedExample ? "Watch it write this" : "Write my story"}
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
            <div className={`story-safe prose prose-sm min-w-0 max-w-full flex-1 overflow-y-auto whitespace-pre-wrap break-words font-display font-normal italic leading-relaxed text-ink-700 ${compact ? "max-h-[22rem]" : ""}`}>
              <HighlightedStory text={output} note={outputNote} />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-500">
              <Quote className="h-3.5 w-3.5 text-sage-600" />
              Highlighted: the child&apos;s words, exactly as the note has them.
            </p>
            <EvidencePanel evidence={evidence} onOpen={() => track("demo_evidence_opened", { example: outputNote === SAMPLE })} />
            <div className="mt-4 border-t border-clay-200 pt-4 text-center">
              <p className="mb-2 text-xs text-ink-600">Save it, edit it and write your own. Three stories a month are free.</p>
              <Link href="/signup" className="btn-primary px-4 py-2 text-xs" data-track="demo_signup">Start free</Link>
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
                  {line ? <HighlightedStory text={line} note={SAMPLE} /> : " "}
                </span>
              ))}
            </div>
            <EvidencePanel evidence={EXAMPLE_EVIDENCE} onOpen={() => track("demo_evidence_opened", { example: true, at_rest: true })} />
            <p className="mt-2.5 text-xs leading-relaxed text-ink-400">
              Change the note and press the button: yours is written fresh, usually in under a minute.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
