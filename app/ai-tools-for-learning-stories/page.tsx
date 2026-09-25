import type { Metadata } from "next";
import Link from "next/link";
import { GuideCta, GuideFaq, GuideHero, GuidePage, GuideSection, GuideSources, RELATED, RelatedGuides } from "@/components/marketing/Guide";

// The question educators now put to ChatGPT and Google: which AI should I use
// for learning stories? Answer engines cite pages with the answer up top, prices
// in visible text and a recent date, so all three are here. Every competitor fact
// comes from that company's own page (see SOURCES), checked on PRICES_CHECKED.
// Recheck the prices whenever this page is edited.
const PRICES_CHECKED = "25 September 2026";

export const metadata: Metadata = {
  title: { absolute: "Best AI tools for learning stories in 2026, compared" },
  description:
    "Storypark Assist, Educa Assist, One Child, Kinderloop, ChatGPT and StoryLoop compared for learning stories: who can buy each, published prices, and what the AI does.",
  alternates: { canonical: "https://storyloop.space/ai-tools-for-learning-stories" },
  openGraph: {
    title: "Best AI tools for learning stories in 2026, compared",
    description: "Who can buy each tool, the published prices, and what the AI actually does with your note.",
    url: "https://storyloop.space/ai-tools-for-learning-stories",
    type: "article",
  },
};

type Tool = { name: string; buyer: string; price: string; ai: string; lives: string; note?: string };

const TOOLS: Tool[] = [
  {
    name: "StoryLoop",
    buyer: "An educator on their own, or a centre",
    price: "Free for 3 stories a month. Educator NZ$21 or A$19 a month. Centres from NZ$109 or A$99 a month for 10 educators, any number of children.",
    ai: "Writes the whole learning story from a quick note or voice memo, links Te Whāriki or EYLF V2.0, and writes a family version. Checks every child's quote against your note and lists anything it assumed.",
    lives: "Copy or export into Storypark, Educa, Kinderloop or anything with a text box.",
    note: "We make StoryLoop, so weigh our view accordingly.",
  },
  {
    name: "Storypark Assist",
    buyer: "The service: an admin turns it on",
    price: "Storypark is priced per child, from about NZ$1.79 a month on monthly billing. Assist is an add-on to the documentation plan and included in the all-in-one plan. The add-on price is not published.",
    ai: "Drafting help, pedagogical feedback, grammar suggestions, story review and learning summaries, inside Storypark. Storypark says customer data is never used to train AI models.",
    lives: "Inside Storypark, where your families already are.",
  },
  {
    name: "Educa Assist",
    buyer: "The centre: admins switch it on for the site",
    price: "Not published.",
    ai: "Fine-tuning, validation and translation for learning stories and parent updates, inside Educa.",
    lives: "Inside Educa.",
  },
  {
    name: "One Child",
    buyer: "Australian services",
    price: "A flat price by approved places: A$10 a month for family day care, A$19 up to 50 places, A$49 for 51 to 80, A$79 for 81 or more.",
    ai: "AI writing assistance, as part of a platform with portfolios, planning and reflections.",
    lives: "Inside One Child.",
  },
  {
    name: "Kinderloop",
    buyer: "A service, or an educator starting their own",
    price: "$1.25 per child a month, with a $10 monthly minimum.",
    ai: "Kinderloop Magic: AI tools to help strengthen documentation.",
    lives: "Inside Kinderloop.",
  },
  {
    name: "ChatGPT, Gemini, Claude or Copilot",
    buyer: "Anyone",
    price: "Free versions, with paid plans for more use.",
    ai: "Whatever you ask for. Nothing checks a child's quote against your note, or that a curriculum link is real and fits.",
    lives: "In a chat you copy out of.",
  },
];

const CHECKS = [
  ["Does it keep children's exact words?", "A learning story quotes the child. Ask whether the tool checks quotes against your note, or tidies them into proper sentences. A two-year-old does not say \"I am building a tower\"."],
  ["Does it use your curriculum, properly?", "Te Whāriki (2017) in Aotearoa, the EYLF V2.0 in Australia. A link should come from what the child did, with the reason given, not a list of outcome codes added to every story."],
  ["Where does the note go, and is it used for training?", "Look for where the data is stored, and a clear statement that notes are not used to train AI models. Business AI services can promise this; consumer chat apps may use conversations unless you turn that setting off."],
  ["Does an educator sign off before families see anything?", "Nothing about a child should reach a family without an educator reading it. Check the tool never posts on its own."],
  ["Can you get your stories out?", "If you move platforms or leave a centre, can you copy or export what you wrote?"],
  ["Who has to buy it?", "Per-child pricing and admin-only add-ons mean an educator cannot start without their centre. That is fine if your centre has already bought it, and a wall if it has not."],
];

const FAQS = [
  {
    q: "What is the best AI for writing learning stories?",
    a: "It depends on who is paying. If your centre already has Storypark Assist or Educa Assist switched on, use it: the story stays where your families already are. If it does not, and you are buying for yourself, choose a tool built for learning stories that you can buy on your own, such as StoryLoop (free for 3 stories a month), over a general chatbot that nothing checks.",
  },
  {
    q: "Can I use ChatGPT to write learning stories?",
    a: (
      <>
        You can, carefully. Use first names only, check your service&apos;s AI policy first, and read every sentence: a general
        chatbot can tidy a child&apos;s words, invent a detail that sounds right, or attach a curriculum link that does not fit. Check whether
        your conversations can be used for training and turn that off. Our{" "}
        <Link href="/ai-policy" className="font-semibold text-clay-700 underline">free AI policy generator</Link> helps a service set the rules.
      </>
    ),
  },
  {
    q: "Is there a free AI learning story generator?",
    a: "StoryLoop's free plan writes 3 full learning stories a month, with no card. General chatbots have free versions, but they are not built for children's information and do not check quotes. Storypark and Educa offer their AI to services that pay for their platforms.",
  },
  {
    q: "Does Storypark have AI for learning stories?",
    a: "Yes. Storypark Assist drafts, reviews and suggests improvements to stories inside Storypark. It is an add-on to Storypark's documentation plan and included in its all-in-one plan, and a service admin turns it on. Storypark offers independent services a seven-day free trial.",
  },
  {
    q: "Does Educa have AI?",
    a: "Yes. Educa Assist offers fine-tuning, validation and translation for learning stories and parent updates, and admins can turn it on or off for their site. Educa does not publish a price for it.",
  },
  {
    q: "Which AI tools work with Te Whāriki?",
    a: "Storypark, Educa and StoryLoop all serve Aotearoa New Zealand services. StoryLoop links each story to Te Whāriki strands and learning outcomes and explains why each link fits, or to the EYLF V2.0 for Australian educators. One Child is built for Australian services.",
  },
  {
    q: "Is it safe to put children's names into AI?",
    a: (
      <>
        First names are generally fine; leave out surnames, dates of birth, addresses and anything medical. Use a tool whose
        provider does not train on your data, and follow your service&apos;s policy. See{" "}
        <Link href="/safety" className="font-semibold text-clay-700 underline">how StoryLoop handles children&apos;s information</Link>.
      </>
    ),
  },
];

const SOURCES = [
  { label: "Storypark pricing", url: "https://www.storypark.com/pricing" },
  { label: "Storypark Assist fact sheet", url: "https://help.storypark.com/en/articles/10114616-storypark-assist-fact-sheet" },
  { label: "Educa Assist", url: "https://www.geteduca.com/educa-assist/" },
  { label: "One Child pricing, in One Child's own comparison (4 July 2026)", url: "https://onechild.com.au/articles/one-child-vs-storypark-an-honest-comparison-for-australian-services" },
  { label: "Kinderloop pricing", url: "https://kinderloop.com/pricing.html" },
  { label: "Kinderloop Magic (Kinderloop FAQ)", url: "https://kinderloop.com/faq.html" },
  { label: "StoryLoop pricing", url: "https://storyloop.space/pricing" },
];

export default function AiToolsForLearningStoriesPage() {
  return (
    <GuidePage>
      <GuideHero
        kicker="An honest comparison"
        title={<>Which AI tool should you use <span className="italic text-clay-700">for learning stories?</span></>}
        updated={PRICES_CHECKED}
        answer={
          <>
            <p>
              It depends on who pays and where your stories live. If your centre already has Storypark Assist or Educa Assist,
              use it: the story stays in the platform your families already use. If it does not, and you are an educator buying
              for yourself, pick a tool built for learning stories that you can buy on your own. StoryLoop is free for 3 stories
              a month, then NZ$21 or A$19. A general chatbot is free, but nothing checks what it writes about a child.
            </p>
            <p className="mt-3 text-base text-ink-600">
              Six options below, with who can buy each and the prices each company publishes. We make StoryLoop, so we have
              linked every other company&apos;s own page for you to check.
            </p>
          </>
        }
      >
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/signup" className="btn-primary justify-center" data-track="ai_tools_try_free">
            Try StoryLoop free
          </Link>
          <Link href="#compared" className="btn-secondary justify-center">
            See all six compared
          </Link>
        </div>
      </GuideHero>

      <GuideSection id="compared" kicker={`Prices checked ${PRICES_CHECKED}`} title="Six AI options for learning stories">
        <ul className="grid gap-4">
          {TOOLS.map((tool) => (
            <li key={tool.name} className="rounded-3xl border border-clay-100 bg-white p-5">
              <h3 className="font-display text-xl font-bold text-ink-900">{tool.name}</h3>
              <dl className="mt-3 grid gap-x-6 gap-y-3 text-base sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-ink-500">Who can buy it</dt>
                  <dd className="mt-0.5 leading-relaxed text-ink-700">{tool.buyer}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-ink-500">Price</dt>
                  <dd className="mt-0.5 leading-relaxed text-ink-700">{tool.price}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-ink-500">What the AI does</dt>
                  <dd className="mt-0.5 leading-relaxed text-ink-700">{tool.ai}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider text-ink-500">Where the story lives</dt>
                  <dd className="mt-0.5 leading-relaxed text-ink-700">{tool.lives}</dd>
                </div>
              </dl>
              {tool.note && <p className="mt-3 text-sm italic text-ink-500">{tool.note}</p>}
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="which" tone="white" kicker="Our recommendation" title="Which one fits you">
        <p>
          <strong>Your centre already pays for Storypark or Educa, with the AI add-on switched on.</strong> Use it. The story
          is written where it will be published, and families see it in the app they already have.
        </p>
        <p>
          <strong>Your centre uses Storypark or Educa, but has not bought the AI.</strong> This is most educators. You cannot
          switch the add-on on yourself, so the choice is a general chatbot or a tool you buy for yourself. StoryLoop was built
          for exactly this: write and check the story, then paste it into your centre&apos;s platform as usual. See{" "}
          <Link href="/works-alongside" className="font-semibold text-clay-700 underline">how it works alongside Storypark</Link>.
        </p>
        <p>
          <strong>You run an Australian service and want one platform for everything.</strong> One Child includes AI writing
          help in a flat price by approved places, from A$19 a month for up to 50 places.
        </p>
        <p>
          <strong>You are a centre choosing AI for the whole team.</strong> Compare the price model as well as the features:
          per child (Storypark, Kinderloop), per approved places (One Child) or per team (StoryLoop centres, from NZ$109 or A$99
          a month for 10 educators with any number of children). Work each one out against your own roll.
        </p>
      </GuideSection>

      <GuideSection id="checklist" kicker="Before you choose" title="Six questions to ask any AI tool">
        <ul className="grid gap-4">
          {CHECKS.map(([question, body]) => (
            <li key={question} className="rounded-3xl border border-clay-100 bg-white p-5">
              <h3 className="font-display text-lg font-bold text-ink-900">{question}</h3>
              <p className="mt-1 text-base leading-relaxed text-ink-600">{body}</p>
            </li>
          ))}
        </ul>
      </GuideSection>

      <GuideSection id="limits" tone="cream" kicker="In fairness" title="Where StoryLoop falls short">
        <p>
          StoryLoop is for writing, checking and sharing learning stories. It does not host a family photo and video feed,
          family logins, enrolments, attendance or messaging, so it sits alongside your centre&apos;s platform rather than
          replacing it. It does not post into Storypark or Educa for you: you copy the finished story across, which is
          deliberate, because nothing should reach families without an educator reading it first.
        </p>
        <p>
          It is also a small, independent company: Leo builds it in Christchurch and reads every email. We publish how
          accurate the drafts are, including the weak spots, in the{" "}
          <Link href="/accuracy" className="font-semibold text-clay-700 underline">accuracy report</Link>.
        </p>
      </GuideSection>

      <GuideSection id="faq" title="Questions educators ask">
        <GuideFaq items={FAQS} />
      </GuideSection>

      <GuideSources sources={SOURCES} />
      <GuideCta heading="Try StoryLoop free on your own note" />
      <RelatedGuides links={[RELATED.vsStorypark, RELATED.alongside, RELATED.safety, RELATED.accuracy, RELATED.examples, RELATED.template]} />
    </GuidePage>
  );
}
