/**
 * Release notes shown once per user in the What's New card.
 *
 * The version records which release a user acknowledged. Bumping it shows the
 * card again, once, to people who have already used StoryLoop.
 */
export const WHATS_NEW_VERSION = "2026-11d";

/**
 * The browser's "seen it" flag, per account and per version of the notes. It
 * once had no version in it, so a browser that saw ANY earlier card counted as
 * having seen every later one, and the new card never reached most existing
 * accounts (found 12 Nov 2026).
 */
export function whatsNewDismissedKey(userId: string, version: string) {
  return `storyloop-whats-new-dismissed:${userId}:${version}`;
}

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
// RELEASE STEP: set this to the day the notes actually go live. It decides who
// counts as an existing user (accounts made before it) and starts the 21 days.
export const WHATS_NEW_PUBLISHED = "2026-11-13";

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
export function shouldShowWhatsNew(
  seenVersion: string | null | undefined,
  storiesWritten: number,
  now: Date = new Date(),
  /**
   * When the account was created. Somebody who joined AFTER these notes were
   * published has nothing to be told is new: all of it is. Until 10 Nov 2026 a
   * new educator who wrote their first story met this card, with six features
   * on it, on the very next page. Leave it out to keep the old behaviour.
   */
  accountCreatedAt?: string | Date | null,
) {
  if (storiesWritten < WHATS_NEW_MIN_STORIES) return false;
  if (!whatsNewIsFresh(now)) return false;
  if (accountCreatedAt) {
    const created = accountCreatedAt instanceof Date ? accountCreatedAt.getTime() : Date.parse(accountCreatedAt);
    const published = Date.parse(`${WHATS_NEW_PUBLISHED}T00:00:00+12:00`);
    if (Number.isFinite(created) && created >= published) return false;
  }
  return seenVersion !== WHATS_NEW_VERSION;
}

export type WhatsNewItem = {
  icon: "quill" | "shield" | "voice" | "photo" | "guides" | "refresh" | "today" | "family" | "centre" | "review" | "group" | "card" | "download";
  title: string;
  body: string;
  /** Where to go and try it. */
  href?: string;
  /** Shown as a small tag when the feature is not on every plan. */
  plan?: string;
};

/**
 * The November 2026 release, second card (the big update staged 11 Nov).
 *
 * New since the 10 Nov card: the statement page, which now does a whole class
 * in one sitting (Next child), and Download everything on History. The 10 Nov
 * items stay because that card was live for a day and most people never saw
 * it, and whoever did sees this one once and never again (the card marks the
 * account the moment it appears: WhatsNewModal). "The year in one tap" made
 * room (12 Nov 2026). Newest first, six at most.
 */
export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
  {
    icon: "guides",
    title: "Statements for the whole class, one child after another",
    body:
      "Statement or summary, in the menu: paste what you know about one child and get it back outcome by outcome. Then tap Next child. The notes, name and draft clear, your document and curriculum stay, and you paste the next one. Two a month on the free plan; Educator covers as many as you need.",
    href: "/statement",
  },
  {
    icon: "download",
    title: "Download everything you have written",
    body:
      "On the History page: every story you have saved, in one file. Choose a text file to read and keep, or a spreadsheet file (CSV) with the date, the child, your note, the story, outcomes and next steps. Your stories are yours.",
    href: "/history",
  },
  {
    icon: "family",
    title: "Share a story with the family, and hear back",
    body:
      "Share with family now sits beside Copy on every story. Make a private link for Mum, Dad or Nana: no app and no password. They read the stories you share, with the child's own words left exactly as said, and what they write back comes to you.",
    href: "/history",
  },
  {
    icon: "voice",
    title: "Write or say your note in your own language",
    body:
      "Think in Tagalog, Hindi, Mandarin, Samoan or anything else? Jot or say the note that way, then tap \"Put it into English for me to check\" under the note. Anything a child said is left exactly as they said it, with its meaning in brackets.",
    href: "/generate",
  },
  {
    icon: "review",
    title: "Send this story to your leader",
    body:
      "Send to my leader sits beside Copy, and every story in History has Send this story to your leader. It makes a private link for your head teacher or mentor: they see your note beside the story and answer in about two minutes, with no account. It lasts 14 days and you can cancel it.",
    href: "/history",
  },
  {
    // Kept from September on purpose: it is the one item that pays the reader.
    icon: "centre",
    title: "Get your centre on board",
    body:
      "If your centre subscribes using your code, you get three months of your own plan free. On the free plan they are held for you and applied the moment you start one. Centres now start with at least 30 days free and no card.",
    href: "/support",
  },
];
