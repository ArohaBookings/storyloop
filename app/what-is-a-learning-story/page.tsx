import type { Metadata } from "next";
import Link from "next/link";
import GuideProof from "@/components/marketing/GuideProof";
import PrintableCard from "@/components/marketing/PrintableCard";
import { GuideCta, GuideFaq, GuideFigure, GuideHero, GuidePage, GuideSection, RELATED, RelatedGuides } from "@/components/marketing/Guide";
import { REAL_EXAMPLES } from "@/lib/real-examples";
import { ACCURACY_REPORT as R } from "@/lib/accuracy-report";
import { buyerPageLive } from "@/lib/buyer-pages";

export const metadata: Metadata = {
  // 25 Nov 2026 re-aim: the one page where parents already reach us (Google's AI Overview cites it for
  // "how do I reply to my child's learning story"), so the title names them too.
  title: { absolute: "What Is a Learning Story? For Educators and Parents" },
  description:
    "A learning story is a short written account of one moment of a child's learning. What goes in one, why centres write them, and how parents can reply.",
  alternates: { canonical: "https://storyloop.space/what-is-a-learning-story" },
  openGraph: { title: "What is a learning story?", description: "The three parts, the history, and a real example.", url: "https://storyloop.space/what-is-a-learning-story", type: "article" },
};

const EXAMPLE = REAL_EXAMPLES.find((item) => item.slug === "two-painting-colours-au") ?? REAL_EXAMPLES[0];

/** Split a draft into its sections by the headings the writer always uses. */
function sections(story: string) {
  const headings = ["Learning Story", "What learning we noticed", "Curriculum links", "Where to next / Responding", "Family link", "Whānau link"];
  const parts: Record<string, string> = {};
  let current = "";
  for (const line of story.split("\n")) {
    const heading = headings.find((h) => line.trim().toLowerCase() === h.toLowerCase());
    if (heading) {
      current = heading;
      parts[current] = "";
    } else if (current) {
      parts[current] = `${parts[current]}${line}\n`;
    }
  }
  return parts;
}

const PARTS = sections(EXAMPLE.story);

const COMPARE = [
  ["What it records", "What a child did, and why it matters for their learning", "What a child did"],
  ["Written as", "A short story, often to the child, in everyday language", "Notes, a running record, a checklist or a jotting"],
  ["Includes the learning", "Yes: the learning noticed, and curriculum links", "Sometimes, usually added later"],
  ["Looks forward", "Yes: where to next, and how educators will respond", "Rarely"],
  ["Who it is for", "The child, their family and the teaching team", "Mostly the educator"],
  ["Time it takes", "20 to 40 minutes from a blank page; 5 to 10 from a note taken at the time", "A few minutes"],
];

const FAQS = [
  {
    q: "Are learning stories compulsory in New Zealand?",
    a: "No. Te Whāriki does not require any particular format for assessment. It does expect assessment that makes children's learning visible and supports what comes next, and learning stories became the most common way services do that. ERO looks at whether assessment shows children's learning and progress, not at the format.",
  },
  {
    q: "Do Australian services use learning stories?",
    a: (
      <>
        Many do. The EYLF V2.0 asks educators to assess and document children&apos;s learning as part of the planning cycle and
        does not prescribe a format, so learning stories sit alongside observations, jottings and portfolios. A good story
        links the learning to the{" "}
        <Link href="/eylf-learning-outcomes" className="font-semibold text-clay-700 underline">five EYLF learning outcomes</Link>.
      </>
    ),
  },
  {
    q: "How long should a learning story be?",
    a: `Long enough to show the moment, the learning and what comes next. Most sit between 200 and 400 words. The drafts StoryLoop writes have a median of about ${Math.round(R.medianWords / 10) * 10} words, and educators often trim them.`,
  },
  {
    q: "Who is a learning story written to?",
    a: "Often to the child (“Mia, today you…”), sometimes about the child for the family. Both are common. What matters is that the family and the child can read it and recognise the moment.",
  },
  {
    q: "Can AI write a learning story?",
    a: (
      <>
        AI can draft one from an educator&apos;s note, but the educator is still the author: they saw the moment, they know
        the child, and they decide what is true. StoryLoop keeps a child&apos;s words exactly as the note has them and
        lists anything it had to assume. See{" "}
        <Link href="/accuracy" className="font-semibold text-clay-700 underline">how every draft is tested</Link>.
      </>
    ),
  },
];

export default function WhatIsALearningStoryPage() {
  return (
    <GuidePage>
      <GuideHero
        tryNote
        kicker="Guide for educators"
        title={<>What is a <span className="italic text-clay-700">learning story?</span></>}
        answer={
          <p>
            A learning story is a short story an educator writes about one moment of a child&apos;s learning, what it
            shows, and what could come next. Parents: <a href="#reply" className="font-semibold text-clay-700 underline">how to reply</a> is further down. The approach was developed in Aotearoa New Zealand in the 1990s by
            Margaret Carr and colleagues, and it is now the main way early childhood services in New Zealand assess
            learning under Te Whāriki. Many Australian services use it alongside the EYLF.
          </p>
        }
        image="/images/scenes/classroom.jpg"
        imageAlt="An educator holds an iPad showing a StoryLoop learning story draft while two toddlers build a block tower"
      />

      {/* Two short paths (25 Nov 2026): the educator to the note box, the parent to how to reply. No offer to parents. */}
      <div className="wide-shell pt-10">
        <div className="grid max-w-4xl gap-3 sm:grid-cols-2" data-testid="two-paths">
          <a href="#try" className="flex min-h-[44px] flex-col rounded-2xl border border-clay-200 bg-white p-4 shadow-soft hover:border-clay-400" data-track="what_is_path_educator">
            <span className="text-xs font-bold uppercase tracking-wider text-clay-700">Educator</span>
            <span className="mt-1 font-semibold text-ink-900">Write one from your note</span>
          </a>
          <a href="#reply" className="flex min-h-[44px] flex-col rounded-2xl border border-sage-200 bg-sage-50/80 p-4 shadow-soft hover:border-sage-400" data-track="what_is_path_parent">
            <span className="text-xs font-bold uppercase tracking-wider text-sage-700">Parent</span>
            <span className="mt-1 font-semibold text-ink-900">How to reply to your child&apos;s story</span>
          </a>
        </div>
      </div>

      <GuideProof framework="NZ" demo="visitor" />

      <GuideSection id="three-parts" kicker="The shape of every story" title="Notice, recognise, respond">
        <p>
          New Zealand&apos;s assessment exemplars, <em>Kei Tua o te Pae</em>, describe assessment as three steps, and a
          learning story follows them in order:
        </p>
        <ol className="grid gap-4">
          {[
            ["Notice", "The story. What happened, in the order it happened, with the child's own words if they had any. Only what the educator saw or heard."],
            ["Recognise", "The learning. What this shows about the child as a learner: a disposition such as persistence or curiosity, a working theory, a new skill, and the curriculum links it supports."],
            ["Respond", "Where to next. What educators will offer, extend or watch for, and a question or idea for the family."],
          ].map(([step, body], index) => (
            <li key={step} className="flex gap-4 rounded-3xl border border-clay-100 bg-white p-5">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-clay-700 font-display text-lg font-bold text-paper">{index + 1}</span>
              <div>
                <h3 className="font-display text-xl font-bold text-ink-900">{step}</h3>
                <p className="mt-1 text-base leading-relaxed text-ink-600">{body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p>
          Many stories add the family&apos;s voice (a comment or a story from home) and the child&apos;s own view, which is
          why they work so well for families: they read as a story about their child, not a report.
        </p>
        <p className="rounded-2xl border border-sage-200 bg-sage-50/70 p-4 text-[15px]" data-testid="for-families-box">
          <strong>For families:</strong> would you like more stories like this about your child?{" "}
          {/* /ask-your-centre is held out of this release (lib/buyer-pages.ts): the families page's own message until then. */}
          <Link href={buyerPageLive("ask-your-centre") ? "/ask-your-centre" : "/for-families#tell-your-centre"} className="font-semibold text-clay-700 underline" data-track="what_is_ask_centre">
            A short message you can send your centre
          </Link>
          .
        </p>
        <p>Want the three parts on paper? A blank A4 template, free to print:</p>
        <div className="grid gap-4 md:grid-cols-2">
          <PrintableCard which="templateNz" compact />
          <PrintableCard which="templateAu" compact />
        </div>
      </GuideSection>

      {/* 26 Nov 2026 (on-page SEO): answers "what is the purpose of learning stories" (Search Console position 57) and "learning stories" (27). */}
      <GuideSection id="purpose" tone="white" kicker="What they are for" title="Why centres write learning stories">
        <p>A learning story does four jobs at once, which is why so many services write them instead of filling in checklists:</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li><strong>It makes learning visible.</strong> It shows what a child did and what it tells you, in a moment anyone can picture, instead of a tick against a skill.</li>
          <li><strong>It plans what comes next.</strong> The respond part becomes the next step for the whole teaching team.</li>
          <li><strong>It brings families in.</strong> Parents and whānau read it, add what they see at home, and children revisit their own stories.</li>
          <li>
            <strong>It is the assessment record.</strong> In New Zealand it is how most services show assessment under Te Whāriki. In
            Australia it is one way to document assessment for the educational program (regulation 74 of the National Regulations), and
            the evidence an assessor reads for{" "}
            <Link href="/nqs-standard-1-3-assessment-and-planning" className="font-semibold text-clay-700 underline">NQS Standard 1.3, assessment and planning</Link>.
          </li>
        </ul>
      </GuideSection>

      <GuideSection id="reply" tone="cream" kicker="For parents and whānau" title="How to reply to your child's learning story">
        <p>
          A reply does not need to be long or clever. A line from home helps educators know your child better, and it
          can shape what they offer next.
        </p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>Say what you noticed or liked in the story.</li>
          <li>Add something from home: does your child do this there too, or talk about it?</li>
          <li>Ask a question if you have one, or share an idea for what could come next.</li>
        </ul>
        <p>Two example replies, written for this page to show the idea:</p>
        <div className="grid gap-3 md:grid-cols-2">
          <blockquote className="rounded-2xl border border-clay-100 bg-paper p-4 text-[15px] italic text-ink-700">
            Example: &ldquo;We loved this. Mia has been building towers with the couch cushions all week, so this
            makes sense. She told us the tall one was for the cat.&rdquo;
          </blockquote>
          <blockquote className="rounded-2xl border border-clay-100 bg-paper p-4 text-[15px] italic text-ink-700">
            Example: &ldquo;Thank you for noticing how long he kept trying. At home he gets frustrated with puzzles. Is
            there anything you say that helps him keep going?&rdquo;
          </blockquote>
        </div>
        <p>
          Reply wherever your centre shares stories with you. More for families:{" "}
          <Link href="/for-families" className="font-semibold text-clay-700 underline" data-track="what_is_for_families">
            what you will see, in plain words
          </Link>
          .
        </p>
      </GuideSection>

      <GuideSection id="example" tone="white" kicker="A real example" title="From a two-line note to a story">
        <p>
          A note written the way educators jot at the easel (one of the 24 notes StoryLoop is tested on), and the draft
          StoryLoop wrote from it, unedited. The child&apos;s word <strong>&ldquo;green!&rdquo;</strong> is kept exactly
          as the note has it.
        </p>
        <div className="rounded-3xl border border-clay-200 bg-cream-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-clay-700">The note ({EXAMPLE.age}, {EXAMPLE.framework === "NZ" ? "Te Whāriki" : "EYLF"})</p>
          <p className="mt-2 font-mono text-sm leading-relaxed text-ink-800">{EXAMPLE.note}</p>
        </div>
        <div className="grid gap-4">
          {[
            ["Notice: the story", PARTS["Learning Story"]],
            ["Recognise: the learning", PARTS["What learning we noticed"]],
            ["Recognise: curriculum links", PARTS["Curriculum links"]],
            ["Respond: where to next", PARTS["Where to next / Responding"]],
          ].filter(([, text]) => text && text.trim()).map(([label, text]) => (
            <div key={label} className="story-safe rounded-3xl border border-clay-100 bg-paper p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-sage-700">{label}</p>
              <div className="mt-2 space-y-3 font-display text-lg leading-relaxed text-ink-800">
                {text!.trim().split(/\n\s*\n/).map((paragraph) => <p key={paragraph.slice(0, 40)}>{paragraph.trim()}</p>)}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-ink-500">
          From StoryLoop&apos;s accuracy test run of 23 September 2026. <Link href="/examples" className="font-semibold text-clay-700 underline">Read 11 more learning story examples</Link>.
        </p>
      </GuideSection>

      <GuideSection id="vs-observation" kicker="Common question" title="Learning story or observation?">
        <p>
          An observation records what happened. A learning story does that too, and then says what it means for the
          child&apos;s learning and what comes next. Most services use both: quick observations through the week, and
          learning stories for the moments that matter.
        </p>
        <div className="overflow-x-auto rounded-3xl border border-clay-100 bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-cream-50 text-xs uppercase tracking-wider text-ink-500">
              <tr><th className="px-4 py-3" scope="col"></th><th className="px-4 py-3" scope="col">Learning story</th><th className="px-4 py-3" scope="col">Observation</th></tr>
            </thead>
            <tbody className="divide-y divide-clay-100">
              {COMPARE.map(([row, story, observation]) => (
                <tr key={row}>
                  <th scope="row" className="px-4 py-3 font-semibold text-ink-900">{row}</th>
                  <td className="px-4 py-3 text-ink-700">{story}</td>
                  <td className="px-4 py-3 text-ink-700">{observation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection id="dispositions" tone="cream" kicker="Where they came from" title="Margaret Carr's five learning dispositions">
        <p>
          Carr&apos;s research, published in <em>Assessment in Early Childhood Settings: Learning Stories</em> (2001),
          looked for learning dispositions rather than checklists of skills, and tied each to a strand of Te Whāriki:
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            ["Taking an interest", "Belonging | Mana whenua"],
            ["Being involved", "Wellbeing | Mana atua"],
            ["Persisting with difficulty or uncertainty", "Exploration | Mana aotūroa"],
            ["Expressing an idea or a feeling", "Communication | Mana reo"],
            ["Taking responsibility", "Contribution | Mana tangata"],
          ].map(([disposition, strand]) => (
            <li key={disposition} className="rounded-2xl border border-clay-100 bg-paper px-4 py-3">
              <span className="block font-semibold text-ink-900">{disposition}</span>
              <span className="text-sm text-ink-600">{strand}</span>
            </li>
          ))}
        </ul>
        <p>
          That is why a good learning story talks about the child as a learner (curious, persistent, thoughtful) rather
          than ticking off what they can do.
        </p>
      </GuideSection>

      <GuideSection id="write-faster" kicker="Writing them" title="Why they take so long, and how to write them faster">
        <p>
          A careful learning story takes most educators 20 to 40 minutes from a blank page, and non-contact time rarely covers it, so many
          are written at home in the evening. The slow part is rarely the noticing; it is turning quick notes into
          connected paragraphs with the curriculum links and next steps.
        </p>
        <GuideFigure
          src="/images/scenes/kitchen.jpg"
          alt="An educator at her kitchen table in the evening, reading a StoryLoop learning story draft on her laptop"
          caption={`StoryLoop drafts the story from a quick note or a voice memo in about ${Math.round(R.medianSeconds)} seconds. The educator checks every word before it goes anywhere.`}
          position="70% 50%"
        />
        <p>
          Three habits help whether or not you use a tool: jot the child&apos;s exact words at the time, write the story
          part straight after the moment while it is fresh, and keep the curriculum links to the one or two the moment
          actually shows. Our <Link href="/learning-story-template" className="font-semibold text-clay-700 underline">free template</Link> follows that order.
        </p>
        <p>
          Using AI for this?{" "}
          <Link href="/ai-for-early-childhood-educators" className="font-semibold text-clay-700 underline" data-track="what_is_ai_educators">
            What AI helps with, what never goes in, and how to keep your own voice
          </Link>
          . Or see how the{" "}
          <Link href="/learning-story-generator" className="font-semibold text-clay-700 underline" data-track="what_is_generator">
            learning story generator
          </Link>{" "}
          turns a two-line note into a draft you check and sign off.
        </p>
      </GuideSection>

      <GuideSection id="faq" tone="white" title="Questions educators ask">
        <GuideFaq items={FAQS} />
      </GuideSection>

      <GuideCta />
      <RelatedGuides links={[RELATED.template, RELATED.observation, RELATED.eylf, RELATED.teWhariki, RELATED.examples, RELATED.accuracy]} />
    </GuidePage>
  );
}
