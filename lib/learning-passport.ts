import { matchDispositions } from "@/lib/term-weather";
import type { PackStory } from "@/lib/transition-pack";
import { describeProvenance, type Provenance } from "@/lib/child-voice";

/**
 * The learning passport: what a child takes with them when they leave.
 *
 * A child generates three or more years of documentation and then, on one day
 * in January, it stops. The school receives a one-page transition statement and
 * functionally nothing else, and everything the sector learned about that child
 * evaporates. This is the other thing: a record of who they are as a learner,
 * held by their family, that outlives the service, the platform and us.
 *
 * WHY IT IS A FILE AND NOT A LINK. A link is not family-held. A link needs our
 * servers to be up, our company to exist, and the school to trust a URL; worse,
 * a permanent address holding a named child's full learning history is the most
 * dangerous artifact this product could own. A file has none of those
 * properties. It opens on any computer, offline, in ten years, with nothing
 * installed and nobody signed in, and there is no address for anyone to guess.
 *
 * SELF-CONTAINED MEANS SELF-CONTAINED. No fonts, no images, no scripts, no
 * analytics, nothing fetched. A passport that phones home is not the family's,
 * and a passport that breaks when a CDN moves was never portable.
 *
 * It is also, deliberately, machine readable. The same document carries a JSON
 * payload describing the record in a documented shape, so a school system could
 * one day read it directly instead of a human retyping it. Formats become
 * standards by being useful first and specified second.
 *
 * ASSEMBLY, NOT GENERATION. Every line is copied from something already saved.
 * No model call, nothing invented, nothing paraphrased, and a child's own words
 * are never touched. See lib/transition-pack.ts, which prints the educator's
 * handover; this is the copy the family keeps.
 */

export const RECORD_FORMAT = "storyloop.learning-record";
export const RECORD_VERSION = 1;

export type PassportChild = {
  name: string;
  ageGroup: string | null;
  interests: string[] | null;
  homeLanguages: string[] | null;
  notes: string | null;
  developmentalFocus: string | null;
  whanauAspirations: string | null;
};

export type PassportOwnWords = { words: string; saidAt: string; provenance: Provenance };

export type LearningRecord = {
  format: typeof RECORD_FORMAT;
  version: typeof RECORD_VERSION;
  generatedAt: string;
  child: {
    name: string;
    ageGroup: string | null;
    homeLanguages: string[];
    interests: string[];
  };
  period: { from: string | null; to: string | null; storyCount: number };
  /** The child's first-person record. Nothing else in this sector has one. */
  ownWords: PassportOwnWords[];
  howTheyLearn: Array<{ disposition: string; seenIn: number; example: string | null }>;
  whatHelps: string[];
  familyHopes: string | null;
  familyVoice: Array<{ words: string; date: string }>;
  openNextSteps: string[];
  moments: Array<{ date: string; title: string | null; summary: string | null }>;
};

const MAX_MOMENTS = 8;
const MAX_OWN_WORDS = 10;
const MAX_FAMILY_VOICE = 5;
const MAX_NEXT_STEPS = 6;

const clean = (value: string | null | undefined) => (typeof value === "string" ? value.trim() : "");
const uniq = (values: Array<string | null | undefined>) =>
  [...new Set(values.map(clean).filter(Boolean))];

export function buildLearningRecord(input: {
  child: PassportChild;
  stories: PackStory[];
  ownWords: PassportOwnWords[];
  generatedAt: string;
}): LearningRecord {
  const stories = [...input.stories].sort((a, b) => a.date.localeCompare(b.date));

  // How they learn: dispositions that actually recur, with a real example. A
  // disposition seen once is an anecdote, and this record is read by somebody
  // deciding how to treat a child on their first day.
  const counts = new Map<string, { seenIn: number; example: string | null }>();
  for (const story of stories) {
    const named = uniq([...story.dispositions, ...matchDispositions(story.learningSummary ?? "")]);
    for (const disposition of named) {
      const current = counts.get(disposition) ?? { seenIn: 0, example: null };
      counts.set(disposition, {
        seenIn: current.seenIn + 1,
        example: current.example ?? (clean(story.learningSummary) || clean(story.title) || null),
      });
    }
  }
  const howTheyLearn = [...counts.entries()]
    .filter(([, value]) => value.seenIn >= 2)
    .map(([disposition, value]) => ({ disposition, ...value }))
    .sort((a, b) => b.seenIn - a.seenIn || a.disposition.localeCompare(b.disposition))
    .slice(0, 6);

  const openNextSteps = uniq(
    stories
      .flatMap((story) => story.nextSteps)
      .filter((step) => step.status !== "tried")
      .map((step) => step.text),
  ).slice(-MAX_NEXT_STEPS);

  const familyVoice = stories
    .filter((story) => clean(story.whanauVoice))
    .slice(-MAX_FAMILY_VOICE)
    .map((story) => ({ words: clean(story.whanauVoice), date: story.date }));

  // What helps: the practical knowledge a new teacher would otherwise spend a
  // term rediscovering, and the child would spend a term being misread.
  const whatHelps = uniq([input.child.notes, input.child.developmentalFocus])
    .flatMap((value) => value.split(/\n+/).map(clean).filter(Boolean))
    .slice(0, 6);

  const moments = stories
    .slice(-MAX_MOMENTS)
    .reverse()
    .map((story) => ({ date: story.date, title: clean(story.title) || null, summary: clean(story.learningSummary) || null }));

  return {
    format: RECORD_FORMAT,
    version: RECORD_VERSION,
    generatedAt: input.generatedAt,
    child: {
      name: clean(input.child.name) || "This child",
      ageGroup: clean(input.child.ageGroup) || null,
      homeLanguages: uniq(input.child.homeLanguages ?? []),
      interests: uniq(input.child.interests ?? []),
    },
    period: {
      from: stories[0]?.date ?? null,
      to: stories[stories.length - 1]?.date ?? null,
      storyCount: stories.length,
    },
    ownWords: [...input.ownWords]
      .sort((a, b) => a.saidAt.localeCompare(b.saidAt))
      .slice(-MAX_OWN_WORDS)
      .reverse(),
    howTheyLearn,
    whatHelps,
    familyHopes: clean(input.child.whanauAspirations) || null,
    familyVoice,
    openNextSteps,
    moments,
  };
}

/**
 * Escape text for HTML.
 *
 * This is a security boundary, not a formatting nicety. The passport is an
 * HTML document assembled from things people typed, and it is opened by a
 * teacher on a school computer. Anything unescaped here executes there. Every
 * single value that reaches the document goes through this function.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The same, for a JSON payload embedded inside a <script> element.
 *
 * JSON.stringify does NOT escape U+2028 and U+2029. They are legal in a JSON
 * string and illegal in JavaScript source, where they count as line
 * terminators, so an unescaped one turns the embedded payload into a syntax
 * error. They are built here from their code points rather than typed, because
 * typing one puts an invisible line break in this file, which is exactly how
 * this comment came to be written.
 */
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);
const SEPARATORS = new RegExp(`[${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]`, "g");

function escapeJsonForScript(value: unknown): string {
  return JSON.stringify(value, null, 2)
    // A literal </script> inside a JSON string would close the element early.
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(SEPARATORS, (match) => (match === LINE_SEPARATOR ? "\\u2028" : "\\u2029"));
}

const longDate = (iso: string) => {
  const date = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

function section(title: string, body: string): string {
  return body.trim() ? `<section><h2>${escapeHtml(title)}</h2>${body}</section>` : "";
}

const list = (items: string[]) =>
  items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : "";

/**
 * Render the record as one self-contained HTML document.
 *
 * Everything is inline. The type is a system font stack so it looks deliberate
 * on any machine without fetching anything, the layout is a single column that
 * prints without being told to, and there is not one external reference in the
 * file.
 */
export function renderPassportHtml(record: LearningRecord): string {
  const name = escapeHtml(record.child.name);
  const period =
    record.period.from && record.period.to
      ? `${longDate(record.period.from)} to ${longDate(record.period.to)}`
      : "No dated stories";

  const identity = [
    record.child.ageGroup ? `<p class="line"><span>Age group</span>${escapeHtml(record.child.ageGroup)}</p>` : "",
    record.child.homeLanguages.length
      ? `<p class="line"><span>Spoken at home</span>${escapeHtml(record.child.homeLanguages.join(", "))}</p>`
      : "",
    record.child.interests.length
      ? `<p class="line"><span>Into right now</span>${escapeHtml(record.child.interests.join(", "))}</p>`
      : "",
  ].join("");

  const ownWords = record.ownWords.length
    ? `<div class="quotes">${record.ownWords
        .map(
          (note) =>
            `<blockquote>${escapeHtml(note.words)}<cite>${escapeHtml(longDate(note.saidAt))} · ${escapeHtml(
              describeProvenance(note.provenance),
            )}</cite></blockquote>`,
        )
        .join("")}</div>`
    : "";

  const howTheyLearn = record.howTheyLearn.length
    ? `<dl>${record.howTheyLearn
        .map(
          (entry) =>
            `<dt>${escapeHtml(entry.disposition)} <span class="count">seen in ${entry.seenIn} stories</span></dt>` +
            (entry.example ? `<dd>${escapeHtml(entry.example)}</dd>` : ""),
        )
        .join("")}</dl>`
    : "";

  const familyVoice = record.familyVoice.length
    ? `<div class="quotes">${record.familyVoice
        .map((entry) => `<blockquote>${escapeHtml(entry.words)}<cite>${escapeHtml(longDate(entry.date))}</cite></blockquote>`)
        .join("")}</div>`
    : "";

  const moments = record.moments.length
    ? `<ul class="moments">${record.moments
        .map(
          (moment) =>
            `<li><strong>${escapeHtml(longDate(moment.date))}</strong>` +
            (moment.title ? ` — ${escapeHtml(moment.title)}` : "") +
            (moment.summary ? `<br>${escapeHtml(moment.summary)}` : "") +
            `</li>`,
        )
        .join("")}</ul>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${name} — learning record</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0 auto; padding: 2.5rem 1.25rem 4rem; max-width: 46rem;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 17px; line-height: 1.65; color: #2b2119; background: #fdfbf7;
  }
  header { border-bottom: 2px solid #e6ded2; padding-bottom: 1.25rem; margin-bottom: 1.75rem; }
  .eyebrow { margin: 0; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: #8a6f4f; font-weight: 700; }
  h1 { margin: 0.35rem 0 0; font-size: 2.2rem; line-height: 1.15; }
  .period { margin: 0.35rem 0 0; color: #6f6357; font-size: 0.95rem; }
  .line { margin: 0.35rem 0; }
  .line span { display: inline-block; min-width: 9.5rem; color: #6f6357; }
  section { margin-top: 2rem; break-inside: avoid; }
  h2 { font-size: 1.15rem; margin: 0 0 0.6rem; }
  ul, dl { margin: 0; padding-left: 1.15rem; }
  ul.moments { list-style: none; padding-left: 0; }
  ul.moments li { padding: 0.5rem 0; border-bottom: 1px solid #efe8dd; }
  dt { font-weight: 600; margin-top: 0.7rem; }
  dt .count { font-weight: 400; color: #6f6357; font-size: 0.85rem; }
  dd { margin: 0.15rem 0 0; color: #4a4038; }
  .quotes blockquote {
    margin: 0 0 0.9rem; padding: 0.75rem 1rem; background: #fff; border-left: 3px solid #c8b49a; border-radius: 0 0.6rem 0.6rem 0;
  }
  .quotes cite { display: block; margin-top: 0.4rem; font-size: 0.78rem; font-style: normal; color: #6f6357; }
  footer { margin-top: 2.75rem; padding-top: 1.25rem; border-top: 1px solid #e6ded2; font-size: 0.82rem; color: #6f6357; }
  @media print {
    body { background: #fff; padding: 0; font-size: 12pt; max-width: none; }
    .quotes blockquote { background: transparent; }
  }
</style>
</head>
<body>
<header>
  <p class="eyebrow">Learning record</p>
  <h1>${name}</h1>
  <p class="period">${escapeHtml(period)}${record.period.storyCount ? ` · drawn from ${record.period.storyCount} learning ${record.period.storyCount === 1 ? "story" : "stories"}` : ""}</p>
  ${identity}
</header>

${section(`In ${record.child.name}'s own words`, ownWords)}
${section("How they go about learning", howTheyLearn)}
${section("What helps", list(record.whatHelps))}
${section("What their family hopes for them", record.familyHopes ? `<p>${escapeHtml(record.familyHopes)}</p>` : "")}
${section("In their family's words", familyVoice)}
${section("Where they were heading next", list(record.openNextSteps))}
${section("Some of what happened", moments)}

<footer>
  <p><strong>What this is.</strong> A record of one child as a learner, assembled from learning stories their educators
  wrote and, where it appears, from what the child said themselves. Every line was copied from something already
  recorded. Nothing here was generated, and nothing was inferred about this child.</p>
  <p><strong>What it is not.</strong> It is not an assessment, a score, a diagnosis or a comparison with any other
  child. It is not a complete account of who they are, and anything important that was never written down is not in it.</p>
  <p>Prepared on ${escapeHtml(longDate(record.generatedAt))}. This file belongs to ${name}'s family. It works offline,
  needs no account and no internet, and will keep working whatever happens to the service that made it.</p>
  <p>Assembled with StoryLoop.</p>
</footer>

<script type="application/json" id="learning-record">
${escapeJsonForScript(record)}
</script>
</body>
</html>
`;
}

/** A filename a family will still recognise in five years. */
export function passportFilename(record: LearningRecord): string {
  const safeName = record.child.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "child";
  return `${safeName}-learning-record-${record.generatedAt.slice(0, 10)}.html`;
}
