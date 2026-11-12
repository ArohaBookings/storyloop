/**
 * "Download everything" on the History page (12 Nov 2026): every story an
 * account has saved, in one file, so "your stories are yours" is true before
 * anyone has to ask. Pure formatting only; the route (app/api/stories/export)
 * does the signing in, the reading and the counting.
 *
 * Two files:
 * - text: readable in anything, one story after another, with the date, the
 *   child's first name as saved, the note, the story, outcomes and next steps;
 * - CSV: one row per story for a spreadsheet. UTF-8 with a byte order mark so
 *   macron and accented names open correctly in Excel, CRLF rows, every field
 *   quoted, and cells that a spreadsheet would run as a formula made inert.
 */

export type ExportStory = {
  created_at: string | null;
  child_name: string | null;
  age_group?: string | null;
  observations: string | null;
  story_text: string | null;
  outcomes: string[] | null;
  next_steps: string[] | null;
  location?: string | null;
};

export type ExportFormat = "txt" | "csv";

export function exportFormat(value: string | null | undefined): ExportFormat | null {
  return value === "txt" || value === "csv" ? value : null;
}

/** The zone a story's date is read in: where it was written for. */
export function zoneForLocation(location: string | null | undefined): string {
  switch ((location ?? "").toUpperCase()) {
    case "NZ":
      return "Pacific/Auckland";
    case "UK":
      return "Europe/London";
    case "IE":
      return "Europe/Dublin";
    default:
      return "Australia/Sydney";
  }
}

function parts(iso: string | null, timeZone: string) {
  const at = iso ? new Date(iso) : null;
  if (!at || Number.isNaN(at.getTime())) return null;
  const get = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-NZ", { timeZone, ...options }).format(at);
  return { day: get({ day: "numeric" }), month: get({ month: "long" }), year: get({ year: "numeric" }), mm: get({ month: "2-digit" }), dd: get({ day: "2-digit" }) };
}

/** "12 November 2026", in the story's own zone. */
export function readableDate(iso: string | null, timeZone: string): string {
  const p = parts(iso, timeZone);
  return p ? `${p.day} ${p.month} ${p.year}` : "Date not recorded";
}

/** "2026-11-12", which a spreadsheet sorts properly. */
export function isoDate(iso: string | null, timeZone: string): string {
  const p = parts(iso, timeZone);
  return p ? `${p.year}-${p.mm}-${p.dd}` : "";
}

const clean = (value: string | null | undefined) => (value ?? "").replace(/\r\n?/g, "\n").trim();
const list = (values: string[] | null | undefined) => (values ?? []).map((v) => clean(v)).filter(Boolean);
const nameOf = (story: ExportStory) => clean(story.child_name) || "No name saved";

const RULE = "=".repeat(48);

export function storiesToText(stories: ExportStory[], downloadedAt: Date = new Date(), timeZone = "Australia/Sydney"): string {
  const count = stories.length === 1 ? "1 story" : `${stories.length} stories`;
  const lines = [
    "StoryLoop: every story you have saved",
    `Downloaded ${readableDate(downloadedAt.toISOString(), timeZone)}. ${count}, newest first.`,
    "",
  ];
  for (const story of stories) {
    const zone = zoneForLocation(story.location);
    lines.push(RULE, `${readableDate(story.created_at, zone)}. ${nameOf(story)}${clean(story.age_group) ? ` (${clean(story.age_group)})` : ""}`, RULE, "");
    lines.push("YOUR NOTE", clean(story.observations) || "(no note saved)", "");
    lines.push("THE STORY", clean(story.story_text) || "(empty)", "");
    const outcomes = list(story.outcomes);
    if (outcomes.length) lines.push("OUTCOMES", ...outcomes.map((o) => `- ${o}`), "");
    const next = list(story.next_steps);
    if (next.length) lines.push("NEXT STEPS", ...next.map((n) => `- ${n}`), "");
    lines.push("");
  }
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

/**
 * One CSV field. Quoted always, quotes doubled, and a leading = + - @ tab or
 * carriage return gets an apostrophe in front so a spreadsheet shows the text
 * instead of running it (a note can start "- Mia..." or "=" by accident; a
 * crafted one could do worse).
 */
export function csvField(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export const CSV_HEADERS = ["Date", "Child", "Age group", "Your note", "Story", "Outcomes", "Next steps"];

export function storiesToCsv(stories: ExportStory[]): string {
  const rows = [CSV_HEADERS.map(csvField).join(",")];
  for (const story of stories) {
    rows.push(
      [
        isoDate(story.created_at, zoneForLocation(story.location)),
        clean(story.child_name),
        clean(story.age_group),
        clean(story.observations),
        clean(story.story_text),
        list(story.outcomes).join("; "),
        list(story.next_steps).join("; "),
      ]
        .map(csvField)
        .join(","),
    );
  }
  return `﻿${rows.join("\r\n")}\r\n`;
}

/** storyloop-stories-2026-11-12.csv */
export function exportFileName(format: ExportFormat, at: Date = new Date(), timeZone = "Australia/Sydney"): string {
  return `storyloop-stories-${isoDate(at.toISOString(), timeZone)}.${format}`;
}

export const EXPORT_CONTENT_TYPE: Record<ExportFormat, string> = {
  txt: "text/plain; charset=utf-8",
  csv: "text/csv; charset=utf-8",
};
