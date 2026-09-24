import type { Metadata } from "next";
import Link from "next/link";
import CopyTemplate from "@/components/marketing/CopyTemplate";
import { GuideCta, GuideFaq, GuideHero, GuidePage, GuideSection, RELATED, RelatedGuides } from "@/components/marketing/Guide";

export const metadata: Metadata = {
  title: "Learning story template (Te Whāriki and EYLF), free to copy",
  description:
    "A free learning story template for New Zealand (Te Whāriki) and Australia (EYLF V2.0), with a prompt under every heading. Copy it into Word, Google Docs, Canva or Storypark.",
  alternates: { canonical: "https://storyloop.space/learning-story-template" },
  openGraph: { title: "Learning story template, free to copy", description: "Te Whāriki and EYLF versions with a prompt under every heading.", url: "https://storyloop.space/learning-story-template", type: "article" },
};

const NZ_TEMPLATE = `[Title: a short name for the moment, e.g. "Mia and the slater"]

Learning story
[What happened, in the order it happened. Only what you saw and heard. Put the child's own words in quotation marks, exactly as they said them. If they had no words, describe their gestures, sounds and gaze.]

What learning happened?
[What this shows about the child as a learner: a disposition (taking an interest, being involved, persisting, expressing an idea, taking responsibility), a working theory, or a new skill. One or two short paragraphs.]

Te Whāriki links
[One or two strands, and the learning outcome the moment shows. Give one sentence of evidence for each, e.g.
Mana aotūroa | Exploration: Mia counted the slater's legs and checked a picture in the bug book.]

Where to next?
[What we will offer, extend or watch for. Make it specific to this child and this interest.]

Whānau voice
[A question to ask at home, or space for the family's comment or story.]`;

const AU_TEMPLATE = `[Title: a short name for the moment, e.g. "Noah's sand castle idea"]

Observation
[What happened, in the order it happened. Only what you saw and heard. Put the child's own words in quotation marks, exactly as they said them. If they had no words, describe their gestures, sounds and gaze.]

What learning we noticed
[What this shows about the child as a learner: dispositions such as curiosity, persistence or cooperation, thinking skills, or relationships. One or two short paragraphs.]

EYLF V2.0 outcome links
[One or two outcomes the moment shows, with one sentence of evidence for each, e.g.
Outcome 4: Children are confident and involved learners. Noah packed more sand around the base and tried again.]

Where to next (intentional teaching)
[What we will plan, offer or extend, and how we will know it is working.]

Family voice
[A question to ask at home, or space for the family's comment.]`;

const FAQS = [
  {
    q: "Is this learning story template free?",
    a: "Yes. Copy it, change it and use it in your service. No signup, no email.",
  },
  {
    q: "Can I use it in Word, Google Docs or Canva?",
    a: "Yes. The copy button copies plain text, so it pastes cleanly anywhere. In Canva, paste each heading into its own text box on your service's story layout.",
  },
  {
    q: "Can I use it in Storypark or Educa?",
    a: (
      <>
        Yes. The template is plain text, so it pastes into any story editor. Or let StoryLoop fill it in from your
        note: <Link href="/storypark-alternative" className="font-semibold text-clay-700 underline">StoryLoop or Storypark?</Link>
      </>
    ),
  },
  {
    q: "How do I write a learning story for a baby or a child who does not talk yet?",
    a: "Write what their body, face and voice did: where they looked, what they reached for, the sounds they made and how they responded to you. Learning for infants is often about wellbeing, belonging and exploration through movement. Avoid guessing at feelings; describe what showed you.",
  },
  {
    q: "Which headings are required?",
    a: "None are required by Te Whāriki or the EYLF. These are the headings most services use because they follow the notice, recognise, respond cycle. Change them to match your service.",
  },
];

export default function LearningStoryTemplatePage() {
  return (
    <GuidePage>
      <GuideHero
        kicker="Free template"
        title={<>Learning story template, <span className="italic text-clay-700">free to copy</span></>}
        answer={
          <p>
            Two versions, one for Te Whāriki in Aotearoa New Zealand and one for the EYLF V2.0 in Australia. Each follows
            notice, recognise, respond: what happened, what learning it shows, and where to next, with a prompt under every
            heading. Copy it into Word, Google Docs, Canva or Storypark.
          </p>
        }
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#nz" className="btn-primary">Te Whāriki template</a>
          <a href="#au" className="btn-secondary">EYLF template</a>
        </div>
      </GuideHero>

      <GuideSection id="nz" kicker="Aotearoa New Zealand" title="Te Whāriki learning story template">
        <CopyTemplate id="nz" label="Te Whāriki template" text={NZ_TEMPLATE} />
        <p className="text-sm text-ink-500">
          Need the strands and outcomes? See the <Link href="/te-whariki-learning-outcomes-guide" className="font-semibold text-clay-700 underline">Te Whāriki learning outcomes guide</Link>.
        </p>
      </GuideSection>

      <GuideSection id="au" tone="white" kicker="Australia" title="EYLF learning story template">
        <CopyTemplate id="au" label="EYLF V2.0 template" text={AU_TEMPLATE} />
        <p className="text-sm text-ink-500">
          Every sub-outcome with an everyday example: <Link href="/eylf-learning-outcomes" className="font-semibold text-clay-700 underline">the 5 EYLF learning outcomes</Link>.
        </p>
      </GuideSection>

      <GuideSection id="tips" kicker="Filling it in" title="Four things that make a template work">
        <ul className="grid gap-4">
          {[
            ["Write the child's words down at the time", "A quote remembered hours later is rarely the quote. A two-word jotting beats a paragraph from memory."],
            ["Keep the story part to what you saw", "Save “she felt proud” for the learning section, and say what showed you."],
            ["Link one or two outcomes, with evidence", "One sentence of evidence per link is more convincing than five links with none."],
            ["Make “where to next” about this child", "“Offer more collage” could be anyone. “Put the slater book in the reading corner for Mia” is a plan."],
          ].map(([title, body]) => (
            <li key={title} className="rounded-3xl border border-clay-100 bg-white p-5">
              <h3 className="font-display text-xl font-bold text-ink-900">{title}</h3>
              <p className="mt-1 text-base text-ink-600">{body}</p>
            </li>
          ))}
        </ul>
        <p>
          See a template filled in from a real note: <Link href="/what-is-a-learning-story#example" className="font-semibold text-clay-700 underline">the easel example</Link>, or <Link href="/examples" className="font-semibold text-clay-700 underline">12 real drafts</Link> across every age.
        </p>
      </GuideSection>

      <GuideSection id="faq" tone="white" title="Questions educators ask">
        <GuideFaq items={FAQS} />
      </GuideSection>

      <GuideCta heading="Or skip the blank page: StoryLoop fills the template from your note" />
      <RelatedGuides links={[RELATED.whatIs, RELATED.eylf, RELATED.teWhariki, RELATED.examples, RELATED.alongside, RELATED.educators]} />
    </GuidePage>
  );
}
