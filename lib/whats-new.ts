/**
 * Release notes shown once per user in the What's New card.
 *
 * Bump WHATS_NEW_VERSION when there is something genuinely worth interrupting
 * someone for. Changing it re-shows the card once to everyone; leaving it alone
 * means nobody is bothered again. Keep the list short: this is a courtesy, not
 * a changelog dump.
 */
export const WHATS_NEW_VERSION = "2026-07";

export type WhatsNewItem = {
  icon: "quill" | "shield" | "voice" | "guides" | "refresh";
  title: string;
  body: string;
};

export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
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
    title: "Your words, kept exactly",
    body: "A child's quoted words now stay precisely as you wrote them, spelling and all. How a two-year-old actually said it is the evidence.",
  },
  {
    icon: "guides",
    title: "Guides for educators",
    body: "Plain-English writing on learning stories, Te Whāriki and EYLF, and cutting documentation time. Free to read, no signup.",
  },
];
