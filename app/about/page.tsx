import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageTracker from "@/components/analytics/PageTracker";

export const metadata: Metadata = {
  title: "About StoryLoop | Built in Aotearoa for early childhood educators",
  description:
    "Why StoryLoop exists, what we believe about AI and documentation, and the promises we make to educators about their words, their children, and their professional judgement.",
  alternates: { canonical: "https://storyloop.space/about" },
  openGraph: {
    title: "About StoryLoop",
    description: "Why StoryLoop exists and what we promise educators about AI, documentation and professional judgement.",
    url: "https://storyloop.space/about",
    type: "article",
  },
};

const PRINCIPLES = [
  {
    title: "The educator has the last word. Always.",
    body: "StoryLoop writes a first draft. It does not publish, it does not send, and it does not decide what is true about a child. Every story arrives with the checks worth confirming before it is shared, and nothing leaves your account unless you send it. If a draft is wrong, it stays wrong until you fix it, and that is the correct order of authority.",
  },
  {
    title: "A child's words are evidence, not a typo.",
    body: "When a two year old says something in their own particular way, that phrasing is the most valuable thing in the note. It is the bit whānau read twice and keep. So we do not tidy it. Quoted words stay exactly as the educator wrote them, and if no quote was recorded, the story does not invent one to sound better.",
  },
  {
    title: "Interpretation yes, invention never.",
    body: "There is a real difference between reading meaning into what you saw and making things up. The first is professional practice. The second is fabrication that someone may later judge a child by. Drafts stay anchored to the observation, and anything the note does not support is raised as an assumption to confirm rather than written in as fact.",
  },
  {
    title: "Every story should read like nobody else's.",
    body: "A folder of near identical documentation helps no one. Families skim it, assessors see through it, and educators resent writing it. Run the same note twice and you should get two genuinely different pieces of writing, because the child in front of you is not a template.",
  },
  {
    title: "Documentation is professional work about real children.",
    body: "This is not marketing copy. It goes into a child's record, families read it, and it can be looked at years later. Every draft is checked for diagnosis language, other children's identifying details, sensitive family information, and physical safety moments, and those are raised for your review against your own service's process.",
  },
  {
    title: "Your work stays yours.",
    body: "Everything you write stays in your account, editable and exportable into whatever system your centre already uses. Cancel any time and it is all still there. We are not interested in holding documentation hostage to keep a subscription, and a product that needs to do that has already failed.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <PageTracker />
      <Navbar />
      <main>
        <section className="border-b border-clay-100 bg-cream-50 py-20 md:py-28">
          <div className="wide-shell">
            <div className="mx-auto max-w-3xl text-center">
              <p className="section-title mb-4">Why we exist</p>
              <h1 className="font-display text-4xl font-bold leading-[1.08] text-ink-900 md:text-6xl">
                Educators should be with the children, not writing about them at 9pm.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-600">
                That is the whole mission. Everything we build gets measured against whether it gives an educator
                their evening back without taking their voice away.
              </p>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="wide-shell">
            <div className="mx-auto max-w-3xl space-y-6 text-[17px] leading-relaxed text-ink-700">
              <p className="font-display text-2xl leading-snug text-ink-900 md:text-3xl">
                Almost every educator we talk to writes documentation on their own time.
              </p>
              <p>
                Evenings. Sunday afternoons. The gap between finishing a shift and picking up their own children.
                It is the most common complaint in the sector and it is almost never in anyone's job description.
                Nobody trained for years in early childhood education because they wanted to spend weekends writing
                up what happened on Tuesday.
              </p>
              <p>
                The strange part is that the writing is not really the hard bit. Educators know exactly what they
                saw and exactly why it mattered. What costs them is the blank page, and the fact that by 9pm the
                specific details have blurred into something generic. The moment a child changed their mind, or
                tried a different approach, or said a thing in their own funny phrasing, is the part that makes a
                story worth keeping. It is also the first thing memory loses.
              </p>
              <p>
                So the documentation gets written anyway. Later, thinner, and more generic than the day deserved.
                Families skim it. It goes in a file. And the educator carries a low background guilt about work
                that was never really theirs to do unpaid in the first place.
              </p>
              <p className="font-display text-2xl leading-snug text-ink-900 md:text-3xl">
                A tool should take the blank page away, and give the specifics back.
              </p>
              <p>
                Not write the child's story for them. Not decide what the learning was. Take a rough note or a
                voice memo captured in the moment, while the detail is still sharp, and turn it into something
                complete enough to edit rather than something to start from nothing. The judgement stays with the
                person who was actually standing there.
              </p>
            </div>
          </div>
        </section>

        <section className="border-y border-clay-100 bg-white py-16 md:py-24">
          <div className="wide-shell">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="section-title mb-3">What we will not do</p>
              <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">
                Six promises, and they are the constraints we build inside.
              </h2>
              <p className="mt-4 text-ink-600">
                These are not aspirations. Each one is enforced in the product itself, and it is why some things
                you might expect an AI writing tool to do, StoryLoop deliberately refuses to do.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
              {PRINCIPLES.map((principle, index) => (
                <div key={principle.title} className="card min-w-0 p-6 md:p-7">
                  <p className="mb-3 font-mono text-xs font-bold text-clay-600">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-display text-lg font-bold leading-snug text-ink-900">{principle.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{principle.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="wide-shell">
            <div className="mx-auto max-w-3xl space-y-6 text-[17px] leading-relaxed text-ink-700">
              <p className="section-title">Who builds it</p>
              <h2 className="font-display text-3xl font-bold leading-snug text-ink-900 md:text-4xl">
                A small team in Aotearoa New Zealand, building for the sector we came from.
              </h2>
              <p>
                StoryLoop is made by Aria Care, a small New Zealand software company. We are not a large
                international platform with a childcare product somewhere in the portfolio. Early childhood
                documentation is the thing we work on, and Te Whāriki and the EYLF are the frameworks we build
                around rather than adapt to afterwards.
              </p>
              <p>
                Being small is the reason the product changes quickly. When an educator emails to say a particular
                kind of story comes out wrong, or that something is confusing on a phone, it goes into the next
                build rather than a roadmap review in six months. Several things in StoryLoop right now exist
                because one kaiako took the time to tell us they were missing.
              </p>
              <p>
                It is also why we would rather say plainly what the product does not do. We have no interest in
                selling anyone the idea that documentation can be fully automated. It cannot be, and anyone
                claiming otherwise has not sat with a child long enough to know why.
              </p>
              <p>
                If you use StoryLoop and something about it is wrong, tell us. Every message is read by the people
                who build it, and it genuinely shapes what gets made next.
              </p>
            </div>
          </div>
        </section>

        <section className="pb-20 md:pb-28">
          <div className="wide-shell">
            <div className="mx-auto max-w-3xl rounded-3xl border border-clay-200 bg-gradient-to-br from-cream-50 via-white to-sage-50 p-8 text-center md:p-12">
              <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">
                Judge it on one real observation.
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-ink-600">
                Paste something you actually wrote this week, however rough it is. That is the only test that
                matters.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/signup" className="btn-primary">
                  <Sparkles className="h-4 w-4" /> Try 3 stories free
                </Link>
                <Link href="/examples" className="btn-secondary">
                  See real examples <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-3 text-xs text-ink-500">No credit card required.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
