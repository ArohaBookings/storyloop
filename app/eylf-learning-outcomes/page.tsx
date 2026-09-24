import type { Metadata } from "next";
import Link from "next/link";
import { GuideCta, GuideFaq, GuideHero, GuidePage, GuideSection, RELATED, RelatedGuides } from "@/components/marketing/Guide";
import { REAL_EXAMPLES } from "@/lib/real-examples";
import { ACCURACY_REPORT as R } from "@/lib/accuracy-report";

// A curriculum link exactly as a real draft wrote it (lib/real-examples.ts).
const LINK_EXAMPLE = REAL_EXAMPLES.flatMap((item) => item.story.split("\n"))
  .find((line) => line.startsWith("EYLF Outcome 5:")) ?? null;

export const metadata: Metadata = {
  title: "The 5 EYLF learning outcomes (V2.0) in plain English, with all 21 sub-outcomes",
  description:
    "The five EYLF V2.0 learning outcomes and their 21 sub-outcomes, in the framework's own words, with what each looks like in play and how to link a learning story to them honestly.",
  alternates: { canonical: "https://storyloop.space/eylf-learning-outcomes" },
  openGraph: { title: "The 5 EYLF learning outcomes (V2.0)", description: "All 21 sub-outcomes, and what each looks like in play.", url: "https://storyloop.space/eylf-learning-outcomes", type: "article" },
};

// Sub-outcome wording as published in Belonging, Being and Becoming: The Early
// Years Learning Framework for Australia (V2.0), 2022. The "looks like" lines
// are StoryLoop's own plain-English examples, not framework text.
const OUTCOMES = [
  {
    n: 1,
    title: "Children have a strong sense of identity",
    plain: "Children feel secure, know who they are, and are learning to get along with others.",
    subs: [
      ["1.1", "Children feel safe, secure and supported", "Settles with a familiar educator, asks for help or comfort, joins play with confidence."],
      ["1.2", "Children develop their emerging autonomy, inter-dependence, resilience and agency", "Puts on their own shoes, makes a choice and sticks with it, bounces back after a tumble."],
      ["1.3", "Children develop knowledgeable, confident self-identities and a positive sense of self-worth", "Talks about their family or culture, shares a home language, is proud of what they made."],
      ["1.4", "Children learn to interact in relation to others with care, empathy and respect", "Notices a friend is upset and brings their comforter, waits for a turn."],
    ],
  },
  {
    n: 2,
    title: "Children are connected with and contribute to their world",
    plain: "Children belong to groups and communities, respect difference, notice fairness, and care for the environment.",
    subs: [
      ["2.1", "Children develop a sense of connectedness to groups and communities and an understanding of their reciprocal rights and responsibilities as active and informed citizens", "Helps set up for kai or morning tea, knows the group's routines, contributes to a group decision."],
      ["2.2", "Children respond to diversity with respect", "Is curious about a friend's language or food, includes a child who plays differently."],
      ["2.3", "Children become aware of fairness", "Says “that's not fair” and suggests a way to share, notices someone is left out."],
      ["2.4", "Children become socially responsible and show respect for the environment", "Waters the garden, puts a slater back under its log, sorts the compost."],
    ],
  },
  {
    n: 3,
    title: "Children have a strong sense of wellbeing",
    plain: "Children are growing strong emotionally and physically, and learning to look after themselves.",
    subs: [
      ["3.1", "Children become strong in their social, emotional and mental wellbeing", "Names a feeling, takes on a challenge, shares a joke, copes when a plan changes."],
      ["3.2", "Children become strong in their physical learning and wellbeing", "Climbs to a new branch, practises balancing, uses scissors or a spoon with more control."],
      ["3.3", "Children are aware of and develop strategies to support their own mental and physical health and personal safety", "Washes hands before eating, asks for a rest, checks the ground before jumping."],
    ],
  },
  {
    n: 4,
    title: "Children are confident and involved learners",
    plain: "Children are curious, try things out, stick with problems, and use what they learn somewhere new.",
    subs: [
      ["4.1", "Children develop a growth mindset and learning dispositions such as curiosity, cooperation, confidence, creativity, commitment, enthusiasm, persistence, imagination and reflexivity", "Rebuilds a tower that fell, keeps going with a tricky puzzle, tries a new idea."],
      ["4.2", "Children develop a range of learning and thinking skills and processes such as problem-solving, inquiry, experimentation, hypothesising, researching and investigating", "Tests which ramp is fastest, asks “why?”, looks up a bug in a book."],
      ["4.3", "Children transfer and adapt what they have learned from one context to another", "Uses counting from mat time to share out the playdough."],
      ["4.4", "Children resource their own learning through connecting with people, places, technologies and natural and processed materials", "Fetches the tape to fix their model, asks an older child how they did it."],
    ],
  },
  {
    n: 5,
    title: "Children are effective communicators",
    plain: "Children express themselves in words, gestures, marks, art and technology, and are beginning to read symbols.",
    subs: [
      ["5.1", "Children interact verbally and non-verbally with others for a range of purposes", "Babbles back in a turn-taking “conversation”, points to ask, negotiates a role in play."],
      ["5.2", "Children engage with a range of texts and gain meaning from these texts", "Joins in a repeated line of a picture book, retells a story."],
      ["5.3", "Children express ideas and make meaning using a range of media", "Paints what happened at the beach, builds a “castle for the dragon”, dances a song."],
      ["5.4", "Children begin to understand how symbols and pattern systems work", "Writes the first letter of their name, makes a colour pattern, recognises a sign."],
      ["5.5", "Children use digital technologies and media to access information, investigate ideas and represent their thinking", "Takes a photo of their block building, looks at a video to find out how a bird flies."],
    ],
  },
];

const FAQS = [
  {
    q: "How many EYLF learning outcomes are there?",
    a: "Five learning outcomes, broken into 21 sub-outcomes in V2.0: four each under outcomes 1, 2 and 4, three under outcome 3 and five under outcome 5.",
  },
  {
    q: "What changed in EYLF V2.0?",
    a: "The five outcomes stayed the same. Several sub-outcomes were reworded: 3.1 now includes mental wellbeing, 4.1 adds a growth mindset, and 2.1 speaks of children as active and informed citizens. V2.0 also grew from five principles to eight, adding Aboriginal and Torres Strait Islander perspectives, sustainability, and collaborative leadership and teamwork.",
  },
  {
    q: "How many outcomes should a learning story link to?",
    a: "Usually one or two: the ones the moment genuinely shows. A story that links to all five reads like a checklist and tells a family less. StoryLoop links only where the note supports it, and says why in a sentence.",
  },
  {
    q: "Where do the EYLF outcomes fit in the planning cycle?",
    a: (
      <>
        Observe, analyse (which outcomes the learning shows), plan, act, reflect. A learning story covers the first two and
        the start of planning in its &ldquo;where to next&rdquo;. See the{" "}
        <Link href="/eylf-planning-cycle" className="font-semibold text-clay-700 underline">EYLF planning cycle guide</Link>.
      </>
    ),
  },
  {
    q: "Is there an EYLF learning outcomes cheat sheet?",
    a: "This page is one: the table below lists every sub-outcome with an everyday example. Print it from your browser, or copy the table into your planning template.",
  },
];

export default function EylfOutcomesPage() {
  return (
    <GuidePage>
      <GuideHero
        kicker="EYLF V2.0 · Australia"
        title={<>The 5 EYLF learning outcomes, <span className="italic text-clay-700">in plain English</span></>}
        answer={
          <>
            <p>The Early Years Learning Framework (V2.0) sets five learning outcomes for children from birth to five:</p>
            <ol className="mt-3 list-decimal space-y-1 pl-6 font-semibold text-ink-900">
              {OUTCOMES.map((outcome) => <li key={outcome.n}>{outcome.title}</li>)}
            </ol>
            <p className="mt-3">Each has sub-outcomes (21 in all), listed below in the framework&apos;s own words with what each can look like in play.</p>
          </>
        }
        image="/images/scenes/team.jpg"
        imageAlt="Three educators planning around a low table with a laptop showing StoryLoop's real example drafts"
      />

      {OUTCOMES.map((outcome, index) => (
        <GuideSection key={outcome.n} id={`outcome-${outcome.n}`} tone={index % 2 ? "white" : "plain"} kicker={`Outcome ${outcome.n}`} title={outcome.title}>
          <p className="text-lg">{outcome.plain}</p>
          <div className="overflow-x-auto rounded-3xl border border-clay-100 bg-paper">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-cream-50 text-xs uppercase tracking-wider text-ink-500">
                <tr><th className="px-4 py-3" scope="col">Sub-outcome</th><th className="px-4 py-3" scope="col">What it can look like</th></tr>
              </thead>
              <tbody className="divide-y divide-clay-100">
                {outcome.subs.map(([code, text, looks]) => (
                  <tr key={code} className="align-top">
                    <th scope="row" className="px-4 py-3 font-normal text-ink-800"><span className="mr-2 font-bold tabular-nums text-clay-700">{code}</span>{text}</th>
                    <td className="px-4 py-3 text-ink-600">{looks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GuideSection>
      ))}

      <GuideSection id="linking" tone="cream" kicker="In a learning story" title="Linking a story to the outcomes honestly">
        <p>
          A curriculum link is a claim: this moment shows this learning. It is only as strong as the evidence in the story.
          Name the outcome, then say in one sentence what the child did that shows it. For example, from a real StoryLoop
          draft:
        </p>
        {LINK_EXAMPLE && (
          <blockquote className="story-safe rounded-3xl border border-clay-100 bg-paper p-5 font-display text-lg leading-relaxed text-ink-800">
            {LINK_EXAMPLE}
          </blockquote>
        )}
        <p>
          StoryLoop writes links this way for Australian services, using V2.0 wording, and never adds Te Whāriki to an
          Australian story. In the latest test, <Link href="/accuracy" className="font-semibold text-clay-700 underline">{R.drafts - R.frameworkMixups} of {R.drafts} drafts</Link> used the right framework for their country.
        </p>
      </GuideSection>

      <GuideSection id="faq" title="Questions educators ask">
        <GuideFaq items={FAQS} />
      </GuideSection>

      <GuideCta heading="Drafts with EYLF V2.0 links, from your own notes" />
      <RelatedGuides links={[RELATED.whatIs, RELATED.template, RELATED.examples, RELATED.accuracy, RELATED.alongside, RELATED.centres]} />
    </GuidePage>
  );
}
