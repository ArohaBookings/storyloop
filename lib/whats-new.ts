/**
 * Release notes shown once per user in the What's New card.
 *
 * The version records which release a user acknowledged. Bumping it shows the
 * card again, once, to people who have already used StoryLoop.
 */
export const WHATS_NEW_VERSION = "2026-09";

/** Stories somebody must have written before a release note is worth showing. */
export const WHATS_NEW_MIN_STORIES = 1;

/**
 * Whether to show the card.
 *
 * It was disabled outright on 2026-09-16 because it fired for everybody who had
 * never dismissed it, which put a modal in front of a brand-new educator before
 * they had written anything. Signup to first story is the funnel step worth
 * protecting above all others, so nothing goes in front of it.
 *
 * Re-enabled with that lesson kept rather than forgotten: a release note is
 * only shown to somebody who has actually written a story. A person who has
 * not used the product yet does not need to hear what changed in it.
 */
export function shouldShowWhatsNew(seenVersion: string | null | undefined, storiesWritten: number) {
  if (storiesWritten < WHATS_NEW_MIN_STORIES) return false;
  return seenVersion !== WHATS_NEW_VERSION;
}

export type WhatsNewItem = {
  icon: "quill" | "shield" | "voice" | "guides" | "refresh" | "today" | "family" | "centre" | "review";
  title: string;
  body: string;
  /** Where to go and try it. */
  href?: string;
  /** Shown as a small tag when the feature is not on every plan. */
  plan?: string;
};

/**
 * The September 2026 release.
 *
 * Everything before this was removed rather than archived. A release note that
 * accumulates is a changelog, and nobody reads a changelog in a modal; what
 * earns the interruption is the handful of things that are new since they last
 * looked.
 */
export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
  {
    icon: "voice",
    title: "Children can tell you themselves",
    body:
      "One big button a three-year-old can press to talk about their own work. They hear it back, you write down what they said, and it is kept exactly as they said it. The recording never leaves the browser and is never stored.",
    href: "/voices",
    plan: "Educator",
  },
  {
    icon: "centre",
    title: "A code beside your wall display",
    body:
      "Print a small code next to a display. A family scans it at pickup and reads the learning behind what they are looking at, on their own phone, in their own language. No app, no sign-in, and no names, photographs or dates on the page.",
    href: "/wall",
    plan: "Educator",
  },
  {
    icon: "family",
    title: "Before the door opens",
    body:
      "At pickup, the specific true thing next to each child's name instead of “he had a good day”. Not a script, and never invented: where nothing was recorded it says so rather than dressing it up.",
    href: "/pickup",
    plan: "Educator",
  },
  {
    icon: "today",
    title: "What a child takes with them",
    body:
      "One file for a family to keep: who their child is as a learner, in their own words and their educators'. It opens on any computer, offline, with no account, and keeps working whatever happens to StoryLoop.",
    href: "/children",
    plan: "Educator",
  },
  {
    icon: "review",
    title: "The evidence a review visit asks for",
    body:
      "Coverage for every child, where the planning cycle closes, where reflection and family voice are recorded, and the gaps named first. Counted from stories your team already wrote.",
    href: "/evidence",
    plan: "Centre",
  },
  {
    icon: "refresh",
    title: "What you came back to",
    body:
      "Every platform stores the plan. This is what happened when you went back to it: the next steps you revisited and the ones you decided were worth keeping.",
    href: "/practice",
    plan: "Educator",
  },
  {
    icon: "shield",
    title: "Get your centre on board",
    body:
      "If your centre subscribes using your code, you get three months of your own plan free. On the free plan they are held for you and applied the moment you start one. There is a message on the Support page you can send your manager without writing it yourself.",
    href: "/support",
  },
  {
    icon: "guides",
    title: "A free check for directors",
    body:
      "Ten honest questions about your documentation, answered in two minutes, with nothing sent anywhere. It shows the gaps a review conversation would surface, in the order worth fixing them.",
    href: "/review-readiness-check",
  },
];
