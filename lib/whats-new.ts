/**
 * Release notes shown once per user in the What's New card.
 *
 * The version records which release a user acknowledged. Bumping it shows the
 * card again, once, to people who have already used StoryLoop.
 */
export const WHATS_NEW_VERSION = "2026-11b";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/**
 * The month the card names, read from the version. The card said "What arrived
 * in September" for two months after September, over November's features
 * (found 10 Nov 2026): the month was typed into the page and nobody changed it.
 */
export function whatsNewMonth(version: string = WHATS_NEW_VERSION): string {
  return MONTHS[Number(version.slice(5, 7)) - 1] ?? "the last few weeks";
}

/**
 * The day these notes were published (NZ). Bump it together with the version
 * whenever the notes are rewritten.
 */
export const WHATS_NEW_PUBLISHED = "2026-11-10";

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
  icon: "quill" | "shield" | "voice" | "photo" | "guides" | "refresh" | "today" | "family" | "centre" | "review" | "group" | "card";
  title: string;
  body: string;
  /** Where to go and try it. */
  href?: string;
  /** Shown as a small tag when the feature is not on every plan. */
  plan?: string;
};

/**
 * The November 2026 release (10 Nov).
 *
 * Only what is new since October, per the rule above: a card is not a
 * changelog. October's features are all still in the sidebar.
 */
export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
  {
    icon: "review",
    title: "Ask your leader to check a story",
    body:
      "On any saved story, make a private link and send it to your head teacher or mentor. They see your note beside the story and answer in about two minutes, with no account. The link opens that one story for 14 days and you can cancel it.",
    href: "/history",
  },
  {
    icon: "voice",
    title: "Room mode: talk through a whole session",
    body:
      "Up to 15 minutes in one go. You get every word back to check, a name it nearly heard is one tap to fix, and then it splits by child. It is your voice note, and the sound is not kept.",
    href: "/room",
  },
  {
    icon: "today",
    title: "The year in one tap",
    body:
      "Every child on one page, from this year's stories: who is ready for a summary or transition statement, the family keepsake, and a handover sheet to print for next year.",
    href: "/year",
  },
  {
    icon: "photo",
    title: "Photo of my notes",
    body:
      "Jotted it on paper? On the story page, tap Photo of my notes and take a picture of the page. The words land in the box as if you had typed them, with anything it could not read marked for you to fix. Notes only, never children: the photo is read and then discarded.",
    href: "/generate",
  },
  {
    icon: "quill",
    title: "Write the story to the child",
    body:
      "Under Style and extras you can now choose \"To the child\", for stories that read \"Ruby, you poured\" instead of \"Ruby poured\". Leave it off and nothing changes.",
    href: "/generate",
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
