"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Sparkles, Loader2, Copy, Check, Download, Mic, Square, RefreshCw, AlertCircle } from "lucide-react";

const PLACEHOLDERS = [
  "• Ruby (2yo) built a block tower\n• Got frustrated when it fell\n• Tried 4 more times, each bigger\n• Clapped when it stayed up",
  "• Group story time\n• Jax (3) pointed at the pictures\n• Asked 'what's that' 6 times\n• Starting to predict what comes next",
  "• Outdoor play\n• Maya (4) & Sam (4) playing shopkeepers\n• Used pretend money, took turns as cashier\n• Strong language — 'that'll be five dollars please'",
];

export default function GeneratePage() {
  const [observations, setObservations] = useState("");
  const [childName, setChildName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [tone, setTone] = useState<"warm" | "concise" | "reflective">("warm");
  const [location, setLocation] = useState<"AU" | "NZ">("AU");
  const [story, setStory] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<string | number>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [placeholder] = useState(() => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Auto-detect NZ by timezone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz?.includes("Auckland")) setLocation("NZ");
  }, []);

  const handleGenerate = async () => {
    if (observations.trim().length < 10) { setError("Please add more detail (at least 10 characters)"); return; }
    setLoading(true); setError(""); setStory(""); setOutcomes([]); setNextSteps([]); setUpgradeRequired(false);
    try {
      const res = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observations, childName: childName || undefined, ageGroup: ageGroup || undefined, tone, location }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        if (data.upgradeRequired) setUpgradeRequired(true);
        return;
      }
      setStory(data.story); setOutcomes(data.outcomes ?? []); setNextSteps(data.nextSteps ?? []);
      setRemaining(data.remaining);
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(story);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const toggleRecording = () => {
    if (typeof window === "undefined") return;
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { setError("Voice input isn't supported in this browser. Try Chrome or Safari."); return; }
    if (recording) {
      recognitionRef.current?.stop(); setRecording(false); return;
    }
    const recognition = new SR();
    recognition.continuous = true; recognition.interimResults = true; recognition.lang = location === "NZ" ? "en-NZ" : "en-AU";
    recognition.onresult = (event: any) => {
      let final = ""; let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      if (final) setObservations(prev => prev + (prev ? " " : "") + final);
    };
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start(); setRecording(true);
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="mb-7">
        <h1 className="font-display text-3xl font-bold text-ink-900 mb-1">New learning story</h1>
        <p className="text-ink-600 text-sm">Add your observations below. We'll shape them into a beautiful, EYLF-aligned story.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Input side */}
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Observations</label>
              <button onClick={toggleRecording} className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                recording ? "bg-red-500 text-white animate-pulse" : "bg-cream-100 text-clay-700 hover:bg-cream-200"
              }`}>
                {recording ? <><Square className="w-3 h-3" /> Stop</> : <><Mic className="w-3 h-3" /> Voice</>}
              </button>
            </div>
            <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={10}
              placeholder={placeholder}
              className="input font-mono text-sm leading-relaxed resize-none" />
            <p className="text-xs text-ink-500 mt-2">{observations.length} characters · Aim for at least 3-4 quick points</p>
          </div>

          <div className="card p-6 space-y-4">
            <p className="section-title">Personalise (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Child's name</label><input value={childName} onChange={e => setChildName(e.target.value)} className="input" placeholder="Ruby" /></div>
              <div><label className="label">Age group</label>
                <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)} className="input">
                  <option value="">Choose...</option>
                  <option>0-12 months</option><option>1-2 years</option><option>2-3 years</option>
                  <option>3-4 years</option><option>4-5 years</option><option>Mixed group</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Tone</label>
              <div className="grid grid-cols-3 gap-2">
                {(["warm", "concise", "reflective"] as const).map(t => (
                  <button key={t} onClick={() => setTone(t)}
                    className={`text-xs font-semibold py-2 rounded-lg border capitalize transition-all ${
                      tone === t ? "bg-clay-700 text-paper border-clay-700" : "bg-white text-ink-600 border-clay-200 hover:border-clay-400"
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Framework</label>
              <div className="grid grid-cols-2 gap-2">
                {(["AU", "NZ"] as const).map(l => (
                  <button key={l} onClick={() => setLocation(l)}
                    className={`text-xs font-semibold py-2 rounded-lg border transition-all ${
                      location === l ? "bg-clay-700 text-paper border-clay-700" : "bg-white text-ink-600 border-clay-200 hover:border-clay-400"
                    }`}>
                    {l === "AU" ? "🇦🇺 EYLF" : "🇳🇿 Te Whāriki"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading || observations.length < 10} className="btn-primary w-full py-4 text-base">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Writing your story...</> : <><Sparkles className="w-4 h-4" /> Generate story</>}
          </button>

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                {upgradeRequired && <Link href="/billing" className="font-bold underline mt-1 inline-block">Upgrade now →</Link>}
              </div>
            </div>
          )}
        </div>

        {/* Output side */}
        <div className="card-warm p-6 min-h-[500px] flex flex-col sticky top-4">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">Your learning story</p>
            {story && (
              <div className="flex items-center gap-2">
                <button onClick={handleGenerate} className="btn-ghost text-xs"><RefreshCw className="w-3 h-3" /> Regenerate</button>
                <button onClick={handleCopy} className="btn-ghost text-xs">
                  {copied ? <Check className="w-3 h-3 text-sage-600" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 animate-spin text-clay-500 mb-4" />
              <p className="font-display text-lg font-bold text-ink-900 mb-1">Crafting your story...</p>
              <p className="text-sm text-ink-500">Usually takes 5-10 seconds</p>
            </div>
          ) : story ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 text-ink-800 whitespace-pre-wrap leading-relaxed font-display font-normal">
                {story}
              </div>
              {(outcomes.length > 0 || nextSteps.length > 0) && (
                <div className="mt-5 pt-5 border-t border-clay-200 space-y-3">
                  {outcomes.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Linked outcomes</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {outcomes.map(o => <span key={o} className="text-xs font-mono bg-white border border-clay-200 text-clay-700 px-2 py-1 rounded-md">{o}</span>)}
                      </div>
                    </div>
                  )}
                  {remaining !== "" && (
                    <p className="text-xs text-ink-500">{typeof remaining === "string" ? remaining : `${remaining} stories remaining this month`}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center px-4">
              <div>
                <Sparkles className="w-10 h-10 text-clay-300 mx-auto mb-3" />
                <p className="font-display text-lg font-bold text-ink-900">Ready when you are</p>
                <p className="text-sm text-ink-500 mt-1">Add observations and hit generate.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
