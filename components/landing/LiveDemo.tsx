"use client";
import { useState } from "react";
import { Sparkles, Loader2, Copy, Check } from "lucide-react";
import Link from "next/link";

const PLACEHOLDER = `• Noah (3yo) played in the sandpit
• Built a tower with Amelia, took turns
• Said "I'm making a castle for the dragon"
• Knocked it down, laughed, started again`;

export default function LiveDemo() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState(0);

  const handleGenerate = async () => {
    if (!input.trim()) { setError("Add a few observations first"); return; }
    if (usage >= 1) { setError("You've used your free demo. Sign up to keep going — it takes 10 seconds."); return; }
    setLoading(true); setError(""); setOutput("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observations: input, ageGroup: "3-4 years", demo: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setOutput(data.story); setUsage(usage + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  const handleCopy = async () => { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <section id="live-demo" className="py-20 px-6 bg-cream-50 border-y border-clay-100">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 animate-fade-up">
          <p className="section-title mb-3">Try it now — no signup needed</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-900 mb-4">See it work in 10 seconds.</h2>
          <p className="text-ink-600 max-w-xl mx-auto">Paste some quick observations below. Watch StoryLoop turn them into a proper learning story.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Input */}
          <div className="card p-6">
            <label className="label">Quick observations</label>
            <textarea value={input} onChange={e => setInput(e.target.value)} rows={8} placeholder={PLACEHOLDER}
              className="input font-mono text-sm leading-relaxed resize-none" />
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-ink-500">{input.length}/500</p>
              <button onClick={handleGenerate} disabled={loading || !input.trim()} className="btn-primary text-sm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate story
              </button>
            </div>
            {error && <div className="mt-3 text-xs text-clay-700 bg-clay-50 border border-clay-200 rounded-lg px-3 py-2">{error}</div>}
          </div>

          {/* Output */}
          <div className="card-warm p-6 relative min-h-[300px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
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
                <p className="text-sm text-ink-600">Crafting your story...</p>
                <p className="text-xs text-ink-400 mt-1">Usually 5-10 seconds</p>
              </div>
            ) : output ? (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 prose prose-sm text-ink-700 whitespace-pre-wrap leading-relaxed font-display font-normal italic">
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
