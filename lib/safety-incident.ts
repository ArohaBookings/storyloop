// "bite/bites/biting" are unambiguous, but bare "bit" is far more often benign
// ("a bit of water", "a bit upset", "a little bit"), so it is NOT a direct
// trigger. Real past-tense "bit <someone>" is caught by the targeted pattern.
const DIRECT_PHYSICAL_SAFETY_PATTERN =
  /\b(punch(?:ed|es|ing)?|bit(?:e|es|ing)|scratch(?:ed|es|ing)?|slap(?:ped|s|ping)?|shov(?:e|ed|es|ing)|hurt(?:s|ing)?|injur(?:ed|y|ies)|fight(?:ing)?|unsafe|aggressive)\b/i;
const TARGETED_HIT_KICK_PATTERN =
  /\b(hit(?:s|ting)?|kicked?|kick(?:s|ing)?|bit)\s+(?:[A-Z][a-z]+|another child|a child|the child|him|her|them|peer|friend|educator|teacher)\b/;

// Proximity matters: a hit in one sentence and the word "upset" three sentences
// later are probably unrelated. Requiring them within ~100 characters of each
// other keeps this honest in both directions.
const LOCAL_HIT_KICK_SAFETY_PATTERN =
  /(?:\b(?:hit(?:s|ting)?|kicked?|kick(?:s|ing)?)\b[^.!?\n]{0,100}\b(?:didn'?t like|did not like|unacceptable|not safe|unsafe|hurt|cry(?:ing)?|cried|upset|angry|mad|annoyed|frustrated|stop|conflict|argument|fight|rough|physical)\b|\b(?:unsafe|hurt|cry(?:ing)?|cried|upset|angry|mad|annoyed|frustrated|conflict|argument|fight|rough|physical)\b[^.!?\n]{0,100}\b(?:hit(?:s|ting)?|kicked?|kick(?:s|ing)?)\b)/i;

// Pushing a PERSON is a safety moment on its own, with no other cue needed.
// It was previously treated as ordinary play unless a context word happened to
// appear, so "Sam pushed Josh" was written up as an exploration story with a
// cheerful title. Pushing an OBJECT (a trolley, a door, a block) still reads as
// play because only person-like targets match.
const TARGETED_PUSH_PATTERN =
  /\b(?:push(?:ed|es|ing)?|shov(?:e|ed|es|ing))\s+(?:o(?:ff|f|n(?:to)?)\s+)?(?:[A-Z][a-z]+|another child|a child|the child|him|her|them|his friend|her friend|peer|friend|educator|teacher)\b/;

// Educators type notes in a hurry and in lower case, so "sam pushed off josh"
// has no capital to key on and no emotion word to fall back to. "pushed off"
// followed by anything that is not a determiner is a person in practice;
// objects read as "pushed off the shelf" or "pushed off his shoes".
const LOWERCASE_PUSHED_OFF_PATTERN =
  /\b(?:push(?:ed|es|ing)?|shov(?:e|ed|es|ing))\s+o(?:ff|f)\s+(?!the\b|a\b|an\b|his\b|her\b|their\b|its\b|my\b|our\b|from\b|and\b|it\b)[a-z]{2,}/i;

const BENIGN_KICKING_MOVEMENT_PATTERN = /\bkick(?:ed|s|ing)?\s+(?:his|her|their|both)?\s*(?:legs?|feet)\b/gi;
// "rough note" appears in our own product copy, so it must never read as force.
const BENIGN_ROUGH_WRITING_PATTERN = /\brough\s+(?:note|draft|observation|text|copy|version)\b/gi;
const PUSH_PULL_PATTERN = /\b(push(?:ed|es|ing)?|grab(?:bed|s|bing)?|rough)\b/i;

// "mad" was missing, which is the word educators most often use for a young
// child's anger, so a real push incident could read as ordinary play.
const SAFETY_CONTEXT_PATTERN =
  /\b(didn'?t like|did not like|unacceptable|not safe|unsafe|hurt|cry(?:ing)?|cried|upset|angry|mad|annoyed|frustrated|snatch(?:ed|ing)?|stop|no\b|conflict|argument|fight|rough|physical|body)\b/i;

export function hasPhysicalSafetyIncident(text: string) {
  if (!text.trim()) return false;
  const incidentText = text
    .replace(BENIGN_KICKING_MOVEMENT_PATTERN, "")
    .replace(BENIGN_ROUGH_WRITING_PATTERN, "");
  if (DIRECT_PHYSICAL_SAFETY_PATTERN.test(incidentText)) return true;
  if (TARGETED_HIT_KICK_PATTERN.test(incidentText)) return true;
  if (TARGETED_PUSH_PATTERN.test(incidentText)) return true;
  if (LOWERCASE_PUSHED_OFF_PATTERN.test(incidentText)) return true;
  if (LOCAL_HIT_KICK_SAFETY_PATTERN.test(incidentText)) return true;
  return PUSH_PULL_PATTERN.test(incidentText) && SAFETY_CONTEXT_PATTERN.test(incidentText);
}
