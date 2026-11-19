import type { Metadata } from "next";
import Link from "next/link";
import { BookHeart, Languages, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import { GuideFaq, GuideFigure, GuideHero, GuidePage, GuideSection, RELATED, RelatedGuides } from "@/components/marketing/Guide";
import ShareWithCentre from "@/components/marketing/ShareWithCentre";
import { buyerPageLive } from "@/lib/buyer-pages";

// /ask-your-centre is held out of this release (lib/buyer-pages.ts): until it is on,
// the first-screen button opens this page's own "Tell your centre" message instead.
const ASK_LIVE = buyerPageLive("ask-your-centre");

// 18 Nov 2026 re-aim (the parent path): what a parent would type about her own
// child's stories, not the product's name. 19 impressions and no clicks before.
export const metadata: Metadata = {
  title: { absolute: "Learning stories about your child: what to look for" },
  description:
    "What a learning story tells you about your child, how to read one, and how to ask your centre for more stories like it.",
  alternates: { canonical: "https://storyloop.space/for-families" },
  openGraph: { title: "StoryLoop for families", description: "More stories about your child's learning, in plain words and your own language.", url: "https://storyloop.space/for-families", type: "website" },
};

const WHAT_YOU_SEE = [
  { icon: BookHeart, title: "More stories, sooner", body: "When writing a story takes minutes instead of an evening, educators can write more of them, closer to the moment." },
  { icon: MessageCircleQuestion, title: "A question to ask at home", body: "Many stories come with a simple question or idea, so you can carry the learning into dinner or the car ride home." },
  { icon: Languages, title: "Your language", body: "Wall cards can be read in English, te reo Māori, Samoan, Tongan, Chinese, Hindi, Punjabi, Tagalog, Arabic or Vietnamese." },
  { icon: ShieldCheck, title: "Your child's information protected", body: "First names only, stored in Sydney, never used to train AI, and nothing is shared until an educator chooses." },
];

const FAQS = [
  {
    q: "Is my child's learning story written by a robot?",
    a: "No. Your child's educator saw the moment and writes the note. StoryLoop helps turn that note into a well-organised draft, and the educator reads, changes and approves every word before you see it. Your child's own words are kept exactly as the educator wrote them down.",
  },
  {
    q: "Where will I see the stories?",
    a: "Your centre decides how they share them: printed, on a wall card you can scan at pickup, by email or message, or through the app your centre uses. You do not need a new app or a login to read a wall card.",
  },
  {
    q: "Are photos of my child uploaded to StoryLoop?",
    a: "No. Educators do not need photos to write a story in StoryLoop; photos are not part of a StoryLoop story. Wall cards carry no names, photographs or dates.",
  },
  {
    q: "Can I ask for my child's information to be deleted?",
    a: (
      <>
        Yes. Ask your centre, or email ariacareapp@gmail.com. See{" "}
        <Link href="/safety" className="font-semibold text-clay-700 underline">children&apos;s information and AI</Link> for exactly what is kept and where.
      </>
    ),
  },
];

export default function ForFamiliesPage() {
  return (
    <GuidePage>
      <GuideHero
        kicker="For parents, whānau and families"
        title={<>More of your child&apos;s learning, <span className="italic text-clay-700">in words you can use.</span></>}
        answer={
          <p>
            StoryLoop helps early childhood educators write learning stories: the short stories about what your child did
            and what they were learning. Your child&apos;s educator still writes the note and approves every word. You
            see the stories where you always have, sometimes with a family version in plain words and a question to ask
            at home.
          </p>
        }
        image="/images/scenes/family.jpg"
        imageAlt="A parent on the couch smiling at a StoryLoop wall card on her phone, a toddler leaning on her arm, seen from behind"
        imagePosition="50% 30%"
      >
        {/* 18 Nov 2026, the parent path: the one thing a parent can do, on the first screen. */}
        <Link href={ASK_LIVE ? "/ask-your-centre" : "#tell-your-centre"} className="btn-primary mt-5 inline-flex justify-center" data-track="for_families_hero_ask">
          Ask your centre for more stories
        </Link>
      </GuideHero>

      <GuideSection id="what-you-see" kicker="What changes for you" title="What you will notice">
        <ul className="grid gap-4 sm:grid-cols-2">
          {WHAT_YOU_SEE.map((item) => (
            <li key={item.title} className="rounded-3xl border border-clay-100 bg-white p-5">
              <item.icon className="h-5 w-5 text-clay-700" strokeWidth={1.9} />
              <h3 className="mt-2 font-display text-lg font-bold text-ink-900">{item.title}</h3>
              <p className="mt-1 text-base leading-relaxed text-ink-600">{item.body}</p>
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="reading" tone="white" kicker="Reading a learning story" title="How to read your child's story">
        <p>
          A learning story usually has three parts. <strong>The story</strong> is what your child did, in the order it
          happened, with their own words if they said something. <strong>The learning</strong> is what the educator
          noticed about your child as a learner: being curious, sticking with something hard, helping a friend.{" "}
          <strong>Where to next</strong> is what the educators will offer your child to build on it.
        </p>
        <p>
          Adding your own comment or a story from home helps more than you might think: educators use it to plan what
          comes next. <Link href="/what-is-a-learning-story" className="font-semibold text-clay-700 underline">More about learning stories</Link>.
        </p>
        <GuideFigure
          src="/images/scenes/classroom.jpg"
          alt="Two toddlers building a block tower, seen from behind, while an educator holds an iPad with a learning story draft"
          caption="On StoryLoop's own pages, children are only ever shown from behind: the learning, not the child."
          position="70% 50%"
        />
      </GuideSection>

      <GuideSection id="tell-your-centre" kicker="Know a centre that should try it?" title="Tell your centre about StoryLoop">
        {/* The parent path's guardrail (18 Nov 2026 check, C8): nothing that reads as criticism of her child's teachers. */}
        <p>
          Learning stories take time to write. StoryLoop helps educators write one from a quick note, during the day. If
          you think your centre would like to know, copy this message, or share the link.
        </p>
        <ShareWithCentre />
        {ASK_LIVE && (
          <p>
            Or{" "}
            <Link href="/ask-your-centre" className="font-semibold text-clay-700 underline" data-track="for_families_ask_centre">
              open a ready message to copy or email
            </Link>
            , with what happens to your child&apos;s information.
          </p>
        )}
      </GuideSection>

      <GuideSection id="faq" tone="white" title="Questions families ask">
        <GuideFaq items={FAQS} />
      </GuideSection>

      <RelatedGuides links={[RELATED.safety, RELATED.whatIs, RELATED.examples, RELATED.educators, RELATED.centres, RELATED.accuracy]} />
    </GuidePage>
  );
}
