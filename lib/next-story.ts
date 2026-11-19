/**
 * The next story, offered right after the first (proposal C, 18 Nov 2026).
 *
 * 28 of the 62 accounts that wrote one story went on to write a second (45%),
 * and people pay right after their third. So once her first story is done and
 * she has taken it away (copied it, exported it, or saved an edit), one card
 * sits right under that story and offers the next one in a single tap: the
 * next moment for the same child, or another child. The tap empties the note
 * box she already has and puts her cursor in it. No pop-up, nothing in front
 * of the note box, and the note box itself is not changed.
 *
 * "First story" is read from the stories table, never from the profile's
 * story counter, which was left at zero for some early accounts (fault P11).
 */

export type NextStoryChoice = "same" | "another";

export type NextStoryOption = {
  choice: NextStoryChoice;
  label: string;
  primary: boolean;
};

export type NextStoryCard = {
  heading: string;
  line: string;
  options: NextStoryOption[];
};

/** A child's first name, short enough for a button, or "" (pure). */
export function firstNameForButton(childName: string | null | undefined): string {
  const first = String(childName ?? "").trim().split(/\s+/)[0] ?? "";
  // Letters, apostrophes and hyphens only: anything else is not a name to put on a button.
  if (!first || first.length > 20 || !/^[\p{L}][\p{L}'’-]*$/u.test(first)) return "";
  return first;
}

/**
 * Whether the card belongs under the story on screen (pure).
 *
 * - newAccount: the account had no story at all when the page opened, by the
 *   stories table.
 * - notesSoFar: how many different notes she has turned into stories on this
 *   page. Regenerating the same note is the same story; a second note means the
 *   first story is behind her.
 * - takenAway: she copied, exported or saved this story.
 * - started: she already tapped the card on this page.
 * - walled: a free-limit wall or the clarification questions are showing.
 */
export function shouldOfferNextStory(input: {
  newAccount: boolean;
  notesSoFar: number;
  hasStory: boolean;
  takenAway: boolean;
  started: boolean;
  walled: boolean;
}): boolean {
  return input.newAccount && input.notesSoFar === 1 && input.hasStory && input.takenAway && !input.started && !input.walled;
}

/**
 * What the card says (pure). The example story leads to one of her own; her own
 * story leads to the next moment for that child, or another child.
 */
export function nextStoryCard(input: { childName?: string | null; fromExample: boolean }): NextStoryCard {
  if (input.fromExample) {
    return {
      heading: "That's how it works.",
      line: "Now one of your own: a moment from today, in your words.",
      options: [{ choice: "another", label: "Write one from my room", primary: true }],
    };
  }
  const first = firstNameForButton(input.childName);
  if (!first) {
    return {
      heading: "Your first story is done.",
      line: "Got another moment from today? Write it while it's fresh.",
      options: [{ choice: "another", label: "Write the next one", primary: true }],
    };
  }
  return {
    heading: "Your first story is done.",
    line: "Got another moment from today? Write it while it's fresh.",
    options: [
      { choice: "same", label: `Next moment for ${first}`, primary: true },
      { choice: "another", label: "Another child", primary: false },
    ],
  };
}
