import { CheckCircle2, Cpu, Download, Mic, RefreshCw } from "lucide-react";

const STEPS = [
  { num: "01", icon: Mic, title: "Capture the moment", desc: "Voice record what happened after play, or type 3-5 quick bullets. No formal structure needed." },
  { num: "02", icon: Cpu, title: "StoryLoop shapes it", desc: "StoryLoop turns rough notes into a first draft with curriculum links, dispositions, and practical next steps." },
  { num: "03", icon: CheckCircle2, title: "Review with a human checkpoint", desc: "Check evidence, curriculum fit, child voice, culture, and privacy before sharing." },
  { num: "04", icon: RefreshCw, title: "Close the learning loop", desc: "Track which next steps were planned or tried, capture whānau voice, then continue from the earlier story." },
  { num: "05", icon: Download, title: "Copy, export, or revisit", desc: "Move the edited story into your usual system, or keep building the child's learning thread in StoryLoop." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-cream-50 border-y border-clay-100 paper-texture">
      <div className="wide-shell">
        <div className="text-center mb-16">
          <p className="section-title mb-3">How it works</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-900">
            From observation to editable draft<br/>
            <span className="italic text-clay-700">without losing your voice.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          <div className="hidden md:block absolute top-14 left-[10%] right-[10%] h-px bg-clay-200" />

          {STEPS.map(step => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="flex flex-col items-center text-center bg-paper rounded-2xl p-7 border border-clay-100">
                <div className="relative mb-5">
                  <div className="w-20 h-20 rounded-2xl bg-clay-700 flex items-center justify-center shadow-warm">
                    <Icon className="w-9 h-9 text-paper" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-cream-100 border-2 border-clay-200 flex items-center justify-center">
                    <span className="text-[10px] font-mono font-bold text-clay-700">{step.num}</span>
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold text-ink-900 mb-2">{step.title}</h3>
                <p className="text-sm text-ink-600 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
