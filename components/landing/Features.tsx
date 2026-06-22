import {
  Brain,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Clock,
  Compass,
  Download,
  FileText,
  Fingerprint,
  Heart,
  MessageCircleHeart,
  Mic,
  RefreshCw,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

const FEATURES = [
  { icon: Mic, title: "Voice or text input", desc: "Record the real moment or type rough notes. If mic recording is unavailable, typing and audio upload still work." },
  { icon: FileText, title: "EYLF and Te Whāriki aware", desc: "Stories link to the right curriculum without turning into policy-speak or treating strands as outcomes." },
  { icon: Users, title: "Editable history", desc: "Every story stays saved so you can edit, copy, export, and regenerate from the original observation." },
  { icon: Sparkles, title: "Educator voice controls", desc: "Choose natural educator, warm reflective, professional, or simple tone, plus concise, balanced, or detailed depth." },
  { icon: Download, title: "Easy to copy across", desc: "Copy the finished story straight into your existing documentation system or family update flow." },
  { icon: Clock, title: "Cuts down rewriting", desc: "Start from a usable first draft instead of a blank page at the end of the day." },
  { icon: Brain, title: "Observation Coach", desc: "Before the draft, StoryLoop asks for missing child voice, educator response, or next-step detail so the output is less generic." },
  { icon: Heart, title: "Sounds like an educator", desc: "More grounded, less robotic. The goal is a draft you can recognise and edit quickly." },
  { icon: Shield, title: "Privacy first", desc: "Your observations are never used to train AI models. Data is access-controlled and stored securely." },
  { icon: Shield, title: "Privacy + Evidence Guardian", desc: "Flags sensitive details, diagnosis-style language, unsupported certainty, and identifiers before sharing." },
  { icon: Fingerprint, title: "Draft integrity lens", desc: "See the observation evidence, assumptions, educator checks, and family question behind each draft." },
  { icon: Sparkles, title: "Story quality check", desc: "StoryLoop reviews tone, evidence, curriculum fit, invented-detail risk, and next steps before you edit." },
  { icon: ClipboardList, title: "Backlog Rescue", desc: "Paste several rough observations and sort which deserve full stories, short updates, or a combined note." },
  { icon: Download, title: "Export packs", desc: "Get copy-ready Storypark, Educa, Kinderloop, and Brightwheel formats from the same story." },
  { icon: Users, title: "Centre Voice Memory", desc: "Save centre philosophy, liked phrases, and words to avoid so future drafts stay closer to your service voice." },
  { icon: Shield, title: "Centre Quality Calibration", desc: "Directors can set wording rules, privacy rules, export style, and approved examples for team consistency." },
  { icon: MessageCircleHeart, title: "Parent-friendly version", desc: "Create a shorter warmer version for families while keeping the educator documentation draft intact." },
  { icon: MessageCircleHeart, title: "Translation + readability", desc: "Create plain-English family updates and optional translation packs with a clear teacher review note." },
  { icon: MessageCircleHeart, title: "Family Connection Pack", desc: "Create a family message, home question, photo caption, handover note, and teacher check from one saved story." },
  { icon: ClipboardList, title: "Room Planning Brief", desc: "Turn recent stories into emerging interests, environment setups, intentional teaching moves, and team questions." },
  { icon: ClipboardList, title: "Documentation Radar", desc: "See children needing a fresh observation, open response ideas, family reply gaps, and unreviewed stories." },
  { icon: BarChart3, title: "Director ROI dashboard", desc: "Show stories created, time saved, backlog cleared, review health, and family loop usage without ranking educators." },
  { icon: MessageCircleHeart, title: "Feedback inbox", desc: "Send product feedback directly into the admin dashboard so real educator pain shapes the next improvements." },
  { icon: Brain, title: "Learning threads", desc: "Notice recurring dispositions, curriculum patterns, and follow-up opportunities across saved stories." },
  { icon: Users, title: "Child continuity profiles", desc: "Save lightweight interests, languages, whānau aspirations, and educator context so future drafts connect learning over time." },
  { icon: Compass, title: "Curriculum compass", desc: "See EYLF outcomes or Te Whāriki strands surfaced for each child without ranking, scoring, or turning children into data points." },
  { icon: RefreshCw, title: "Next-step response loop", desc: "Track which response ideas were planned, tried, or worth continuing so documentation leads back into teaching." },
  { icon: MessageCircleHeart, title: "Whānau voice bridge", desc: "Bring home knowledge, aspirations, language, and family responses back into the next learning story." },
  { icon: CheckCircle2, title: "Human review gate", desc: "Before sharing, run an educator-led check for evidence, child voice, curriculum fit, cultural respect, and privacy." },
];

export default function Features() {
  return (
    <section id="features" className="py-24">
      <div className="wide-shell">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="section-title mb-3">Product pillars</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-ink-900 mb-4">
            <span className="block">Educator-led, curriculum-aware,</span>{" "}
            <span className="block italic text-clay-700">and easy to edit.</span>
          </h2>
          <p className="text-ink-600 text-lg">Meaningful, not lengthy. Relevant, not repetitive. Child-focused, not generic.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
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

        <div className="mt-12 rounded-3xl border border-clay-200 bg-cream-50 p-6 md:p-8 shadow-soft">
          <p className="section-title mb-3">Built with educator feedback</p>
          <h3 className="font-display text-2xl md:text-3xl font-bold text-ink-900 mb-3">
            StoryLoop is still improving with real centre practice in mind.
          </h3>
          <p className="text-sm md:text-base text-ink-600 max-w-3xl leading-relaxed">
            StoryLoop is still improving. Feedback from real educators helps shape how stories are written, linked, and structured.
            The aim is not to replace educator judgement, but to reduce the blank-page backlog and support stronger first drafts.
          </p>
        </div>
      </div>
    </section>
  );
}
