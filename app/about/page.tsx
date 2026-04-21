import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Link from "next/link";
import { ArrowRight, Heart, Code2, Users } from "lucide-react";

export const metadata = {
  title: "About — Built by a 19-year-old for care workers everywhere",
  description: "The story behind StoryLoop, Aria, and Aroha AI — three products built by Leo Bons, a 19-year-old founder on a mission to give care workers their time back.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="section-title mb-3">Our story</p>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-ink-900 leading-[1.05] mb-6">
            I'm 19. I'm building tools for the people doing the hardest work.
          </h1>

          <div className="prose prose-lg max-w-none text-ink-700 leading-relaxed">
            <p className="text-xl text-ink-600 font-display italic mb-10">
              "Every care worker, educator, and support provider I've met is drowning in paperwork.
              They didn't sign up to spend half their shift writing. I'm building tools to fix that — one product at a time."
            </p>

            <div className="card p-8 mb-10 border-l-4 border-clay-500 bg-cream-50">
              <p className="text-sm font-bold text-clay-700 uppercase tracking-wider mb-3">Meet Leo</p>
              <p className="text-ink-700 mb-4">
                My name is Leo Bons. I'm 19, based in New Zealand, and I've been obsessed with building software
                since I was 14. Not in a flashy startup-bro way — in a quiet, 2am, figure-it-out-myself kind of way.
              </p>
              <p className="text-ink-700 mb-4">
                I didn't come from money. I didn't have investors. I didn't go through an accelerator. I taught
                myself how to build full-stack applications by breaking things, fixing them, and asking AI a lot of questions.
              </p>
              <p className="text-ink-700">
                What I did have was a front-row seat to how broken small business software is — especially for
                the people we rely on most: care workers, educators, tradies, small business owners. So I started building.
              </p>
            </div>

            <h2 className="font-display text-3xl font-bold text-ink-900 mt-12 mb-5">Why learning stories?</h2>
            <p>
              StoryLoop came out of a conversation with an early childhood educator who was spending 2 hours every
              night writing learning stories after a full day on the floor with kids. She loved her job.
              She hated the paperwork. She was burning out — not from the children, from the admin.
            </p>
            <p>
              That story — pun intended — is repeated thousands of times across Australia and New Zealand every single
              night. Teachers, educators, support workers. The documentation burden is crushing the people who care most.
            </p>
            <p>
              So I built StoryLoop: a tool that turns a few quick observations into a beautifully written,
              EYLF-aligned learning story in under 30 seconds. Not to replace the educator's voice — to protect it.
              To give them back the hours they should be spending with their family, not on a laptop at 10pm.
            </p>

            <h2 className="font-display text-3xl font-bold text-ink-900 mt-12 mb-5">The bigger mission</h2>
            <p>
              StoryLoop is one of three products I'm building — each one targeting the same problem in a different
              corner of the care and small business world:
            </p>

            <div className="not-prose grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
              <a href="https://storyloop.app" className="card p-5 border-2 border-clay-400 bg-cream-50">
                <Heart className="w-6 h-6 text-clay-700 mb-3" />
                <h3 className="font-display font-bold text-ink-900 mb-1">StoryLoop</h3>
                <p className="text-xs text-ink-600">AI learning stories for early childhood educators</p>
                <p className="text-[10px] text-clay-600 mt-2 font-mono">YOU ARE HERE</p>
              </a>
              <a href="https://aria.care" target="_blank" rel="noopener" className="card p-5 hover:border-clay-300 transition-all">
                <Users className="w-6 h-6 text-clay-700 mb-3" />
                <h3 className="font-display font-bold text-ink-900 mb-1">Aria Care</h3>
                <p className="text-xs text-ink-600">AI operating system for NDIS disability support providers</p>
                <p className="text-[10px] text-ink-400 mt-2 font-mono">aria.care →</p>
              </a>
              <a href="https://arohaai.app" target="_blank" rel="noopener" className="card p-5 hover:border-clay-300 transition-all">
                <Code2 className="w-6 h-6 text-clay-700 mb-3" />
                <h3 className="font-display font-bold text-ink-900 mb-1">Aroha AI</h3>
                <p className="text-xs text-ink-600">AI voice receptionist for small businesses</p>
                <p className="text-[10px] text-ink-400 mt-2 font-mono">arohaai.app →</p>
              </a>
            </div>

            <p>
              Every one is designed around the same belief: the people doing the hardest, most important work
              deserve software that actually makes their lives easier. Not more dashboards. Not more fields to fill in.
              Actual, genuine time back.
            </p>

            <h2 className="font-display text-3xl font-bold text-ink-900 mt-12 mb-5">What I promise</h2>
            <ul className="space-y-3 not-prose">
              {[
                "Fair pricing. Always. I'm not trying to milk you — I'm trying to build something sustainable you can actually afford.",
                "Your data is yours. Never sold, never used to train AI models, stored in Australia.",
                "Real support. Email me directly. I read every message. I reply.",
                "No lock-in. Cancel anytime. Export everything. I'd rather earn your trust than trap you.",
                "Honest roadmap. If I'm building something, I'll tell you. If it's going to be late, I'll tell you that too.",
              ].map((promise, i) => (
                <li key={i} className="flex items-start gap-3 text-ink-700">
                  <div className="w-1.5 h-1.5 rounded-full bg-clay-600 mt-2.5 flex-shrink-0" />
                  <span>{promise}</span>
                </li>
              ))}
            </ul>

            <div className="not-prose mt-12 pt-8 border-t border-clay-200">
              <p className="text-ink-600 italic font-display mb-6">
                If you're an educator, a support worker, a care provider — thank you for doing what you do.
                I'm building these products for you. Not for investors. Not for an exit. For you.
              </p>
              <p className="text-sm text-ink-500 mb-8">
                — Leo Bons, Founder · leo@storyloop.app
              </p>
              <Link href="/signup" className="btn-primary">
                Try StoryLoop free
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
