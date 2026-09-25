import type { Metadata } from "next";
import Link from "next/link";
import { Eye, FileCheck2, Lock, MapPin, ShieldCheck, UserCheck } from "lucide-react";
import { GuideCta, GuideFaq, GuideFigure, GuideHero, GuidePage, GuideSection, GuideSources, RELATED, RelatedGuides } from "@/components/marketing/Guide";
import { ACCURACY_REPORT as R } from "@/lib/accuracy-report";

export const metadata: Metadata = {
  title: { absolute: "Children's information and AI at StoryLoop" },
  description:
    "Where a note about a child goes, what the AI can and cannot do with it, why it is never used to train AI, and the checks on every draft. Stored in Sydney.",
  alternates: { canonical: "https://storyloop.space/safety" },
  openGraph: { title: "Children's information and AI at StoryLoop", description: "Stored in Sydney, never used to train AI, checked before anything is shared.", url: "https://storyloop.space/safety", type: "article" },
};

const JOURNEY = [
  { icon: UserCheck, title: "You write or say a note", body: "First names only. You do not upload photos to write a story." },
  { icon: MapPin, title: "It is saved in Sydney", body: "StoryLoop's database runs on Amazon Web Services in Sydney, Australia, encrypted in transit and at rest." },
  { icon: Lock, title: "The AI drafts, and forgets", body: "The note goes to OpenAI or Anthropic under their business terms, which do not allow it to be used to train their models. They keep it only for a short safety-monitoring period." },
  { icon: FileCheck2, title: "Every draft is checked", body: "Children's quotes are checked word for word against your note, and a privacy check flags anything that should not reach a family." },
  { icon: Eye, title: "You decide what is shared", body: "Nothing goes to a family, a wall or anyone else until an educator chooses. You can edit or delete anything." },
];

const COMMITMENTS = [
  ["The educator is the author", "StoryLoop drafts. The person who saw the moment decides what is true, edits, and signs it off. Nothing publishes itself."],
  ["Honest about limits", `Every change to how stories are written is tested on the same ${R.notes} notes before it ships, and the accuracy report shows the weaknesses as well as the strengths.`],
  ["Private by default", "No advertising, no selling data, no tracking pixels, and nothing about a child is ever sent to Meta, Google or any advertiser."],
  ["Open about how it works", "Every draft lists what it took from your note and what it had to assume. The accuracy test's code is public."],
];

const FAQS = [
  {
    q: "Is StoryLoop just ChatGPT?",
    a: "No. StoryLoop uses models from OpenAI or Anthropic through their business services, not the ChatGPT app, with its own instructions and checks around every draft: quotes checked against the note, the right curriculum for your country, a privacy check, and a list of what the draft assumed. Under those business terms, what we send is not used to train their models.",
  },
  {
    q: "Is it safe to use children's names?",
    a: "First names are fine and help the story read naturally. We recommend leaving out surnames, dates of birth, addresses and anything clinical. The privacy check flags identifiers like these if they slip into a note.",
  },
  {
    q: "What does the privacy check look for?",
    a: "Diagnosis or clinical language, sensitive family details (custody, court, medical, immigration and similar), identifiers such as addresses or dates of birth, claims a note cannot support, and any description of an adult's conduct towards a child. That last one is never put into a family-facing story; it is flagged so the educator can follow their service's safeguarding process.",
  },
  {
    q: "Does StoryLoop record children?",
    a: "Educators can record their own voice memo, which is turned into text and not kept as audio. When a child records their own words for a story, StoryLoop keeps the words, not the recording.",
  },
  {
    q: "What do families see on a wall card?",
    a: "The learning, not the child: wall cards shared on a centre wall or by QR code carry no names, no photographs and no dates, and families can read them in English or ten other languages.",
  },
  {
    q: "Which privacy laws apply?",
    a: (
      <>
        The New Zealand Privacy Act 2020 and the Australian Privacy Principles. Because the AI providers process data in the
        United States, we rely on contract terms that require them to protect it (IPP 12 and APP 8). The full detail is in
        the <Link href="/privacy" className="font-semibold text-clay-700 underline">privacy policy</Link>.
      </>
    ),
  },
  {
    q: "Can we delete everything?",
    a: "Yes. Delete any story or child profile yourself at any time, or email ariacareapp@gmail.com and your whole account, stories and child profiles are deleted within 30 days.",
  },
];

export default function SafetyPage() {
  return (
    <GuidePage>
      <GuideHero
        kicker="Child safety and responsible AI"
        title={<>Children&apos;s information and AI, <span className="italic text-clay-700">in plain words</span></>}
        answer={
          <p>
            A note about a child is stored in Sydney, sent to an AI provider only to draft the story, never used to train
            AI, checked before you see it, and shared only when an educator chooses. This page follows a note from start to
            finish, and sets out what the AI can and cannot do with it.
          </p>
        }
        image="/images/scenes/family.jpg"
        imageAlt="A parent at home smiling at a StoryLoop wall card on her phone, with a toddler leaning on her arm, seen from behind"
        imagePosition="50% 35%"
      />

      <GuideSection id="journey" kicker="Step by step" title="Where a note goes">
        <ol className="grid gap-4">
          {JOURNEY.map((step, index) => (
            <li key={step.title} className="flex gap-4 rounded-3xl border border-clay-100 bg-white p-5">
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-sage-50 text-sage-700">
                <step.icon className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <div>
                <h3 className="font-display text-xl font-bold text-ink-900"><span className="mr-2 tabular-nums text-clay-600">{index + 1}.</span>{step.title}</h3>
                <p className="mt-1 text-base leading-relaxed text-ink-600">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </GuideSection>

      <GuideSection id="what-the-ai-does" tone="white" kicker="The writer's rules" title="What the AI can and cannot do">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-sage-200 bg-sage-50/60 p-5">
            <h3 className="font-display text-lg font-bold text-ink-900">It can</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-700">
              <li>Shape your note into a story with the learning and next steps</li>
              <li>Link to Te Whāriki or the EYLF V2.0, matched to your country</li>
              <li>Suggest what you might check or add</li>
              <li>Write a family version in plain words</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-clay-200 bg-cream-50 p-5">
            <h3 className="font-display text-lg font-bold text-ink-900">It cannot</h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-ink-700">
              <li>Give a child words they did not say: every quote is checked against your note</li>
              <li>Share, send or publish anything by itself</li>
              <li>Learn from your notes: they are never used for training</li>
              <li>Put an adult&apos;s conduct towards a child into a family story</li>
            </ul>
          </div>
        </div>
        <p>
          In the latest test, <Link href="/accuracy" className="font-semibold text-clay-700 underline">{R.drafts - R.wordsInChildMouth} of {R.drafts} drafts</Link> kept every child&apos;s quote exactly as the note had it.
          Anything a draft had to assume is listed beside it for you to check.
        </p>
      </GuideSection>

      <GuideSection id="commitments" kicker="Our commitments" title="Responsible AI, as four promises">
        <ul className="grid gap-4 sm:grid-cols-2">
          {COMMITMENTS.map(([title, body]) => (
            <li key={title} className="rounded-3xl border border-clay-100 bg-white p-5">
              <ShieldCheck className="h-5 w-5 text-sage-700" strokeWidth={1.9} />
              <h3 className="mt-2 font-display text-lg font-bold text-ink-900">{title}</h3>
              <p className="mt-1 text-base leading-relaxed text-ink-600">{body}</p>
            </li>
          ))}
        </ul>
        <GuideFigure
          src="/images/scenes/office.jpg"
          alt="A centre manager at her desk reading StoryLoop's accuracy report on a laptop"
          caption="The accuracy report is public, so a centre manager can check the claims before the team starts."
          position="30% 50%"
        />
      </GuideSection>

      <GuideSection id="policy" tone="cream" kicker="For your service" title="Your service's AI policy">
        <p>
          If educators use any AI to help with documentation, your service should have a short policy: which tools are
          allowed, what never goes into a general AI tool, and that a person reviews everything before it is shared. Our{" "}
          <Link href="/ai-policy" className="font-semibold text-clay-700 underline">free AI policy generator</Link> writes one in ten minutes, from published regulator guidance.
        </p>
      </GuideSection>

      <GuideSection id="faq" title="Questions from educators, managers and families">
        <GuideFaq items={FAQS} />
      </GuideSection>

      <GuideSources sources={[
        { label: "Office of the Privacy Commissioner (New Zealand), Privacy Act 2020", url: "https://www.privacy.org.nz/" },
        { label: "Office of the Australian Information Commissioner, Australian Privacy Principles", url: "https://www.oaic.gov.au/" },
      ]} />
      <GuideCta heading="See how careful it is on your own note" />
      <RelatedGuides links={[RELATED.accuracy, RELATED.aiTools, RELATED.families, RELATED.centres, RELATED.alongside, RELATED.whatIs]} />
    </GuidePage>
  );
}
