/**
 * The statement guides' first desktop screen (25 Nov 2026, B1): the form each
 * guide is about, and one plain sentence of what StoryLoop does with it,
 * beside the drafter. Every sentence is true of the drafter on that page: it
 * drafts from the notes she pastes, and she checks the wording and enters it
 * in the official form herself. Lane C may import this for answer blocks,
 * never edit it.
 */
export type StatementGuideForm = {
  formName: string;
  ownedSentence: string;
  /**
   * B8 (25 Nov 2026): one plain line under the drafter that points the weekly
   * writer to the learning-story page for her country. Words only: the page
   * renders it as "<lead> <link> or <link>." and nothing else changes.
   */
  weekly: { lead: string; links: Array<{ href: string; label: string }> };
};

const EYLF_STORIES = { href: "/eylf-learning-stories", label: "EYLF learning stories from your notes" };
const TE_WHARIKI_STORIES = { href: "/te-whariki-learning-stories", label: "Te Whāriki" };
const AU_WEEKLY = { lead: "Writing learning stories every week too? See", links: [EYLF_STORIES] };

export const STATEMENT_GUIDE_FORMS: Record<string, StatementGuideForm> = {
  "transition-to-school-statement": {
    formName: "Transition to school statement",
    ownedSentence: "StoryLoop drafts your transition to school statement from your own notes. You check it, then copy it into your state's official form.",
    weekly: AU_WEEKLY,
  },
  "tlds-examples": {
    formName: "Transition Learning and Development Statement (TLDS)",
    ownedSentence: "StoryLoop drafts your TLDS from your own notes. You check it, then copy it into the Online TLDS (in Insight).",
    weekly: AU_WEEKLY,
  },
  "nsw-transition-to-school-statement": {
    formName: "NSW Transition to School Digital Statement",
    ownedSentence: "StoryLoop drafts your Transition to School Digital Statement from your own notes. You check it, then copy it into the department's digital statement.",
    weekly: AU_WEEKLY,
  },
  "qld-kindergarten-transition-statement": {
    formName: "Kindergarten Transition Statement (KTS)",
    ownedSentence: "StoryLoop drafts your Kindergarten Transition Statement from your own notes. You check it, then copy it into the KTS app.",
    weekly: AU_WEEKLY,
  },
  "end-of-year-learning-summary": {
    formName: "End-of-year learning summary",
    ownedSentence: "StoryLoop drafts your end-of-year learning summary from your own notes. You check it, then copy it into your report.",
    weekly: { lead: "Writing learning stories every week too? See", links: [TE_WHARIKI_STORIES, EYLF_STORIES] },
  },
};

export function statementGuideForm(slug: string): StatementGuideForm | null {
  return STATEMENT_GUIDE_FORMS[slug] ?? null;
}
