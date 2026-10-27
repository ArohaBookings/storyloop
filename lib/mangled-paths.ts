import { SEO_PAGE_SLUGS } from "@/lib/seo-pages";

/**
 * Links pasted into Facebook posts sometimes lose the space after them, so the
 * next word becomes part of the address: /examplesIf,
 * /learning-story-templateStoryLoop, /ero-early-childhood-regulation-2026Disclosure.
 * Five such links from the 29 Sep 2026 posts returned 404, so anyone who
 * tapped them saw an error page (found 19 Oct 2026). A path that is a real
 * page plus stray trailing text now goes to that page.
 */

// Top-level pages that are their own routes rather than [slug] guides.
const ROUTE_PAGES = [
  "about", "accuracy", "ai-policy", "blog", "documentation-time-calculator", "examples",
  "eylf-learning-outcomes", "features", "for-educators", "for-families", "learning-story-data", "learning-story-template",
  "mana-aoturoa-exploration", "mana-atua-wellbeing", "mana-reo-communication", "mana-tangata-contribution",
  "mana-whenua-belonging", "privacy", "resources", "review-readiness-check", "safety", "te-whariki-learning-outcomes-guide",
  "terms", "try", "what-is-a-learning-story", "signup", "login",
];

const KNOWN = Array.from(new Set([...ROUTE_PAGES, ...SEO_PAGE_SLUGS]))
  // Longest first, so /eylf-learning-outcomes-guide-ish text prefers the longer page.
  .sort((a, b) => b.length - a.length);

/** The page a mangled top-level path was meant to be, or null. */
export function recoverMangledPath(slug: string): string | null {
  let value = slug;
  try {
    value = decodeURIComponent(slug);
  } catch {
    /* keep the raw value */
  }
  const lower = value.toLowerCase();
  for (const known of KNOWN) {
    if (!lower.startsWith(known) || lower.length === known.length) continue;
    const rest = value.slice(known.length);
    // A real deeper or sibling page would continue with "-" or "/"; stray
    // text glued on from a post starts with a letter or punctuation.
    if (/^[-/]/.test(rest) || rest.length > 40) continue;
    return `/${known}`;
  }
  return null;
}
