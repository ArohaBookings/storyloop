import type { PrintableKey } from "./PrintableCard";
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
};
// "Keep reading" links at the foot of each guide, by topic. Guides had no links
// to their neighbours, so a reader who finished one had nowhere to go but back
// to Google, and search engines saw no clusters. Six per page, never itself.
export const SLUG_RELATED: Record<string, RelatedKey[]> = {
  "eylf-principles-and-practices": ["eylf", "eylfV2", "intentional", "reflection", "planning", "template"],
  "eylf-v2-changes": ["eylf", "eylfPrinciples", "eylfStories", "intentional", "template", "examples"],
  "eylf-learning-stories": ["eylf", "eylfPrinciples", "template", "examples", "planning", "nextSteps"],
  "australia-eylf-learning-stories": ["eylfStories", "eylf", "template", "examples", "transition", "aiTools"],
  "eylf-planning-cycle": ["nqs13", "eylf", "intentional", "reflection", "nextSteps", "template"],
  "intentional-teaching": ["eylfPrinciples", "planning", "eylf", "nextSteps", "reflection", "examples"],
  "critical-reflection-early-childhood": ["eylfPrinciples", "nqs13", "planning", "intentional", "observation", "template"],
  "nqs-standard-1-3-assessment-and-planning": ["planning", "reflection", "eylf", "eylfPrinciples", "transition", "template"],
  "acecqa-documentation-guidance": ["nqs13", "planning", "eylf", "observation", "template", "safety"],
  "assessment-and-rating-evidence": ["nqs13", "planning", "reflection", "eylf", "centres", "template"],
  "te-whariki-principles": ["teWhariki", "strands", "teWhStories", "teWhPdf", "template", "examples"],
  "te-whariki-learning-stories": ["teWhariki", "teWhPrinciples", "strands", "template", "examples", "nextSteps"],
  "te-whariki-pdf": ["teWhariki", "teWhPrinciples", "strands", "teWhStories", "template", "examples"],
  "nz-learning-stories": ["teWhStories", "teWhariki", "teWhPrinciples", "template", "examples", "aiTools"],
  "ero-early-childhood-regulation-2026": ["teWhStories", "teWhariki", "teWhPrinciples", "template", "safety", "centres"],
  "observation-methods-early-childhood": ["whatIs", "template", "examples", "preschoolExamples", "nextSteps", "howLong"],
  "how-long-should-a-learning-story-take": ["whatIs", "template", "examples", "observation", "chatgpt", "educators"],
  "learning-story-examples-preschool": ["examples", "template", "nextSteps", "whatIs", "eylf", "teWhariki"],
  "learning-story-next-steps-examples": ["examples", "preschoolExamples", "template", "whatIs", "intentional", "eylf"],
  "chatgpt-for-learning-stories": ["safety", "aiTools", "accuracy", "template", "examples", "whatIs"],
  "learning-story-generator": ["examples", "template", "accuracy", "safety", "aiTools", "whatIs"],
  "transition-to-school-statement": ["tlds", "endOfYear", "eylf", "template", "examples", "eylfPrinciples"],
  "tlds-examples": ["transition", "endOfYear", "eylf", "intentional", "template", "examples"],
  "end-of-year-learning-summary": ["transition", "tlds", "nextSteps", "template", "examples", "eylf"],
  pricing: ["centres", "educators", "vsStorypark", "aiTools", "accuracy", "safety"],
};
export const DEFAULT_RELATED: RelatedKey[] = ["template", "whatIs", "examples", "eylf", "teWhariki", "accuracy"];
export function relatedFor(slug: string) {
  const keys = SLUG_RELATED[slug] ?? DEFAULT_RELATED;
  return keys.map((key) => RELATED[key]).filter((link) => link.href !== `/${slug}`).slice(0, 6);
}
