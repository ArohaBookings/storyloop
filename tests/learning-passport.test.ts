import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLearningRecord,
  escapeHtml,
  passportFilename,
  RECORD_FORMAT,
  RECORD_VERSION,
  renderPassportHtml,
  type PassportChild,
} from "../lib/learning-passport";
import type { PackStory } from "../lib/transition-pack";

const CHILD: PassportChild = {
  name: "Ruby",
  ageGroup: "4-5 years",
  interests: ["water play", "eels"],
  homeLanguages: ["te reo Māori", "English"],
  notes: "Needs a warning before transitions.\nSettles fastest outside.",
  developmentalFocus: "Building confidence in large groups",
  whanauAspirations: "We want her to stay curious and keep asking why.",
};

const story = (id: string, date: string, extra: Partial<PackStory> = {}): PackStory => ({
  id, date, title: null, learningSummary: null, childVoice: null, whanauVoice: null,
  dispositions: [], nextSteps: [], ...extra,
});

const GENERATED = "2026-12-12T00:00:00.000Z";

test("the record is assembled from what was saved, in a documented shape", () => {
  const record = buildLearningRecord({
    child: CHILD,
    generatedAt: GENERATED,
    ownWords: [],
    stories: [
      story("s1", "2026-03-04", { title: "The long pipe", learningSummary: "Tested how water travels.", dispositions: ["Perseverance"] }),
      story("s2", "2026-08-01", { title: "Again", learningSummary: "Kept trying after it fell.", dispositions: ["Perseverance"] }),
    ],
  });
  assert.equal(record.format, RECORD_FORMAT);
  assert.equal(record.version, RECORD_VERSION);
  assert.equal(record.period.storyCount, 2);
  assert.equal(record.period.from, "2026-03-04");
  assert.equal(record.period.to, "2026-08-01");
  assert.deepEqual(record.child.homeLanguages, ["te reo Māori", "English"]);
  assert.equal(record.familyHopes, "We want her to stay curious and keep asking why.");
  assert.deepEqual(record.whatHelps, [
    "Needs a warning before transitions.",
    "Settles fastest outside.",
    "Building confidence in large groups",
  ]);
});

test("a disposition seen once is an anecdote and is left out", () => {
  const record = buildLearningRecord({
    child: CHILD,
    generatedAt: GENERATED,
    ownWords: [],
    stories: [
      story("s1", "2026-03-04", { dispositions: ["Perseverance", "Curiosity"] }),
      story("s2", "2026-04-04", { dispositions: ["Perseverance"] }),
    ],
  });
  assert.deepEqual(record.howTheyLearn.map((d) => d.disposition), ["Perseverance"]);
  assert.equal(record.howTheyLearn[0].seenIn, 2);
});

test("a next step already tried is not handed on as still open", () => {
  const record = buildLearningRecord({
    child: CHILD,
    generatedAt: GENERATED,
    ownWords: [],
    stories: [
      story("s1", "2026-03-04", { nextSteps: [{ text: "Offer longer pipes", status: "tried" }, { text: "Find an eel book", status: "planned" }] }),
    ],
  });
  assert.deepEqual(record.openNextSteps, ["Find an eel book"]);
});

test("the child's own words are carried verbatim and newest first", () => {
  const record = buildLearningRecord({
    child: CHILD,
    generatedAt: GENERATED,
    stories: [],
    ownWords: [
      { words: "i builded it really high", saidAt: "2026-05-01T00:00:00Z", provenance: "typed" },
      { words: "the water goed up", saidAt: "2026-09-01T00:00:00Z", provenance: "transcribed_corrected" },
    ],
  });
  assert.deepEqual(record.ownWords.map((w) => w.words), ["the water goed up", "i builded it really high"]);
  assert.equal(record.ownWords[1].words, "i builded it really high", "never tidied into adult grammar");
});

test("an empty record still renders and claims nothing", () => {
  const record = buildLearningRecord({
    child: { ...CHILD, notes: null, developmentalFocus: null, whanauAspirations: null },
    generatedAt: GENERATED, stories: [], ownWords: [],
  });
  assert.equal(record.period.storyCount, 0);
  assert.deepEqual(record.howTheyLearn, []);
  const html = renderPassportHtml(record);
  assert.ok(html.includes("Ruby"));
  assert.ok(!html.includes("<h2>How they go about learning</h2>"), "an empty section is left out, not shown empty");
});

test("THE load-bearing test: nothing typed by a person can execute in the file", () => {
  // The passport is HTML built from what people typed, opened by a teacher on
  // a school computer. This is the boundary.
  const nasty = '<script>alert("xss")</script>';
  const record = buildLearningRecord({
    child: {
      name: `Ruby${nasty}`,
      ageGroup: nasty,
      interests: [nasty],
      homeLanguages: [nasty],
      notes: nasty,
      developmentalFocus: null,
      whanauAspirations: `"><img src=x onerror=alert(1)>`,
    },
    generatedAt: GENERATED,
    ownWords: [{ words: nasty, saidAt: "2026-05-01T00:00:00Z", provenance: "typed" }],
    stories: [
      story("s1", "2026-03-04", { title: nasty, learningSummary: nasty, whanauVoice: nasty, dispositions: [nasty], nextSteps: [{ text: nasty, status: "planned" }] }),
      story("s2", "2026-03-05", { dispositions: [nasty] }),
    ],
  });
  const html = renderPassportHtml(record);

  // Exactly one script element, and it is the JSON payload this file writes.
  const scriptOpens = html.match(/<script/gi) ?? [];
  assert.equal(scriptOpens.length, 1, `expected only the JSON payload, found ${scriptOpens.length}`);
  assert.ok(html.includes('<script type="application/json" id="learning-record">'));

  assert.ok(!html.includes("<script>alert"), "an injected script tag must not survive");
  assert.ok(!/<img /i.test(html), "an injected element must not survive");
  // An event handler must not survive AS AN ATTRIBUTE. The characters
  // "onerror=" appearing as escaped text is correct and required: it is
  // somebody's data, and the job is to render it inert, not to delete it.
  assert.ok(!/<[a-z][^>]*\son[a-z]+\s*=/i.test(html), "no element may carry an event handler");
  // The text itself is still there, escaped.
  assert.ok(html.includes("&lt;script&gt;"), "the characters are kept, escaped");
  assert.ok(html.includes("onerror=alert(1)"), "and the data is preserved, just inert");

  // And the JSON payload cannot break out of its own element.
  const payload = html.slice(html.indexOf('id="learning-record"'));
  assert.ok(!payload.includes("</script>alert"), "the payload must not close its element early");
  assert.ok(payload.includes("\\u003c"), "angle brackets inside the payload are escaped");
});

test("escapeHtml covers every character that changes meaning", () => {
  assert.equal(escapeHtml(`<>&"'`), "&lt;&gt;&amp;&quot;&#39;");
  // Ampersand first, or the other escapes get double-escaped.
  assert.equal(escapeHtml("&lt;"), "&amp;lt;");
});

test("the file is genuinely self-contained: it fetches nothing", () => {
  const record = buildLearningRecord({
    child: CHILD, generatedAt: GENERATED, ownWords: [],
    stories: [story("s1", "2026-03-04", { title: "The long pipe", learningSummary: "Tested it." })],
  });
  const html = renderPassportHtml(record);
  // No external requests of any kind. A passport that phones home is not the
  // family's, and one that breaks when a CDN moves was never portable.
  assert.ok(!/src\s*=\s*["']https?:/i.test(html), "no remote sources");
  assert.ok(!/<link\b/i.test(html), "no stylesheets or preloads");
  assert.ok(!/@import/i.test(html), "no CSS imports");
  assert.ok(!/fonts\.googleapis|cdn\./i.test(html), "no font or CDN hosts");
  assert.ok(!/<iframe|<object|<embed/i.test(html), "nothing embedded from elsewhere");
  // It says plainly what it is and what it is not.
  assert.ok(html.includes("It is not an assessment"), "the disclaimer must survive");
  assert.ok(html.includes("works offline"), "the promise to the family must be on the page");
});

test("the embedded payload is the record, so a machine could read it one day", () => {
  const record = buildLearningRecord({
    child: CHILD, generatedAt: GENERATED, ownWords: [],
    stories: [story("s1", "2026-03-04", { title: "The long pipe" })],
  });
  const html = renderPassportHtml(record);
  const start = html.indexOf('<script type="application/json" id="learning-record">') + '<script type="application/json" id="learning-record">'.length;
  const raw = html.slice(start, html.indexOf("</script>", start));
  const parsed = JSON.parse(raw.replace(/\\u003c/g, "<").replace(/\\u003e/g, ">").replace(/\\u0026/g, "&"));
  assert.equal(parsed.format, RECORD_FORMAT);
  assert.equal(parsed.version, RECORD_VERSION);
  assert.equal(parsed.child.name, "Ruby");
  assert.equal(parsed.period.storyCount, 1);
});

test("the filename is one a family still recognises in five years", () => {
  const record = buildLearningRecord({ child: CHILD, generatedAt: GENERATED, stories: [], ownWords: [] });
  assert.equal(passportFilename(record), "Ruby-learning-record-2026-12-12.html");
  const awkward = buildLearningRecord({ child: { ...CHILD, name: "Tāne  O'Brien-Smith" }, generatedAt: GENERATED, stories: [], ownWords: [] });
  assert.equal(passportFilename(awkward), "Tāne-O-Brien-Smith-learning-record-2026-12-12.html");
  const empty = buildLearningRecord({ child: { ...CHILD, name: "   " }, generatedAt: GENERATED, stories: [], ownWords: [] });
  assert.ok(passportFilename(empty).startsWith("This-child"), passportFilename(empty));
});
