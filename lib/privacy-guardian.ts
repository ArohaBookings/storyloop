import { hasPhysicalSafetyIncident } from "@/lib/safety-incident";

export type PrivacyGuardianIssue = {
  id: string;
  label: string;
  severity: "info" | "review" | "high";
  detail: string;
};

export type PrivacyGuardianResult = {
  status: "clear" | "review" | "high";
  issues: PrivacyGuardianIssue[];
  checks: {
    noDiagnosisLanguage: boolean;
    noSensitiveFamilyDetail: boolean;
    noUnsupportedClaims: boolean;
    noExcessIdentifiers: boolean;
    noPhysicalSafetyIncident: boolean;
  };
};

// An adult describing physically punishing or aggressively handling a child.
// This must never be quietly dropped from a family-facing story: the educator
// needs a loud, honest flag pointing at their safeguarding process instead.
// Deliberately case-sensitive on the object so capitalised names match but
// ordinary nouns ("we hit pause", "I kicked the ball") do not.
const ADULT_CONDUCT_PATTERN =
  /\b(?:[Ii]|[Ww]e|[Ee]ducator|[Tt]eacher|[Kk]aiako|[Nn]anny\s+\w+|[Ss]taff)\s+(?:then\s+)?(?:(?:kicked|hit|smacked|slapped|shook|dragged)\s+(?:him|her|them|the\s+(?:child|baby|toddler|boy|girl)|[A-Z][a-z]+|\w+'?s\s+(?:ass|arse|bum|butt|backside|bottom|arm|wrist|hair))|(?:yelled|screamed|swore)\s+at\s+\S+)/;

const DIAGNOSIS_LANGUAGE = /\b(autis(?:m|tic)|adhd|trauma|anxiety|depression|diagnos(?:e|ed|is)|sensory processing disorder|developmental delay)\b/i;
const FAMILY_DETAIL = /\b(custody|court|violence|abuse|neglect|medication|medical|therapy|social worker|financial|immigration|separation|divorce)\b/i;
const UNSUPPORTED_CERTAINTY = /\b(will always|never|proves that|clearly has|is behind|is advanced|gifted|delayed|problem behaviour)\b/i;
const EXCESS_IDENTIFIERS = /\b(address|phone|surname|last name|date of birth|dob|passport|client number)\b/i;

function issue(id: string, label: string, severity: PrivacyGuardianIssue["severity"], detail: string): PrivacyGuardianIssue {
  return { id, label, severity, detail };
}

export function runPrivacyGuardian(input: {
  observation?: string | null;
  story?: string | null;
  familyText?: string | null;
}): PrivacyGuardianResult {
  const combined = [input.observation, input.story, input.familyText].filter(Boolean).join("\n");
  const issues: PrivacyGuardianIssue[] = [];

  if (ADULT_CONDUCT_PATTERN.test(input.observation ?? "")) {
    issues.push(issue(
      "adult-conduct",
      "Adult conduct described in the note",
      "high",
      "Part of this note describes an adult action that must not appear in a family-facing story and was not included in the draft. Review it against your service's incident and safeguarding process before going further."
    ));
  }

  if (DIAGNOSIS_LANGUAGE.test(combined)) {
    issues.push(issue(
      "diagnosis-language",
      "Diagnosis or clinical language",
      "high",
      "Review whether this wording belongs in a family-facing story. Avoid diagnosing or labelling unless it is approved centre language."
    ));
  }

  if (FAMILY_DETAIL.test(combined)) {
    issues.push(issue(
      "sensitive-family-detail",
      "Sensitive family or health detail",
      "high",
      "Remove unnecessary private context before sharing. Keep the story focused on observed learning."
    ));
  }

  if (UNSUPPORTED_CERTAINTY.test(combined)) {
    issues.push(issue(
      "unsupported-certainty",
      "Unsupported certainty",
      "review",
      "Softening absolute claims protects educator judgement and keeps the story evidence-based."
    ));
  }

  if (EXCESS_IDENTIFIERS.test(combined)) {
    issues.push(issue(
      "excess-identifiers",
      "Extra identifiers",
      "review",
      "Avoid surnames, addresses, dates of birth, phone numbers, or other details not needed for the learning story."
    ));
  }

  if (hasPhysicalSafetyIncident(combined)) {
    issues.push(issue(
      "physical-safety-incident",
      "Physical safety or conflict moment",
      "review",
      "Review this alongside your service behaviour, injury, or incident process before sharing. Keep wording factual, avoid blame, and remove other children's names if needed."
    ));
  }

  const high = issues.some((item) => item.severity === "high");
  return {
    status: high ? "high" : issues.length ? "review" : "clear",
    issues,
    checks: {
      noDiagnosisLanguage: !DIAGNOSIS_LANGUAGE.test(combined),
      noSensitiveFamilyDetail: !FAMILY_DETAIL.test(combined),
      noUnsupportedClaims: !UNSUPPORTED_CERTAINTY.test(combined),
      noExcessIdentifiers: !EXCESS_IDENTIFIERS.test(combined),
      noPhysicalSafetyIncident: !hasPhysicalSafetyIncident(combined),
    },
  };
}
