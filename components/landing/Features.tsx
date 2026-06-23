import {
  BarChart3,
  Brain,
  MessageCircleHeart,
  PenLine,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

type FeatureItem = { title: string; desc: string };
type FeatureGroup = {
  icon: LucideIcon;
  theme: string;
  promise: string;
  items: FeatureItem[];
};

const GROUPS: FeatureGroup[] = [
  {
    icon: PenLine,
    theme: "Draft faster",
    promise: "Turn a voice note or three bullet points into a usable first draft — never a blank page.",
    items: [
      { title: "Voice or text input", desc: "Record the real moment or type rough notes. Audio upload works if mic recording is unavailable." },
      { title: "EYLF & Te Whāriki aware", desc: "Links to the right curriculum without policy-speak or treating strands as outcomes." },
      { title: "Educator voice controls", desc: "Natural, warm, professional, or simple tone, plus concise, balanced, or detailed depth." },
      { title: "Sounds like an educator", desc: "Grounded, not robotic — a draft you can recognise and edit in minutes." },
      { title: "Editable history", desc: "Every story stays saved to edit, copy, export, and regenerate from the original note." },
    ],
  },
  {
    icon: ShieldCheck,
    theme: "Trust & quality",
    promise: "Every draft is checked for evidence, privacy, and curriculum fit — with you as the final word.",
    items: [
      { title: "Story quality check", desc: "Reviews tone, evidence, curriculum fit, invented-detail risk, and next steps before you edit." },
      { title: "Privacy + Evidence Guardian", desc: "Flags sensitive details, diagnosis-style language, unsupported certainty, and identifiers." },
      { title: "Observation Coach", desc: "Asks for missing child voice, response, or next-step detail so the output is less generic." },
      { title: "Draft integrity lens", desc: "See the evidence, assumptions, educator checks, and family question behind each draft." },
      { title: "Human review gate", desc: "An educator-led check for evidence, child voice, curriculum fit, culture, and privacy before sharing." },
      { title: "Privacy first", desc: "Your observations are never used to train AI models. Data is access-controlled and secure." },
    ],
  },
  {
    icon: MessageCircleHeart,
    theme: "Family partnership",
    promise: "Share the learning with whānau in their words, without rewriting the whole story.",
    items: [
      { title: "Parent-friendly version", desc: "A shorter, warmer version for families while the educator draft stays intact." },
      { title: "Translation + readability", desc: "Plain-English updates and optional translation packs with a clear teacher review note." },
      { title: "Family Connection Pack", desc: "A family message, home question, photo caption, handover note, and teacher check from one story." },
      { title: "Whānau voice bridge", desc: "Bring home knowledge, aspirations, language, and replies back into the next learning story." },
    ],
  },
  {
    icon: Brain,
    theme: "Continuity & insight",
    promise: "See learning across a child's stories, not just one moment in isolation.",
    items: [
      { title: "Child continuity profiles", desc: "Save interests, languages, and whānau aspirations so future drafts connect learning over time." },
      { title: "Learning threads", desc: "Notice recurring dispositions, curriculum patterns, and follow-up opportunities across stories." },
      { title: "Curriculum compass", desc: "EYLF outcomes or Te Whāriki strands surfaced per child — no ranking, scoring, or data points." },
      { title: "Next-step response loop", desc: "Track which response ideas were planned, tried, or worth continuing." },
      { title: "Backlog Rescue", desc: "Paste a week of rough notes and sort full stories from short updates and combined notes." },
    ],
  },
  {
    icon: BarChart3,
    theme: "Centre & leadership",
    promise: "Roll out a consistent documentation rhythm across rooms — without surveillance.",
    items: [
      { title: "Centre Voice Memory", desc: "Save centre philosophy, liked phrases, and words to avoid so drafts stay on-voice." },
      { title: "Centre Quality Calibration", desc: "Set wording rules, privacy rules, export style, and approved examples for the team." },
      { title: "Room Planning Brief", desc: "Turn recent stories into emerging interests, environment setups, and team questions." },
      { title: "Documentation Radar", desc: "See children needing a fresh observation, open response ideas, and unreviewed stories." },
      { title: "Director ROI dashboard", desc: "Stories created, time saved, backlog cleared, and review health — without ranking educators." },
      { title: "Export packs", desc: "Copy-ready Storypark, Educa, Kinderloop, and Brightwheel formats from the same story." },
    ],
  },
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <div
                key={group.theme}
                className="card p-7 flex flex-col hover:shadow-warm hover:border-clay-200 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-clay-700 flex items-center justify-center shadow-warm flex-shrink-0">
                    <Icon className="w-5 h-5 text-paper" />
                  </div>
                  <h3 className="font-display font-bold text-ink-900 text-xl">{group.theme}</h3>
                </div>
                <p className="text-sm text-clay-700 leading-relaxed mb-5">{group.promise}</p>
                <ul className="space-y-3">
                  {group.items.map((item) => (
                    <li key={item.title} className="flex gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-clay-400" />
                      <span>
                        <span className="block text-sm font-semibold text-ink-900">{item.title}</span>
                        <span className="block text-xs text-ink-500 leading-relaxed">{item.desc}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Closing pillar: the human promise */}
          <div className="rounded-2xl border border-clay-200 bg-cream-50 p-7 flex flex-col justify-center shadow-soft">
            <p className="section-title mb-3">Built with educator feedback</p>
            <h3 className="font-display text-2xl font-bold text-ink-900 mb-3 leading-tight">
              Not here to replace your judgement — here to end the blank page.
            </h3>
            <p className="text-sm text-ink-600 leading-relaxed">
              StoryLoop keeps improving with real centre practice in mind. The aim is to clear the documentation
              backlog and support stronger first drafts, while your observation, interpretation, and final voice
              stay at the centre.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
