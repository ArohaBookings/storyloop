import type { Metadata } from "next";
import Link from "next/link";
import { GuideCta, GuideFaq, GuideFigure, GuideHero, GuidePage, GuideSection, RELATED, RelatedGuides } from "@/components/marketing/Guide";

export const metadata: Metadata = {
  title: { absolute: "StoryLoop works with Storypark, Educa and Kinderloop" },
  description:
    "Write and check learning stories in StoryLoop, then share them wherever your families already are: Storypark, Educa, Kinderloop or Brightwheel.",
  alternates: { canonical: "https://storyloop.space/works-alongside" },
  openGraph: { title: "StoryLoop works with Storypark, Educa and Kinderloop", description: "Write it in StoryLoop, share it wherever your families already are.", url: "https://storyloop.space/works-alongside", type: "article" },
};

const STEPS = [
  ["Jot the note, or say it", "Straight after the moment, on your phone or a computer: a few quick points or a voice memo. Add the child's first name and age if you like."],
  ["Read the draft and make it yours", "StoryLoop writes the story, the learning, the curriculum links and where to next. Every child's quote is checked against your note, and anything it assumed is listed. Edit anything, or ask Quill to change a line."],
  ["Copy it, or use an export pack", "Copy puts the whole story on your clipboard. On paid plans, export packs rearrange the same story into the sections Storypark, Educa, Kinderloop or Brightwheel usually use."],
  ["Paste it into your platform and publish", "Open a new story in your platform, paste, add your photos there, tag the child and publish exactly as you do now. Families see it where they always have."],
];

const WHERE = [
  ["Families, photos and videos", "Your platform", "Nothing moves. Families keep their app and their login."],
  ["The published story", "Your platform", "You paste the finished story in, like pasting from Word."],
  ["The note and the draft", "StoryLoop", "A private history of your drafts, stored in Sydney."],
  ["Child learning profiles (optional)", "StoryLoop", "Interests and recent learning that help the next draft (Educator Pro)."],
];

const FAQS = [
  {
    q: "Does StoryLoop connect directly to Storypark?",
    a: "Not directly: there is no automatic posting. That is deliberate, because nothing should publish to families without an educator reading it first. Copy and paste takes a few seconds, and export packs format it for each platform.",
  },
  {
    q: "Is StoryLoop a Storypark alternative?",
    a: (
      <>
        For learning stories, it can be: writing, checking, following each child&apos;s learning and sharing with families.
        It does not host a family photo feed yet. See <Link href="/storypark-alternative" className="font-semibold text-clay-700 underline">StoryLoop or Storypark?</Link>
      </>
    ),
  },
  {
    q: "Will the formatting survive the paste?",
    a: "Yes. StoryLoop copies plain text with blank lines between sections, which every platform's editor accepts. Headings come through as their own lines; you can bold them in your platform if your service does.",
  },
  {
    q: "What about Xplor, Playground, Kidsoft or another platform?",
    a: "Anything with a text box works the same way: copy, paste, add photos, publish. Export packs are tailored to Storypark, Educa, Kinderloop and Brightwheel; for others, the plain copy works well.",
  },
  {
    q: "Do families need to do anything?",
    a: "No. They keep using the app they already have. If your centre uses wall cards, families can also scan a QR code to read about the learning in their own language.",
  },
];

export default function WorksAlongsidePage() {
  return (
    <GuidePage>
      <GuideHero
        kicker="Works with your platform"
        title={<>Works with <span className="italic text-clay-700">Storypark, Educa and Kinderloop</span></>}
        answer={
          <p>
            Write the learning story in StoryLoop from a quick note or voice memo, check it, then share it wherever your
            families already are: Storypark, Educa, Kinderloop or Brightwheel, with your photos added there as usual. You
            can start on your own today, and your centre can bring its learning stories into StoryLoop whenever it is ready.
          </p>
        }
        image="/images/scenes/kitchen.jpg"
        imageAlt="An educator at home reading a StoryLoop draft on her laptop, ready to paste it into her centre's platform"
        imagePosition="68% 50%"
      />

      <GuideSection id="how" kicker="Four steps" title="From a note to a published story">
        <ol className="grid gap-4">
          {STEPS.map(([title, body], index) => (
            <li key={title} className="flex gap-4 rounded-3xl border border-clay-100 bg-white p-5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-clay-700 font-display text-lg font-bold text-paper">{index + 1}</span>
              <div>
                <h3 className="font-display text-xl font-bold text-ink-900">{title}</h3>
                <p className="mt-1 text-base leading-relaxed text-ink-600">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </GuideSection>

      <GuideSection id="where" tone="white" kicker="What lives where" title="Your platform stays the home for families">
        <div className="overflow-x-auto rounded-3xl border border-clay-100 bg-paper">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-cream-50 text-xs uppercase tracking-wider text-ink-500">
              <tr><th className="px-4 py-3" scope="col">What</th><th className="px-4 py-3" scope="col">Where it lives</th><th className="px-4 py-3" scope="col">What that means</th></tr>
            </thead>
            <tbody className="divide-y divide-clay-100">
              {WHERE.map(([what, where, means]) => (
                <tr key={what}>
                  <th scope="row" className="px-4 py-3 font-semibold text-ink-900">{what}</th>
                  <td className="px-4 py-3 text-ink-700">{where}</td>
                  <td className="px-4 py-3 text-ink-600">{means}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <GuideFigure
          src="/images/scenes/classroom.jpg"
          alt="An educator in a centre holding an iPad with a StoryLoop learning story draft, children building blocks in the background"
          caption="Draft on a tablet in the room, publish from your platform as usual."
          position="45% 60%"
        />
      </GuideSection>

      <GuideSection id="faq" title="Questions educators ask">
        <GuideFaq items={FAQS} />
      </GuideSection>

      <GuideCta heading="Write this week's stories in StoryLoop, share them where your families already are" />
      <RelatedGuides links={[RELATED.vsStorypark, RELATED.educators, RELATED.centres, RELATED.safety, RELATED.examples, RELATED.template]} />
    </GuidePage>
  );
}
