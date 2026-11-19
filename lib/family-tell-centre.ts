/**
 * Tell your centre (19 Nov 2026): a family who enjoys the stories can tell
 * their centre, from their own phone, that StoryLoop exists.
 *
 * How it works, and what it never does:
 *  - The educator switches it on for one family link at a time. It is off by
 *    default: an educator using StoryLoop on her own may be outside her
 *    centre's AI or device policy, and a parent praising it must never land
 *    her in trouble. Off means no line, no button and no event on their page.
 *  - On, the family's page shows one line and one button. The button opens
 *    the parent's OWN share sheet or mail app with the note below, which they
 *    can change or delete before sending, to whoever they choose.
 *  - StoryLoop sends nothing, fills in no address and collects nothing about
 *    the family. The note names no child, no educator and links no story: only
 *    that centres can try StoryLoop free, and where.
 * Pure: safe in the browser, and tested without one.
 */

/**
 * HELD (release decision, 19 Nov 2026: until three real family links exist;
 * there are none yet). Off, the educator sees no switch, the family page shows
 * no line, the switch's API answers 404 and nothing reads or writes
 * family_links.tell_centre, so the release works whether or not migration
 * 20261119_family_tell_centre.sql has reached production.
 *
 * To switch it on: apply that migration to production first, then set true
 * here (the one place).
 */
export const TELL_CENTRE_ON = false;

export const TELL_CENTRE_ADDRESS = "https://storyloop.space/for-centres";
export const TELL_CENTRE_SUBJECT = "Learning stories";

/**
 * The note a parent may send. "Free" without a date on purpose: a sent message
 * cannot follow the calendar, and every centre's start is free (lib/centre-offer.ts).
 */
export function tellCentreMessage(): string {
  return `Hi, our child's teacher shares learning stories written with StoryLoop. Could the rest of the centre use it too? Centres can try it free: ${TELL_CENTRE_ADDRESS}`;
}

/** A mail link with no recipient: the parent chooses who it goes to. Pure. */
export function tellCentreMailto(message: string = tellCentreMessage()): string {
  return `mailto:?subject=${encodeURIComponent(TELL_CENTRE_SUBJECT)}&body=${encodeURIComponent(message)}`;
}

/**
 * True when a message carries nothing private: not the child's name, not the
 * educator's name, no link to the family page or its key, no email address.
 * Pure: the test runs it over the real note with real names.
 */
export function tellCentreMessageIsClean(message: string, names: { child?: string | null; educator?: string | null }): boolean {
  const lower = message.toLowerCase();
  for (const name of [names.child, names.educator]) {
    const first = (name ?? "").trim().split(/\s+/)[0]?.toLowerCase();
    if (first && first.length > 1 && new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(lower)) return false;
  }
  if (/\/family\b|#[a-z0-9_-]{8,}|\/check\b|\/w\//i.test(message)) return false;
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(message)) return false;
  return true;
}
