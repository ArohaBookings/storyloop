import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Mic, MessageCircleHeart, QrCode, UsersRound, Wand2 } from "lucide-react";
import { GuideCta, GuideFaq, GuideFigure, GuideHero, GuidePage, GuideSection, RELATED, RelatedGuides } from "@/components/marketing/Guide";
import { ACCURACY_REPORT as R } from "@/lib/accuracy-report";

export const metadata: Metadata = {
  title: "StoryLoop for educators: learning stories without the late nights",
  description:
    "For early childhood teachers and educators in NZ and Australia: turn a quick note or voice memo into a learning story draft with Te Whāriki or EYLF links, check it, and publish where you always do. Free for 3 stories a month.",
  alternates: { canonical: "https://storyloop.space/for-educators" },
  openGraph: { title: "StoryLoop for educators", description: "Finish the learning story before you leave, not at 9pm.", url: "https://storyloop.space/for-educators", type: "website" },
};

const FEATURES = [
  { icon: Mic, title: "Say it instead of typing it", body: "Record a voice memo after play; StoryLoop turns it into text and drafts from it.", plan: "Every plan" },
  { icon: BookOpenCheck, title: "Children's words kept exactly", body: "Quotes are checked against your note, and anything the draft assumed is listed for you.", plan: "Every plan" },
  { icon: UsersRound, title: "One moment, many children", body: "Five children in the hut you built together? One note becomes a story for each child, using only their part of it.", plan: "Every plan" },
  { icon: Wand2, title: "Quill, for the last 10%", body: "Highlight a line and ask for it warmer, shorter or closer to your centre's voice.", plan: "Taste on Educator, unlimited on Pro" },
  { icon: MessageCircleHeart, title: "A version for families", body: "The same story in plain words, with a question to ask at home. Educator Pro adds translation for families who read another language.", plan: "Educator and up" },
  { icon: QrCode, title: "Wall cards", body: "The learning behind a display, in English and ten other languages, with no names, photos or dates.", plan: "Educator and up" },
];

const FAQS = [
  {
    q: "Is it cheating to use AI to write learning stories?",
    a: "Not if you are still the author. You saw the moment, you know the child, and you decide what is true. StoryLoop does the part that takes the time (turning notes into connected paragraphs with curriculum links), and you check every word. A service's AI policy usually says exactly this.",
  },
  {
    q: "Will it sound like me?",
    a: "Choose a tone (natural, warm, professional or simple), add your centre's philosophy and the words you like and avoid, and edit freely. The more of your own detail the note has, the more the draft sounds like you. Read the 12 real drafts on the examples page and judge for yourself.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes. It works in the browser on any phone, tablet or computer; there is nothing to install. Record the voice memo on your phone, check the draft on your laptop later if you prefer.",
  },
  {
    q: "My centre uses Storypark. Can I still use this?",
    a: (
      <>
        Yes. You can start on your own today, and any story exports in one tap. Many centres then move their learning
        stories to StoryLoop as a team. See <Link href="/storypark-alternative" className="font-semibold text-clay-700 underline">StoryLoop or Storypark?</Link>
      </>
    ),
  },
  {
    q: "How much does it cost?",
    a: "Free forever for 3 stories a month, no card. Educator is NZ$21 or A$19 a month for unlimited stories, after a 7-day free trial. Educator Pro is NZ$33 or A$29 a month. If your centre pays, one Centre plan covers up to 10 or 25 educators.",
  },
];

export default function ForEducatorsPage() {
  return (
    <GuidePage>
      <GuideHero
        kicker="For teachers and educators"
        title={<>Finish the learning story <span className="italic text-clay-700">before you leave.</span></>}
        answer={
          <p>
            Jot a few quick points or record a voice memo after play. StoryLoop drafts the learning story in about{" "}
            {Math.round(R.medianSeconds)} seconds, with Te Whāriki or EYLF links and where to next. You check every word,
            then publish it wherever your centre does. Free for 3 stories a month.
          </p>
        }
        image="/images/scenes/kitchen.jpg"
        imageAlt="An educator at her kitchen table in the evening, smiling at a StoryLoop learning story draft on her laptop"
        imagePosition="60% 50%"
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary">Start free</Link>
          <Link href="/examples" className="btn-secondary">Read real drafts</Link>
        </div>
      </GuideHero>

      <GuideSection id="how" kicker="Your day, not ours" title="From a note after play to a finished story">
        <ol className="grid gap-4">
          {[
            ["In the moment, 30 seconds", "Three or four quick points, or say them into your phone. Write the child's words down as they said them."],
            ["Straight after, under a minute", "StoryLoop drafts the story, the learning, the curriculum links and where to next. Anything it assumed is listed beside it."],
            ["When you have five minutes", "Read it, change what you would say differently, then share the family version or wall card."],
          ].map(([title, body]) => (
            <li key={title} className="rounded-3xl border border-clay-100 bg-white p-5">
              <h3 className="font-display text-xl font-bold text-ink-900">{title}</h3>
              <p className="mt-1 text-base leading-relaxed text-ink-600">{body}</p>
            </li>
          ))}
        </ol>
        <GuideFigure
          src="/images/scenes/classroom.jpg"
          alt="An educator in the room holding an iPad with a StoryLoop draft while two toddlers build with blocks"
          caption="Check the draft on a tablet in the room while the moment is still fresh."
          position="45% 60%"
        />
      </GuideSection>

      <GuideSection id="features" tone="white" kicker="What it does" title="Built around how educators actually work">
        <ul className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="rounded-3xl border border-clay-100 bg-paper p-5">
              <feature.icon className="h-5 w-5 text-clay-700" strokeWidth={1.9} />
              <h3 className="mt-2 font-display text-lg font-bold text-ink-900">{feature.title}</h3>
              <p className="mt-1 text-base leading-relaxed text-ink-600">{feature.body}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-sage-700">{feature.plan}</p>
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="trust" kicker="Before you trust it" title="Tested, and open about what it is still improving">
        <p>
          Every change to how stories are written is tested on the same {R.notes} notes before it ships. In the latest run,{" "}
          <strong>{R.drafts - R.wordsInChildMouth} of {R.drafts} drafts</strong> kept every child&apos;s quote word for word, and{" "}
          <strong>{R.drafts - R.frameworkMixups} of {R.drafts}</strong> used the right framework for their country. What it most
          often needs from you: now and then it writes an interpretation as if it were seen, so read the learning section
          with that in mind. Anything a draft assumed is listed beside it. <Link href="/accuracy" className="font-semibold text-clay-700 underline">Read the full report</Link>.
        </p>
      </GuideSection>

      <GuideSection id="faq" tone="white" title="Questions educators ask">
        <GuideFaq items={FAQS} />
      </GuideSection>

      <GuideCta />
      <RelatedGuides links={[RELATED.alongside, RELATED.examples, RELATED.template, RELATED.whatIs, RELATED.safety, RELATED.centres]} />
    </GuidePage>
  );
}
