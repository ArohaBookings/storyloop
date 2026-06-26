"use client";
import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, HelpCircle } from "lucide-react";
import Link from "next/link";

const PLACEHOLDER = `• Noah (3yo) filled a bucket with damp sand
• Turned it over carefully and tapped the sides
• Built a tower beside Amelia, then swapped the spade when she asked
• Said "I'm making a castle for the dragon"
• When one side collapsed, he packed more sand around the base and tried again`;

const SAMPLE = `Noah (3yo) filled a bucket with damp sand, turned it over carefully and tapped the sides. He built a tower beside Amelia, then swapped the spade when she asked. He said "I'm making a castle for the dragon". When one side collapsed, he packed more sand around the base and tried again.`;

type Clarify = { reason: string; questions: string[] };

export default function LiveDemo() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [clarify, setClarify] = useState<Clarify | null>(null);
  const [usage, setUsage] = useState(0);

  const handleGenerate = async () => {
    if (!input.trim()) { setError("Add a few observations first"); return; }
    if (usage >= 1) { setError("You've used your free demo. Sign up to keep going with editable story history."); return; }
    setLoading(true); setError(""); setOutput(""); setClarify(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observations: input, ageGroup: "3-4 years", demo: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      // The quality guard asks for a little more detail on thin/ambiguous notes.
      // Show the smart follow-up questions instead of a blank panel — and don't burn the free try.
      if (data.needsClarification) {
        setClarify({
          reason: typeof data.clarificationReason === "string" && data.clarificationReason.trim()
            ? data.clarificationReason
            : "Add a little more detail so the story stays grounded in what you actually saw.",
          questions: Array.isArray(data.clarificationQuestions)
            ? data.clarificationQuestions.filter((q: unknown): q is string => typeof q === "string" && q.trim().length > 0).slice(0, 3)
            : [],
        });
        return;
      }
      if (!data.story) throw new Error("No story came back. Please try again.");
      setOutput(data.story); setUsage(usage + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  const handleCopy = async () => { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <section id="live-demo" className="py-20 bg-cream-50 border-y border-clay-100">
      <div className="wide-shell">
        <div className="text-center mb-10 animate-fade-up">
          <p className="section-title mb-3">Try it now — no signup needed</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-900 mb-4">See the draft style.</h2>
          <p className="text-ink-600 max-w-xl mx-auto">Paste a real observation below and see how StoryLoop turns it into an editable first draft.</p>
        </div>

        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          {/* Input */}
          <div className="card min-w-0 p-6">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <label className="label mb-0">Quick observations</label>
              <button
                type="button"
                onClick={() => { setInput(SAMPLE); setError(""); setClarify(null); }}
                className="text-[11px] font-bold text-clay-700 hover:text-clay-900"
              >
                Use a sample
              </button>
            </div>
            <textarea value={input} onChange={e => { setInput(e.target.value); if (clarify) setClarify(null); }} rows={8} placeholder={PLACEHOLDER}
              className="input font-mono text-sm leading-relaxed resize-none" />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-ink-500">A few real details work best — what the child did, said, or tried.</p>
              <button onClick={handleGenerate} disabled={loading || !input.trim()} className="btn-primary text-sm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate story
              </button>
            </div>
            {error && <div className="mt-3 text-xs text-clay-700 bg-clay-50 border border-clay-200 rounded-lg px-3 py-2">{error}</div>}
          </div>

          {/* Output */}
          <div className="story-safe card-warm relative flex min-h-[300px] min-w-0 max-w-full flex-col overflow-hidden p-6">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="section-title">Your learning story</label>
              {output && (
                <button onClick={handleCopy} className="btn-ghost text-xs py-1 px-3">
                  {copied ? <Check className="w-3.5 h-3.5 text-sage-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-8 h-8 animate-spin text-clay-500 mb-3" />
                <p className="text-sm text-ink-600">Writing your learning story…</p>
                <p className="text-xs text-ink-400 mt-1">Polishing your notes into an educator-ready story — about 15-25 seconds.</p>
              </div>
            ) : clarify ? (
              <div className="flex-1 flex flex-col">
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-cream-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                      <HelpCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-base font-bold text-ink-900">A little more detail makes it sing</p>
                      <p className="mt-1 text-sm text-ink-600 leading-relaxed">{clarify.reason}</p>
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
                  <p className="mt-3 text-xs text-ink-500">Add a detail or two above, then generate again — this didn&apos;t use your free try.</p>
                </div>
                <p className="mt-3 text-center text-[11px] text-ink-400">This is the same evidence-check StoryLoop runs on every story so drafts stay grounded.</p>
              </div>
            ) : output ? (
              <div className="story-safe flex min-w-0 flex-1 flex-col">
                <div className="story-safe prose prose-sm min-w-0 max-w-full flex-1 whitespace-pre-wrap break-words text-ink-700 leading-relaxed font-display font-normal italic">
                  {output}
                </div>
                <div className="mt-4 pt-4 border-t border-clay-200 text-center">
                  <p className="text-xs text-ink-600 mb-2">Want to save, share and personalise with child names?</p>
                  <Link href="/signup" className="btn-primary text-xs py-2 px-4">Sign up — 3 more free stories</Link>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <Sparkles className="w-8 h-8 text-clay-300 mx-auto mb-3" />
                  <p className="text-sm text-ink-400">Your learning story will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
