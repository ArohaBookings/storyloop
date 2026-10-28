import type { PrintableKey } from "@/lib/printables";
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
  "australia-eylf-learning-stories": ["eylfStories", "eylf", "template", "examples", "transition", "generator"],
  "eylf-planning-cycle": ["nqs13", "summative", "eylf", "intentional", "reflection", "nextSteps"],
  "intentional-teaching": ["eylfPrinciples", "planning", "eylf", "nextSteps", "reflection", "examples"],
  "critical-reflection-early-childhood": ["eylfPrinciples", "nqs13", "planning", "intentional", "observation", "template"],
  "nqs-standard-1-3-assessment-and-planning": ["planning", "summative", "reflection", "eylf", "transition", "template"],
  "acecqa-documentation-guidance": ["nqs13", "planning", "eylf", "observation", "template", "safety"],
  "assessment-and-rating-evidence": ["nqs13", "planning", "reflection", "eylf", "centres", "template"],
  "te-whariki-principles": ["teWhariki", "strands", "teWhStories", "teWhPdf", "template", "examples"],
  "te-whariki-learning-stories": ["teWhariki", "teWhPrinciples", "strands", "template", "examples", "nextSteps"],
  "te-whariki-pdf": ["teWhariki", "teWhPrinciples", "strands", "teWhStories", "template", "examples"],
  "nz-learning-stories": ["teWhStories", "teWhariki", "teWhPrinciples", "template", "examples", "generator"],
  "ero-early-childhood-regulation-2026": ["teWhStories", "teWhariki", "teWhPrinciples", "template", "safety", "centres"],
  "observation-methods-early-childhood": ["whatIs", "template", "examples", "preschoolExamples", "nextSteps", "howLong"],
  "how-long-should-a-learning-story-take": ["whatIs", "template", "examples", "observation", "generator", "educators"],
  "learning-story-examples-preschool": ["examples", "template", "nextSteps", "whatIs", "eylf", "teWhariki"],
  "learning-story-next-steps-examples": ["examples", "preschoolExamples", "template", "whatIs", "intentional", "eylf"],
  "learning-story-generator": ["examples", "preschoolExamples", "nextSteps", "template", "accuracy", "safety"],
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
  return keys.map((key) => RELATED[key]).filter((link) => link.href !== `/${slug}`).slice(0, 6);
}
