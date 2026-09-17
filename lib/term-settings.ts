import { isJurisdiction, type Jurisdiction } from "@/lib/terms";

/**
 * An educator's term settings, read from profiles.term_settings.
 *
 * Defaults are chosen to be SAFE rather than clever. A service is assumed NOT to
 * follow school terms until the educator says it does, because assuming a
 * holiday that is not real would hide a quiet child, while assuming no holiday
 * only means a signal might appear during a real one.
 */
export type TermSettings = {
  jurisdiction: Jurisdiction;
  followsSchoolTerms: boolean;
  /** False until the educator has actually chosen, so the interface can ask. */
  configured: boolean;
};

export function parseTermSettings(raw: unknown, defaultFramework?: string | null): TermSettings {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const chosen = source.jurisdiction;
  if (isJurisdiction(chosen)) {
    return {
      jurisdiction: chosen,
      followsSchoolTerms: source.followsSchoolTerms === true,
      configured: true,
    };
  }
  // Nothing chosen yet. New Zealand has one national calendar, so the framework
  // is enough. Australia has eight, and guessing the wrong state would be worse
  // than asking, so it stays unconfigured with holidays switched off.
  return {
    jurisdiction: defaultFramework === "NZ" ? "NZ" : "NSW",
    followsSchoolTerms: false,
    configured: false,
  };
}

/** Validate a settings update from the browser. Returns null when invalid. */
export function validateTermSettingsUpdate(body: unknown): { jurisdiction: Jurisdiction; followsSchoolTerms: boolean } | null {
  if (!body || typeof body !== "object") return null;
  const source = body as Record<string, unknown>;
  if (!isJurisdiction(source.jurisdiction)) return null;
  if (typeof source.followsSchoolTerms !== "boolean") return null;
  return { jurisdiction: source.jurisdiction, followsSchoolTerms: source.followsSchoolTerms };
}

/** A missing column before the migration runs is "not available", not a crash. */
export function isMissingTermSettingsColumn(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  if (error.code === "42703") return true;
  return /term_settings/.test(error.message ?? "") && /does not exist|column/i.test(error.message ?? "");
}
