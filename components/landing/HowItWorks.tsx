import { Mic, Cpu, Download } from "lucide-react";

const STEPS = [
  { num: "01", icon: Mic, title: "Capture the moment", desc: "Voice record a 30-second observation after play, or type 3-5 quick bullets. No formal structure needed." },
  { num: "02", icon: Cpu, title: "StoryLoop writes it", desc: "AI turns your notes into a full EYLF-aligned learning story with reflection and extension suggestions." },
  { num: "03", icon: Download, title: "Review, tweak, publish", desc: "Edit anything that's not quite right, export as PDF, copy to your documentation system. Done." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-cream-50 border-y border-clay-100 paper-texture">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className="section-title mb-3">How it works</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-900">
            From observation to documentation<br/>
            <span className="italic text-clay-700">in under 60 seconds.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="hidden md:block absolute top-14 left-[16%] right-[16%] h-px bg-clay-200" />

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
