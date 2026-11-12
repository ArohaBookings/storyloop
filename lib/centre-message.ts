/**
 * The ready-made message an educator sends their manager from "Get your centre
 * on board" (components/app/CentreReferralCard.tsx).
 *
 * 13 Nov 2026: it asks to try StoryLoop for the room, says what it is being
 * used for right now (end-of-year summaries and statements), gives the free
 * period in lib/centre-offer.ts's words, and says finished stories copy into
 * whatever the centre already uses. It names no other product, promises no
 * result, and stays under 120 words (tests/leader-offer.test.ts counts them).
 */
export const CENTRE_MESSAGE_MAX_WORDS = 120;

export function CENTRE_MESSAGE(shareUrl: string, founding: boolean, freeFor: string) {
  return `Hi,

Could we try StoryLoop for our room? I have been writing my learning stories with it, and right now I am using it for the end-of-year summaries and transition statements, drafted from the notes we already have. I check every line before anything goes out.

The centre plan covers the whole team. It is ${freeFor} with no card needed${founding ? ", and the first ten centres then pay half for three months" : ""}. Finished stories copy into whatever we already use in one tap.

Here are the details: ${shareUrl}

Happy to show you what I have done with it.`;
}
