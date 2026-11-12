import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CSV_HEADERS,
  csvField,
  exportFileName,
  exportFormat,
  isoDate,
  readableDate,
  storiesToCsv,
  storiesToText,
  zoneForLocation,
  type ExportStory,
} from "../lib/story-export";

const mia: ExportStory = {
  created_at: "2026-11-11T20:30:00Z", // 9.30am on 12 Nov in Auckland
  child_name: "Mia",
  age_group: "3-4",
  observations: 'Mia stacked six blocks and said "look, a tower for the birds".',
  story_text: "Mia's tower\n\nLearning Story\nMia stacked six blocks.",
  outcomes: ["Mana aotūroa | Exploration", "Mana reo | Communication"],
  next_steps: ["Offer longer planks", "Ask what the birds need"],
  location: "NZ",
};
const tama: ExportStory = {
  created_at: "2026-11-01T01:00:00Z",
  child_name: null,
  observations: "=HYPERLINK(\"http://x\")\r\nsecond line",
  story_text: "- A list, then a comma, and a \"quote\"",
  outcomes: null,
  next_steps: [],
  location: "AU",
};

test("the format is chosen from a short list", () => {
  assert.equal(exportFormat("txt"), "txt");
  assert.equal(exportFormat("csv"), "csv");
  assert.equal(exportFormat("pdf"), null);
  assert.equal(exportFormat(null), null);
});

test("dates are read where the story was written", () => {
  assert.equal(zoneForLocation("NZ"), "Pacific/Auckland");
  assert.equal(zoneForLocation("uk"), "Europe/London");
  assert.equal(zoneForLocation("IE"), "Europe/Dublin");
  assert.equal(zoneForLocation(null), "Australia/Sydney");
  // 11:30pm UTC on 11 Nov is 12:30pm on the 12th in Auckland.
  assert.equal(readableDate("2026-11-11T23:30:00Z", "Pacific/Auckland"), "12 November 2026");
  assert.equal(isoDate("2026-11-11T12:30:00Z", "Australia/Sydney"), "2026-11-11");
  assert.equal(isoDate("2026-11-11T13:30:00Z", "Australia/Sydney"), "2026-11-12");
  assert.equal(readableDate(null, "Pacific/Auckland"), "Date not recorded");
  assert.equal(isoDate("not a date", "Pacific/Auckland"), "");
});

test("the text file holds every part of every story, newest first as given", () => {
  const text = storiesToText([mia, tama], new Date("2026-11-12T01:00:00Z"), "Pacific/Auckland");
  assert.match(text, /^StoryLoop: every story you have saved\nDownloaded 12 November 2026\. 2 stories, newest first\./);
  for (const part of [mia.observations!, "Mia stacked six blocks.", "- Mana aotūroa | Exploration", "- Ask what the birds need", "12 November 2026. Mia (3-4)"]) {
    assert.ok(text.includes(part), `missing: ${part}`);
  }
  assert.ok(text.indexOf("Mia stacked") < text.indexOf("A list, then a comma"), "kept in the order given");
  assert.ok(text.includes("No name saved"), "a story with no name says so");
  assert.ok(!text.includes("\r"), "one kind of line ending");
  assert.ok(!text.includes("OUTCOMES\n\n"), "no empty headings");
  assert.ok(!/—/.test(text), "no em dashes");
  assert.ok(text.endsWith("\n") && !text.endsWith("\n\n"));
  assert.match(storiesToText([mia]), /1 story, newest first/);
});

test("a CSV field is quoted, escaped, and never runs as a formula", () => {
  assert.equal(csvField('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvField("=SUM(A1)"), `"'=SUM(A1)"`);
  assert.equal(csvField("+61 400"), `"'+61 400"`);
  assert.equal(csvField("-2"), `"'-2"`);
  assert.equal(csvField("@cmd"), `"'@cmd"`);
  assert.equal(csvField("\tx"), `"'\tx"`);
  assert.equal(csvField(null), '""');
  assert.equal(csvField(3), '"3"');
  assert.equal(csvField("line one\nline two"), '"line one\nline two"');
});

test("the CSV opens in a spreadsheet: BOM, header row, one row per story, CRLF", () => {
  const csv = storiesToCsv([mia, tama]);
  assert.ok(csv.startsWith("﻿"), "UTF-8 byte order mark first");
  assert.ok(csv.endsWith("\r\n"));
  const body = csv.slice(1);
  assert.ok(body.startsWith(CSV_HEADERS.map((h) => `"${h}"`).join(",") + "\r\n"));
  // Rows split on CRLF outside quotes: the note's own line break is a bare \n inside a quoted field.
  const rows = body.trimEnd().split("\r\n");
  assert.equal(rows.length, 3, "header and two stories");
  assert.equal(rows[1].split('","').length, CSV_HEADERS.length, "every row has every column");
  assert.ok(rows[1].startsWith('"2026-11-12","Mia","3-4",'));
  assert.ok(rows[1].includes('"Mana aotūroa | Exploration; Mana reo | Communication"'));
  assert.ok(rows[1].includes('said ""look, a tower for the birds"".'), "quotes doubled");
  assert.ok(rows[2].includes(`"'=HYPERLINK(""http://x"")\nsecond line"`), "a formula is made inert and CRLF inside a note becomes LF");
  assert.ok(rows[2].includes(`"'- A list, then a comma, and a ""quote"""`));
  assert.ok(rows[2].startsWith('"2026-11-01","",'), "no name stays empty in the spreadsheet");
  assert.equal(storiesToCsv([]), `﻿${CSV_HEADERS.map((h) => `"${h}"`).join(",")}\r\n`);
});

test("the file is named for the day it was downloaded", () => {
  assert.equal(exportFileName("csv", new Date("2026-11-11T20:00:00Z"), "Pacific/Auckland"), "storyloop-stories-2026-11-12.csv");
  assert.equal(exportFileName("txt", new Date("2026-11-11T20:00:00Z"), "Australia/Sydney"), "storyloop-stories-2026-11-12.txt");
  assert.match(exportFileName("txt"), /^storyloop-stories-\d{4}-\d{2}-\d{2}\.txt$/);
});
