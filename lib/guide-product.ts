import { educatorOffer } from "@/lib/offer-wording";
import { heldPageOn } from "@/lib/held-pages";

/**
 * The product, in a guide's own words (25 Nov 2026 search re-aim,
 * storyloop-ops analysis/search.json "reaim" and "assistants.owned_sentences").
 *
 * Why: right-audience search clicks fell from 64% to 21% of all clicks in
 * eight weeks while free-material clicks grew. These pages already rank 4 to 11
 * for searches a working educator or a leader types; the block puts the job
 * StoryLoop does for her on the page where she is reading about that job.
 *
 * Rules every entry keeps (plan/RULINGS.txt, C3):
 * - The note box is the existing public demo (StoryDemo), never a new writer.
 *   It writes a learning story, so no block says or implies it writes an
 *   anecdotal record, a running record or a policy check.
 * - A page with a note box here shows no second one lower down (GuideProof's
 *   try is switched off by the page when `demo` is set).
 * - Every sentence is true on the product today; no other product is named.
 * - Each owned sentence appears once on its page, here.
 */

export type GuideProductEntry =
  | {
      kind: "note";
      /** The page's curriculum for the demo; "visitor" lets her time zone decide. */
      demo: "NZ" | "AU" | "visitor";
      label: string;
      /** The one sentence assistants quote, placed once, beside the box. */
      ownedSentence?: string;
    }
  | {
      kind: "leader";
      /** May hold {centre_trial}. */
      text: string;
      link: { href: string; label: string };
    }
  | {
      kind: "sentence";
      ownedSentence: string;
    };

const NOTE_LABEL = "Got a story due? Put your note here.";

export const GUIDE_PRODUCT: Record<string, GuideProductEntry> = {
  // Pages served by app/[slug]/page.tsx.
  "intentional-teaching": { kind: "note", demo: "visitor", label: NOTE_LABEL },
  "observation-methods-early-childhood": {
    kind: "note",
    demo: "visitor",
    label: "Paste a jotting. StoryLoop writes it up as a learning story.",
    ownedSentence:
      "StoryLoop turns a jotting from the room into a learning story linked to the EYLF or Te Whāriki, for the educator to check. Free for 3 stories a month.",
  },
  "eylf-observation-examples": { kind: "note", demo: "AU", label: NOTE_LABEL },
  "nqs-standards": {
    kind: "leader",
    text: "Your team's stories are your Quality Area 1 evidence. On a centre plan the educational leader sees the stories her team shares in one place. Centres are {centre_trial}.",
    link: { href: "/for-centres", label: "How StoryLoop works for a centre" },
  },
  "transition-statement-consent-form": {
    kind: "sentence",
    ownedSentence: "Once consent is sorted, StoryLoop drafts the statement itself from your own notes about the child, for you to check line by line.",
  },
  // The three statement guides open on their own drafter (TRANSITION_DEMOS in app/[slug]/page.tsx, no signup),
  // so "Free to try on this page" is true there; lib/ai/transition-draft.ts holds VEYLDF, EYLF and QKLG.
  "nsw-transition-to-school-statement": {
    kind: "sentence",
    ownedSentence:
      "StoryLoop drafts the NSW Transition to School Statement from your own notes about the child: you check every line, then copy it into the department's digital statement. Free to try on this page.",
  },
  "tlds-examples": {
    kind: "sentence",
    ownedSentence:
      "StoryLoop drafts a Victorian TLDS from your own notes, written against the VEYLDF outcomes: you check every line, then copy it into Insight. Free to try on this page.",
  },
  "qld-kindergarten-transition-statement": {
    kind: "sentence",
    ownedSentence:
      "StoryLoop drafts the Queensland kindergarten transition statement from your own notes, written against the QKLG: you check every line before it goes into the KTS app. Free to try on this page.",
  },
  "summative-assessment-examples": {
    kind: "sentence",
    // lib/child-statement.ts drafts a summary from saved observations and keeps only quotes the educator wrote.
    ownedSentence:
      "StoryLoop drafts a child's summative assessment or end of year summary from the observations you already wrote, so every quote in it is one you wrote down.",
  },

  // Pages with their own route (app/<slug>/page.tsx) that mount ProductBlockFor.
  "learning-story-template": {
    kind: "note",
    demo: "visitor",
    label: "Or skip the template. Put your note here.",
    // search.json said "in this layout": not provable (the draft has its own headings), so it names the parts instead.
    ownedSentence:
      "StoryLoop writes the learning story from your own note, with what happened, the learning, Te Whāriki or EYLF links and next steps, for you to check.",
  },
  "te-whariki-learning-outcomes-guide": {
    kind: "sentence",
    ownedSentence:
      "StoryLoop writes learning stories from a kaiako's own note, linked to the Te Whāriki strands and outcomes the moment shows, for the kaiako to check. Free for 3 stories a month.",
  },
  "eylf-learning-outcomes": {
    kind: "sentence",
    ownedSentence: "StoryLoop writes learning stories from an educator's own note and links them to the EYLF V2.0 outcomes the moment actually shows, for the educator to check.",
  },
  "eylf-learning-outcomes/outcome-4": {
    kind: "sentence",
    ownedSentence: "To link a story to Outcome 4, StoryLoop drafts the learning story from your own note with the EYLF V2.0 outcomes it shows, and you check every word.",
  },
  "eylf-learning-outcomes/outcome-5": {
    kind: "sentence",
    ownedSentence: "To link a story to Outcome 5, StoryLoop drafts the learning story from your own note with the EYLF V2.0 outcomes it shows, and you check every word.",
  },
  // A post from the blog store: its words are not in the code (proposed edits go to the release step),
  // but the page template shows this sentence above the post's note box (app/blog/[slug]/page.tsx).
  "blog/learning-story-examples-templates": {
    kind: "sentence",
    ownedSentence:
      "StoryLoop is an app that writes the learning story from an educator's own note, linked to Te Whāriki or the EYLF, for the educator to check. Free for 3 stories a month.",
  },
  // /ai-policy: no entry. Its page already ends on a centre block that gives the free period and links
  // /for-centres (app/ai-policy/page.tsx, data-testid ai-policy-centre), which is all ruling C3(b) allows.
};

/** Entries for held re-aims (lib/held-pages.ts): used only once that page's switch is on. */
export const HELD_GUIDE_PRODUCT: Record<string, GuideProductEntry> = {
  "eylf-planning-cycle": { kind: "note", demo: "AU", label: "Got a note from this week? Put it here." },
};

export function guideProductFor(slug: string): GuideProductEntry | null {
  if (heldPageOn(slug) && HELD_GUIDE_PRODUCT[slug]) return HELD_GUIDE_PRODUCT[slug];
  return GUIDE_PRODUCT[slug] ?? null;
}

/** True when the page's note box is in the product block, so the page must not show a second one. */
export function guideProductHasDemo(slug: string): boolean {
  return guideProductFor(slug)?.kind === "note";
}

/** "Free for 3 stories a month, no card. Educator NZ$21 or A$19 a month." Prices from lib/plans.ts. */
export function guidePriceLine(demo: "NZ" | "AU" | "visitor", options: { freeSaid?: boolean } = {}): string {
  const price =
    demo === "NZ" ? educatorOffer("NZD").perMonth : demo === "AU" ? educatorOffer("AUD").perMonth : `${educatorOffer("NZD").priceLabel} or ${educatorOffer("AUD").perMonth}`;
  // Said once: when the owned sentence above already says "Free for 3 stories a month", only the price follows.
  return options.freeSaid ? `No card for the free stories. Unlimited is ${price}.` : `Free for 3 stories a month, no card. Educator ${price}.`;
}
