import type { PrintableKey } from "@/lib/printables";
import { liveLinks } from "@/lib/buyer-pages";
import { RELATED, type RelatedKey } from "./Guide";

/**
 * Which printables and "keep reading" links each guide in app/[slug] shows.
 * Kept out of the page so tests can check every key and link resolves.
 */
// Free one-page printables, right under the hero (14 Oct 2026). Google answers
// these searches in an AI Overview that lists the principles itself, so the
// page has to offer something the answer can't: the page to print. The search
// title promises it, so it must be the first thing a visitor sees.
export const SLUG_PRINTABLES: Record<string, PrintableKey[]> = {
  "eylf-principles-and-practices": ["eylfpp"],
  "eylf-v2-changes": ["eylfpp", "eylf"],
  "eylf-learning-stories": ["templateAu", "eylf"],
  "australia-eylf-learning-stories": ["templateAu", "eylf"],
  "te-whariki-principles": ["twps"],
  "te-whariki-pdf": ["twps", "tw"],
  "te-whariki-learning-stories": ["templateNz", "tw"],
  "nz-learning-stories": ["templateNz", "tw"],
  "learning-story-examples-nz": ["templateNz", "tw"],
  "learning-story-examples-eylf": ["templateAu", "eylf"],
};
// "Keep reading" links at the foot of each guide, by topic. Guides had no links
// to their neighbours, so a reader who finished one had nowhere to go but back
// to Google, and search engines saw no clusters. Six per page, never itself.
// Since 18 Nov 2026 the free guides nearest each page for buyers (lib/buyer-pages.ts) link to it.
// A list may name a seventh or eighth link after its six: it stands in while a page
// above it is held out of the release (lib/buyer-pages.ts HELD_BUYER_PAGES_ON), and is
// the link that page replaced, so a guide never shows fewer links than it did.
export const SLUG_RELATED: Record<string, RelatedKey[]> = {
  "eylf-principles-and-practices": ["eylf", "eylfV2", "intentional", "reflection", "planning", "template"],
  "eylf-v2-changes": ["eylf", "eylfPrinciples", "eylfStories", "intentional", "template", "examples"],
  "eylf-learning-stories": ["auExamples", "aiObservations", "eylf", "eylfPrinciples", "template", "examples"],
  "australia-eylf-learning-stories": ["eylfStories", "auExamples", "eylf", "template", "examples", "transition"],
  "eylf-planning-cycle": ["nqs13", "summative", "eylf", "intentional", "reflection", "leaderChecklist", "nextSteps"],
  "intentional-teaching": ["eylfPrinciples", "planning", "eylf", "nextSteps", "reflection", "aiEducators"],
  "critical-reflection-early-childhood": ["leaderChecklist", "assessment", "exceeding", "nqs13", "planning", "leaderCheck", "aiEducators", "eylfPrinciples", "intentional"],
  "nqs-standard-1-3-assessment-and-planning": ["leaderChecklist", "exceeding", "nqs", "planning", "summative", "reflection", "eylf", "transition"],
  "nqs-standards": ["leaderChecklist", "assessment", "exceeding", "nqs13", "planning", "reflection", "summative", "eylfObservations", "transition"],
  "acecqa-documentation-guidance": ["workload", "leaderChecklist", "nqs13", "planning", "eylf", "safety", "observation", "template"],
  "assessment-and-rating-evidence": ["leaderChecklist", "exceeding", "nqs13", "planning", "leaderCheck", "centres", "nqs", "reflection"],
  "te-whariki-principles": ["teWhariki", "strands", "teWhStories", "teWhPdf", "template", "aiPolicyNz"],
  "te-whariki-learning-stories": ["nzExamples", "teWhariki", "teWhPrinciples", "strands", "template", "nextSteps"],
  "te-whariki-pdf": ["teWhariki", "teWhPrinciples", "strands", "teWhStories", "template", "examples"],
  "nz-learning-stories": ["nzExamples", "teWhStories", "teWhariki", "teWhPrinciples", "template", "generator"],
  "learning-story-examples-eylf": ["eylfStories", "eylf", "eylfObservations", "preschoolExamples", "nextSteps", "template"],
  "learning-story-examples-nz": ["teWhStories", "teWhariki", "strands", "nextSteps", "template", "examples"],
  "ero-early-childhood-regulation-2026": ["workload", "aiPolicyNz", "teWhStories", "teWhariki", "safety", "centres", "teWhPrinciples"],
  "observation-methods-early-childhood": ["aiObservations", "aiEducators", "whatIs", "eylfObservations", "planning", "template", "examples"],
  "eylf-observation-examples": ["aiObservations", "auExamples", "eylf", "observation", "planning", "eylfStories", "template"],
  "how-long-should-a-learning-story-take": ["workload", "aiEducators", "whatIs", "template", "examples", "generator", "observation"],
  // 12 Nov 2026: the three answer pages, and the guides nearest each one that now lead to it.
  "learning-stories-in-family-languages": ["secondLanguage", "families", "whatIs", "askCentre", "safety", "centres", "examples"],
  "writing-learning-stories-english-second-language": ["familyLanguages", "howLong", "observation", "template", "examples", "generator"],
  "how-to-check-a-learning-story": ["leaderChecklist", "reflection", "nqs13", "centres", "safety", "accuracy", "planning"],
  "parent-friendly-learning-stories": ["familyLanguages", "families", "askCentre", "examples", "template", "whatIs", "nextSteps"],
  "for-centres": ["leaderChecklist", "leaderCheck", "workload", "safety", "accuracy", "examples", "nqs13", "reflection"],
  "learning-story-examples-preschool": ["examples", "auExamples", "template", "nextSteps", "eylf", "teWhariki"],
  "learning-story-next-steps-examples": ["examples", "preschoolExamples", "template", "whatIs", "intentional", "eylf"],
  "learning-story-generator": ["aiEducators", "aiObservations", "examples", "template", "accuracy", "safety"],
  "transition-to-school-statement": ["tlds", "nswTransition", "qldTransition", "consent", "summative", "endOfYear"],
  "tlds-examples": ["transition", "nswTransition", "qldTransition", "endOfYear", "eylf", "intentional"],
  "nsw-transition-to-school-statement": ["transition", "consent", "summative", "qldTransition", "tlds", "eylf"],
  "qld-kindergarten-transition-statement": ["transition", "consent", "nswTransition", "summative", "tlds", "eylf"],
  "transition-statement-consent-form": ["nswTransition", "qldTransition", "tlds", "transition", "summative", "endOfYear"],
  "end-of-year-learning-summary": ["summative", "transition", "tlds", "nextSteps", "template", "eylf"],
  "summative-assessment-examples": ["endOfYear", "nqs13", "eylf", "transition", "planning", "nextSteps"],
  pricing: ["centres", "educators", "generator", "examples", "accuracy", "safety"],
};
export const DEFAULT_RELATED: RelatedKey[] = ["template", "whatIs", "examples", "eylf", "teWhariki", "accuracy"];
export function relatedFor(slug: string) {
  const keys = SLUG_RELATED[slug] ?? DEFAULT_RELATED;
  // Never a link to a page held out of the release; the stand-ins after the six fill its place.
  return liveLinks(keys.map((key) => RELATED[key])).filter((link) => link.href !== `/${slug}`).slice(0, 6);
}
