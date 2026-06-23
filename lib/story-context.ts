const BLOCKED_NAME_WORDS = new Set([
  // Framework / app / structural words
  "Aotearoa",
  "Australia",
  "Educator",
  "EYLF",
  "Family",
  "Learning",
  "Mana",
  "Story",
  "StoryLoop",
  "Whanau",
  "Whāriki",
  // Pronouns (the common false positives)
  "He",
  "She",
  "It",
  "They",
  "We",
  "You",
  "I",
  "His",
  "Her",
  "Hers",
  "Him",
  "Them",
  "Their",
  "Theirs",
  "Our",
  "Ours",
  "My",
  "Mine",
  "Your",
  "Yours",
  "Its",
  "Me",
  "Us",
  // Articles / conjunctions / prepositions
  "A",
  "An",
  "As",
  "At",
  "By",
  "For",
  "From",
  "In",
  "Into",
  "Of",
  "On",
  "Or",
  "Nor",
  "So",
  "To",
  "With",
  "And",
  "But",
  "The",
  // Demonstratives / location
  "This",
  "That",
  "These",
  "Those",
  "There",
  "Here",
  "Inside",
  "Outside",
  // Time / sequence words that often start a sentence
  "Today",
  "Yesterday",
  "Tomorrow",
  "Now",
  "Then",
  "Next",
  "First",
  "Last",
  "Once",
  "While",
  "When",
  "During",
  "Later",
  "After",
  "Before",
  "Soon",
  "Morning",
  "Afternoon",
  "Evening",
  "Night",
  "Meanwhile",
  "Eventually",
  "Finally",
  "Suddenly",
  "Afterwards",
  "Afterward",
  // Quantifiers / common sentence starters
  "Both",
  "Each",
  "Every",
  "Some",
  "All",
  "Also",
  "Even",
  "Just",
  "Still",
  "Together",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Another",
  "Other",
  // Days
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  // Generic child descriptors (not names)
  "Baby",
  "Babies",
  "Bub",
  "Child",
  "Children",
  "Toddler",
  "Toddlers",
  "Infant",
  "Infants",
  "Kid",
  "Kids",
  "Boy",
  "Boys",
  "Girl",
  "Girls",
]);

function cleanNameCandidate(value: string) {
  const cleaned = value.trim().replace(/[^A-Za-z'-]/g, "");
  if (cleaned.length < 2 || BLOCKED_NAME_WORDS.has(cleaned)) return "";
  return cleaned;
}

// True when this occurrence sits at the start of a sentence (or the text),
// where capitalised words are usually not names ("It fell", "She asked").
function isSentenceStart(text: string, index: number) {
  const before = text.slice(0, index).replace(/\s+$/, "");
  return before === "" || /[.!?]["')\]]?$/.test(before);
}

export function inferPrimaryChildName(observations: string) {
  const text = observations.trim();
  if (!text) return "";

  // Strongest signal: an age in parentheses, e.g. "Ruby (3)" or "Noah (3yo)".
  const ageMatch = text.match(/\b([A-Z][a-z][A-Za-z'-]*)\s*\(\s*(?:\d{1,2}\s*(?:yo|years?)?|\d{1,2})\s*\)/);
  const ageName = ageMatch ? cleanNameCandidate(ageMatch[1] ?? "") : "";
  if (ageName) return ageName;

  // Strong signal: an educator verb followed by a name, e.g. "noticed Ari".
  const observedMatch = text.match(/\b(?:noticed|observed|saw|watched|supported|asked|helped)\s+([A-Z][a-z][A-Za-z'-]*)\b/);
  const observedName = observedMatch ? cleanNameCandidate(observedMatch[1] ?? "") : "";
  if (observedName) return observedName;

  // Fallback: most frequent capitalised candidate, weighting mid-sentence
  // appearances higher than sentence-initial ones (which are usually not names).
  const scores = new Map<string, number>();
  const firstIndex = new Map<string, number>();
  const wordRegex = /\b[A-Z][a-z][A-Za-z'-]*\b/g;
  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(text)) !== null) {
    const candidate = cleanNameCandidate(match[0]);
    if (!candidate) continue;
    const weight = isSentenceStart(text, match.index) ? 1 : 2;
    scores.set(candidate, (scores.get(candidate) ?? 0) + weight);
    if (!firstIndex.has(candidate)) firstIndex.set(candidate, match.index);
  }

  if (scores.size === 0) return "";

  return (
    Array.from(scores.entries()).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (firstIndex.get(a[0]) ?? 0) - (firstIndex.get(b[0]) ?? 0);
    })[0]?.[0] ?? ""
  );
}

// Names of other children mentioned in an observation, excluding the focus child.
// Uses the same blocked-word and sentence-start guards as name inference so that
// capitalised sentence-starters ("After", "Suddenly") are never mistaken for names.
export function extractOtherChildNames(observations: string, childName?: string, limit = 2): string[] {
  const text = observations.trim();
  if (!text) return [];
  const child = childName?.trim().toLowerCase();
  const seen = new Set<string>();
  const result: string[] = [];
  const wordRegex = /\b[A-Z][a-z][A-Za-z'-]*\b/g;
  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(text)) !== null) {
    const candidate = cleanNameCandidate(match[0]);
    if (!candidate) continue;
    // Sentence-initial words are usually not names; skip them to avoid false positives.
    if (isSentenceStart(text, match.index)) continue;
    const key = candidate.toLowerCase();
    if (key === child || seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
    if (result.length >= limit) break;
  }
  return result;
}
