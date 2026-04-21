import { Mic, FileText, Users, Clock, Shield, Heart, Sparkles, Download } from "lucide-react";

const FEATURES = [
  { icon: Mic, title: "Voice or text input", desc: "Tap the mic, speak what you observed. Or type a few bullet points. Takes 20 seconds." },
  { icon: FileText, title: "EYLF aligned", desc: "Every story references appropriate EYLF learning outcomes automatically. NQS-ready." },
  { icon: Users, title: "Remembers your children", desc: "Save child profiles with age, interests, developmental focus. Stories get more personalised over time." },
  { icon: Sparkles, title: "Multiple tones", desc: "Warm and narrative, concise and observational, or detailed and reflective. You choose." },
  { icon: Download, title: "Export to anywhere", desc: "Copy to clipboard, download as PDF, or send straight to your documentation system." },
  { icon: Clock, title: "Saves 10+ hours/week", desc: "What used to take 30 minutes now takes 30 seconds. Scale it across your whole team." },
  { icon: Heart, title: "Written in your voice", desc: "Not generic AI slop. Warm, authentic language that sounds like you actually wrote it." },
  { icon: Shield, title: "Privacy first", desc: "Your observations are never used to train AI. Data stays in Australia. Full NQF compliance." },
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
          <p className="text-ink-600 text-lg">Not a generic ChatGPT wrapper. Trained on EYLF, NQS, and what educators actually write.</p>
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
