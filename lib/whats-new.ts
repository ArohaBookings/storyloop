/**
 * Release notes shown once per user in the What's New card.
 *
 * The version records which release a user first acknowledged. Once any version
 * has been seen, the card stays dismissed for that user.
 */
export const WHATS_NEW_VERSION = "2026-07";

export function shouldShowWhatsNew(seenVersion: string | null | undefined) {
  return !seenVersion;
}

export type WhatsNewItem = {
  icon: "quill" | "shield" | "voice" | "guides" | "refresh" | "today" | "family" | "centre" | "review";
  title: string;
  body: string;
};

export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
  {
    icon: "today",
    title: "Today Loop",
    body: "Capture a real moment in seconds, see up to three useful follow-up prompts, then turn it into a story, hold it for planning, or archive it.",
  },
  {
    icon: "quill",
    title: "Quill, your writing assistant",
    body: "Highlight any line and tell Quill what to change in your own words. It rewrites just that line and leaves the rest of your story untouched.",
  },
  {
    icon: "refresh",
    title: "Improving a story is free",
    body: "Redrafting a story you already wrote never uses one of your monthly stories, even on the free plan.",
  },
  {
    icon: "shield",
    title: "Quality, privacy and evidence checks",
    body: "Every draft shows its evidence anchors, assumptions, curriculum fit, educator checks, quality score, and privacy flags before you share it.",
  },
  {
    icon: "family",
    title: "Family and continuity loop",
    body: "Create family-ready packs, translations, home questions, and follow-up stories while carrying whānau aspirations and replies forward.",
  },
  {
    icon: "centre",
    title: "Planning and centre visibility",
    body: "Learning Threads, Documentation Radar, room planning briefs, centre voice controls, export packs, and ROI signals now connect the work after a story.",
  },
  {
    icon: "review",
    title: "Reviews you control",
    body: "Educators can leave a review from Support. It stays private until an admin publishes it, then appears with only a first name and last initial.",
  },
  {
    icon: "guides",
    title: "Guides for educators",
    body: "Plain-English writing on learning stories, Te Whāriki and EYLF, and cutting documentation time. Free to read, no signup.",
  },
];
