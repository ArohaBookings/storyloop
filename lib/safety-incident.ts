// "bite/bites/biting" are unambiguous, but bare "bit" is far more often benign
// ("a bit of water", "a bit upset", "a little bit"), so it is NOT a direct
// trigger. Real past-tense "bit <someone>" is caught by the targeted pattern.
const DIRECT_PHYSICAL_SAFETY_PATTERN =
  /\b(punch(?:ed|es|ing)?|bit(?:e|es|ing)|scratch(?:ed|es|ing)?|slap(?:ped|s|ping)?|shov(?:e|ed|es|ing)|hurt(?:s|ing)?|injur(?:ed|y|ies)|fight(?:ing)?|unsafe|aggressive)\b/i;
const TARGETED_HIT_KICK_PATTERN =
  /\b(hit(?:s|ting)?|kicked?|kick(?:s|ing)?|bit)\s+(?:[A-Z][a-z]+|another child|a child|the child|him|her|them|peer|friend|educator|teacher)\b/;
const HIT_KICK_PATTERN = /\b(hit(?:s|ting)?|kicked?|kick(?:s|ing)?)\b/i;
const BENIGN_KICKING_MOVEMENT_PATTERN = /\bkick(?:ed|s|ing)?\s+(?:his|her|their|both)?\s*(?:legs?|feet)\b/gi;
const PUSH_PULL_PATTERN = /\b(push(?:ed|es|ing)?|grab(?:bed|s|bing)?|rough)\b/i;
const SAFETY_CONTEXT_PATTERN =
  /\b(didn'?t like|did not like|unacceptable|not safe|unsafe|hurt|cry(?:ing)?|cried|upset|angry|stop|no\b|conflict|argument|fight|rough|physical|body)\b/i;

export function hasPhysicalSafetyIncident(text: string) {
  if (!text.trim()) return false;
  const incidentText = text.replace(BENIGN_KICKING_MOVEMENT_PATTERN, "");
  if (DIRECT_PHYSICAL_SAFETY_PATTERN.test(incidentText)) return true;
  if (TARGETED_HIT_KICK_PATTERN.test(incidentText)) return true;
  if (HIT_KICK_PATTERN.test(incidentText) && SAFETY_CONTEXT_PATTERN.test(incidentText)) return true;
  return PUSH_PULL_PATTERN.test(incidentText) && SAFETY_CONTEXT_PATTERN.test(incidentText);
}
