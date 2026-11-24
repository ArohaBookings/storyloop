/**
 * The statement guides' first desktop screen (25 Nov 2026, B1): the form each
 * guide is about, and one plain sentence of what StoryLoop does with it,
 * beside the drafter. Every sentence is true of the drafter on that page: it
 * drafts from the notes she pastes, and she checks the wording and enters it
 * in the official form herself. Lane C may import this for answer blocks,
 * never edit it.
 */
export type StatementGuideForm = { formName: string; ownedSentence: string };

export const STATEMENT_GUIDE_FORMS: Record<string, StatementGuideForm> = {
  "transition-to-school-statement": {
    formName: "Transition to school statement",
    ownedSentence: "StoryLoop drafts your transition to school statement from your own notes. You check it, then copy it into your state's official form.",
  },
  "tlds-examples": {
    formName: "Transition Learning and Development Statement (TLDS)",
    ownedSentence: "StoryLoop drafts your TLDS from your own notes. You check it, then copy it into the Online TLDS.",
  },
  "nsw-transition-to-school-statement": {
    formName: "NSW Transition to School Digital Statement",
    ownedSentence: "StoryLoop drafts your Transition to School Digital Statement from your own notes. You check it, then copy it into the official statement.",
  },
  "qld-kindergarten-transition-statement": {
    formName: "Kindergarten Transition Statement (KTS)",
    ownedSentence: "StoryLoop drafts your Kindergarten Transition Statement from your own notes. You check it, then copy it into the KTS app.",
  },
  "end-of-year-learning-summary": {
    formName: "End-of-year learning summary",
    ownedSentence: "StoryLoop drafts your end-of-year learning summary from your own notes. You check it, then copy it into your report.",
  },
};

export function statementGuideForm(slug: string): StatementGuideForm | null {
  return STATEMENT_GUIDE_FORMS[slug] ?? null;
}
