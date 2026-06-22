const BLOCKED_NAME_WORDS = new Set([
  "Aotearoa",
  "Australia",
  "During",
  "Educator",
  "EYLF",
  "Family",
  "Later",
  "Learning",
  "Mana",
  "Story",
  "StoryLoop",
  "The",
  "Then",
  "Today",
  "When",
  "Whanau",
  "Whāriki",
]);

function cleanNameCandidate(value: string) {
  const cleaned = value.trim().replace(/[^A-Za-z'-]/g, "");
  if (cleaned.length < 2 || BLOCKED_NAME_WORDS.has(cleaned)) return "";
  return cleaned;
}

export function inferPrimaryChildName(observations: string) {
  const text = observations.trim();
  if (!text) return "";

  const ageMatch = text.match(/\b([A-Z][a-z][A-Za-z'-]*)\s*\(\s*(?:\d{1,2}\s*(?:yo|years?)?|\d{1,2})\s*\)/);
  const ageName = ageMatch ? cleanNameCandidate(ageMatch[1] ?? "") : "";
  if (ageName) return ageName;

  const observedMatch = text.match(/\b(?:noticed|observed|saw|watched|supported|asked|helped)\s+([A-Z][a-z][A-Za-z'-]*)\b/);
  const observedName = observedMatch ? cleanNameCandidate(observedMatch[1] ?? "") : "";
  if (observedName) return observedName;

  const candidates = (text.match(/\b[A-Z][a-z][A-Za-z'-]*\b/g) ?? [])
    .map(cleanNameCandidate)
    .filter(Boolean);

  if (candidates.length === 0) return "";

  const scores = new Map<string, number>();
  for (const candidate of candidates) {
    scores.set(candidate, (scores.get(candidate) ?? 0) + 1);
  }

  return Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}
