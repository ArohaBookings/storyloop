/**
 * Release notes shown once per user in the What's New card.
 *
 * The version records which release a user acknowledged. Bumping it shows the
 * card again, once, to people who have already used StoryLoop.
 */
export const WHATS_NEW_VERSION = "2026-10";

/**
 * The day these notes were published (NZ). Bump it together with the version
 * whenever the notes are rewritten.
 */
export const WHATS_NEW_PUBLISHED = "2026-09-23";

/**
 * How long a set of notes stays news. After this the card is not shown to
 * anyone, however long they have been away: "What arrived in September" read
 * in November is old news, not a welcome back. Leo, 28 Oct 2026: it should not
 * show again unless it has been updated with the new stuff.
 */
export const WHATS_NEW_SHOW_DAYS = 21;

/** Stories somebody must have written before a release note is worth showing. */
export const WHATS_NEW_MIN_STORIES = 1;

/** Whether the current notes are still recent enough to show. */
export function whatsNewIsFresh(now: Date = new Date()) {
  const published = Date.parse(`${WHATS_NEW_PUBLISHED}T00:00:00+12:00`);
  if (Number.isNaN(published)) return false;
  const elapsed = now.getTime() - published;
  return elapsed >= 0 && elapsed < WHATS_NEW_SHOW_DAYS * 86_400_000;
}

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
 * not used the product yet does not need to hear what changed in it. And only
 * while the notes are recent (WHATS_NEW_SHOW_DAYS).
 */
export function shouldShowWhatsNew(seenVersion: string | null | undefined, storiesWritten: number, now: Date = new Date()) {
  if (storiesWritten < WHATS_NEW_MIN_STORIES) return false;
  if (!whatsNewIsFresh(now)) return false;
  return seenVersion !== WHATS_NEW_VERSION;
}

export type WhatsNewItem = {
  icon: "quill" | "shield" | "voice" | "guides" | "refresh" | "today" | "family" | "centre" | "review" | "group" | "card";
  title: string;
  body: string;
  /** Where to go and try it. */
  href?: string;
  /** Shown as a small tag when the feature is not on every plan. */
  plan?: string;
};

/**
 * The October 2026 release.
 *
 * Only what is new since September, per the rule above: a card is not a
 * changelog. September's features are all still in the sidebar.
 */
export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
  {
    icon: "group",
    title: "One moment, many children",
    body:
      "Write a group moment once and get a story for each child. StoryLoop splits your note by child using only your own sentences, you check each part, then every child's story is written with the same checks as any other.",
    href: "/group",
  },
  {
    icon: "today",
    title: "Your month at a glance",
    body:
      "The dashboard now shows the time StoryLoop gave back this month, which children have had a story in the last 30 days, and the parts of the curriculum you have been writing to.",
    href: "/dashboard",
  },
  {
    icon: "review",
    title: "How often it gets it wrong, in public",
    body:
      "Every change to how stories are written is now tested on the same 24 notes before it ships, and the results are published, including what is still being improved.",
    href: "/accuracy",
  },
  {
    icon: "card",
    title: "No surprises at checkout",
    body:
      "Checkout now shows StoryLoop's name, the exact date of the first charge and how to avoid it. Leave part way and Billing tells you plainly that nothing was charged.",
    href: "/billing",
  },
  {
    icon: "shield",
    title: "Safer passwords",
    body:
      "Passwords known from data breaches are now refused when you sign up or reset one. The check never sends your password anywhere: only the first five characters of a scrambled version of it.",
  },
  {
    // Kept from September on purpose: it is the one item that pays the reader.
    icon: "centre",
    title: "Get your centre on board",
    body:
      "If your centre subscribes using your code, you get three months of your own plan free. On the free plan they are held for you and applied the moment you start one. Centres now start with 30 days free and no card.",
    href: "/support",
  },
];
