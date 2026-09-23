import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PageTracker from "@/components/analytics/PageTracker";

export const metadata: Metadata = {
  title: "About StoryLoop",
  description:
    "Why StoryLoop exists, what we believe about AI in documentation, and the promises we make educators about their words and their professional judgement.",
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

        {/* Who actually builds this. A one-person product can put a face and a
            name on the page; the incumbent platforms cannot, and for a sector
            that runs on trust that is worth more than another feature. */}
        <section className="border-y border-clay-100 bg-cream-50 py-16 md:py-24">
          <div className="wide-shell">
            <div className="mx-auto max-w-4xl">
              <div className="grid items-start gap-8 md:grid-cols-[auto_1fr] md:gap-12">
                <div className="mx-auto w-full max-w-[220px] md:mx-0 md:w-[220px]">
                  <Image
                    src="/images/leo.jpg"
                    alt="Leo, the founder of StoryLoop, in Christchurch"
                    width={440}
                    height={586}
                    className="w-full rounded-2xl object-cover shadow-warm"
                    sizes="(max-width: 768px) 220px, 220px"
                  />
                  <p className="mt-3 text-center text-xs leading-relaxed text-ink-500 md:text-left">
                    Leo, 20<br />
                    <span className="text-ink-400">Ōtautahi Christchurch, Aotearoa</span>
                  </p>
                </div>

                <div className="min-w-0 space-y-5 text-[17px] leading-relaxed text-ink-700">
                  <h2 className="font-display text-3xl font-bold leading-tight text-ink-900 md:text-4xl">
                    Hi, I&apos;m Leo. I built the first version of this when I was 19.
                  </h2>
                  <p>
                    I am not an early childhood teacher. I want to be upfront about that, because it would be easy
                    to pretend otherwise and educators can smell it a mile off.
                  </p>
                  <p>
                    I started StoryLoop because I kept seeing kaiako still writing learning stories after the
                    children had gone home. The job they trained for is with the tamariki. The job that actually
                    eats their evening is writing about the tamariki afterwards, unpaid, long after the details
                    have gone fuzzy. Nobody in the sector seems surprised by that anymore, and that is exactly
                    what made it worth doing something about.
                  </p>
                  <p>
                    So I built something, put it in front of educators, and asked them to tell me what was wrong
                    with it. They did, at length. Early drafts were too flowery, invented things nobody had seen,
                    and tidied children&apos;s words into proper sentences, which turned out to be the worst thing
                    it could possibly do. Most of what StoryLoop is now exists because an educator told me a
                    version of it was not good enough.
                  </p>
                  <p>
                    I still build every part of it myself, from Christchurch. That means it moves slower than a
                    company with a team behind it. It also means that when you email StoryLoop, I am the one who
                    reads it, and if you tell me a story came out wrong I can usually do something about it that
                    week.
                  </p>
                  <p className="font-display text-xl leading-snug text-ink-900">
                    I am 20, building this for a sector I did not grow up in. What keeps it honest is that the
                    people using it tell me, straight, when I get it wrong.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-clay-100 bg-white py-16 md:py-24">
          <div className="wide-shell">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold text-ink-900 md:text-4xl">
                Six promises, and they are the constraints we build inside.
              </h2>
              <p className="mt-4 text-ink-600">
                These are not aspirations. Each one is enforced in the product itself, and it is why some things
                you might expect an AI writing tool to do, StoryLoop deliberately refuses to do.
              </p>
            </div>
            {/* A list, not six numbered cards: the promises are not a sequence,
                and the body text was 14px grey on white, hard going for anyone
                over forty reading on a phone. */}
            <div className="mx-auto grid max-w-5xl gap-x-12 md:grid-cols-2">
              {PRINCIPLES.map((principle) => (
                <div key={principle.title} className="min-w-0 border-t border-clay-100 py-7">
                  <h3 className="font-display text-xl font-bold leading-snug text-ink-900">{principle.title}</h3>
                  <p className="mt-2.5 text-base leading-relaxed text-ink-700">{principle.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="wide-shell">
            <div className="mx-auto max-w-3xl space-y-6 text-[17px] leading-relaxed text-ink-700">
              <h2 className="font-display text-3xl font-bold leading-snug text-ink-900 md:text-4xl">
                One person in Ōtautahi builds this, and that is on purpose.
              </h2>
              <p>
                StoryLoop is part of Aria Care, a New Zealand business, but there is no team standing behind that
                name. It is me. I write the code, I answer the support email, and I decide what gets built next.
                Early childhood documentation is the only thing I work on, and Te Whāriki and the EYLF are what
                StoryLoop is built around rather than adapted to afterwards.
              </p>
              <p>
                The honest trade-off: one person ships big features slower than a company with thirty engineers,
                and if it is the middle of the night in New Zealand your email waits until morning. What you get
                back is that the person who built the thing is the person who reads your message.
              </p>
              {/* The plain facts a director checks before putting a team on
                  something, in one place instead of scattered through prose. */}
              <dl className="!mt-10 grid gap-x-8 gap-y-5 border-t border-clay-100 pt-8 text-base sm:grid-cols-2">
                {[
                  ["Business", "Aria Care, a New Zealand business (StoryLoop is its early childhood product)"],
                  ["Based in", "Ōtautahi Christchurch, Aotearoa New Zealand"],
                  ["Built for", "Te Whāriki in New Zealand and EYLF V2.0 in Australia"],
                  ["Your work", "Editable and exportable at any time, on every plan, including after you cancel"],
                ].map(([term, detail]) => (
                  <div key={term}>
                    <dt className="text-sm font-semibold text-ink-500">{term}</dt>
                    <dd className="mt-1 text-ink-800">{detail}</dd>
                  </div>
                ))}
                <div>
                  <dt className="text-sm font-semibold text-ink-500">Contact</dt>
                  <dd className="mt-1">
                    <a href="mailto:ariacareapp@gmail.com" className="text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900">
                      ariacareapp@gmail.com
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-ink-500">Privacy</dt>
                  <dd className="mt-1">
                    <Link href="/privacy" className="text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900">
                      What is collected, who handles it, and your rights
                    </Link>
                  </dd>
                </div>
              </dl>
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
                  <Sparkles className="h-4 w-4" /> Start free
                </Link>
                <Link href="/examples" className="btn-secondary">
                  See real examples <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-3 text-sm text-ink-500">Three stories a month free, no card needed.</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
