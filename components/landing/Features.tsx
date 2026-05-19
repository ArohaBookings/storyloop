import { Mic, FileText, Users, Clock, Shield, Heart, Sparkles, Download } from "lucide-react";

const FEATURES = [
  { icon: Mic, title: "Voice or text input", desc: "Tap the mic and speak what you noticed, or type a few quick bullet points. StoryLoop cleans it up from there." },
  { icon: FileText, title: "EYLF and Te Whariki ready", desc: "Stories link to the right curriculum without turning into policy-speak." },
  { icon: Users, title: "Story history built in", desc: "Every story stays saved in one place so you can revisit, copy, and refine it later." },
  { icon: Sparkles, title: "Multiple tones", desc: "Choose warm, concise, or reflective depending on the educator style you want to start from." },
  { icon: Download, title: "Easy to copy across", desc: "Copy the finished story straight into your existing documentation system or family update flow." },
  { icon: Clock, title: "Cuts down rewriting", desc: "Start from a usable first draft instead of a blank page at the end of the day." },
  { icon: Heart, title: "Sounds like an educator", desc: "More grounded, less robotic. The goal is a draft you can recognise and edit quickly." },
  { icon: Shield, title: "Privacy first", desc: "Your observations are never used to train AI models. Data is access-controlled and stored securely." },
];

export default function Features() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="section-title mb-3">Why educators love it</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-900 mb-4">
            Built by people who actually<br/>
            <span className="italic text-clay-700">understand the job.</span>
          </h2>
          <p className="text-ink-600 text-lg">Built around real educator workflow, not generic AI theatre.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="card p-6 hover:shadow-warm transition-all hover:border-clay-200 group">
                <div className="w-11 h-11 rounded-xl bg-cream-100 border border-clay-200 flex items-center justify-center mb-4 group-hover:bg-clay-100 transition-colors">
                  <Icon className="w-5 h-5 text-clay-700" />
                </div>
                <h3 className="font-display font-bold text-ink-900 mb-2 text-base">{f.title}</h3>
                <p className="text-sm text-ink-600 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
