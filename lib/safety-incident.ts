const DIRECT_PHYSICAL_SAFETY_PATTERN =
  /\b(punch(?:ed|es|ing)?|hit(?:s|ting)?|kicked?|kick(?:s|ing)?|bit(?:e|es|ing)?|scratch(?:ed|es|ing)?|slap(?:ped|s|ping)?|shov(?:e|ed|es|ing)|hurt(?:s|ing)?|injur(?:ed|y|ies)|fight(?:ing)?|unsafe|aggressive)\b/i;
const PUSH_PULL_PATTERN = /\b(push(?:ed|es|ing)?|grab(?:bed|s|bing)?|rough)\b/i;
const SAFETY_CONTEXT_PATTERN =
  /\b(didn'?t like|did not like|unacceptable|not safe|unsafe|hurt|cry(?:ing)?|cried|upset|angry|stop|no\b|conflict|argument|fight|rough|physical|body)\b/i;

export function hasPhysicalSafetyIncident(text: string) {
  if (!text.trim()) return false;
  if (DIRECT_PHYSICAL_SAFETY_PATTERN.test(text)) return true;
  return PUSH_PULL_PATTERN.test(text) && SAFETY_CONTEXT_PATTERN.test(text);
}
