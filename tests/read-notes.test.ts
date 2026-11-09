import assert from "node:assert/strict";
import test from "node:test";
import { cleanNotesTranscription, hasUnclearMark, NOTES_PHOTO_MAX_CHARS, NOTES_PHOTO_PROMPT, UNCLEAR_MARK } from "../lib/ai/read-notes";

test("the photo reader is told to copy, never to guess, tidy or describe people", () => {
  assert.match(NOTES_PHOTO_PROMPT, /exactly as written/);
  assert.match(NOTES_PHOTO_PROMPT, /Do not add, guess, complete, tidy, correct, summarise or interpret/);
  assert.match(NOTES_PHOTO_PROMPT, /Never guess a name, a number or a quoted word/);
  assert.match(NOTES_PHOTO_PROMPT, /Do not describe the photo, the paper, the room or any person/);
  assert.match(NOTES_PHOTO_PROMPT, /NO_NOTES/);
  // 10 Nov 2026: on its second live run the reader turned a child's "pease" into "please".
  assert.match(NOTES_PHOTO_PROMPT, /letter by letter, especially inside quotation marks/);
  assert.match(NOTES_PHOTO_PROMPT, /Never change a word into its usual spelling/);
  assert.ok(NOTES_PHOTO_PROMPT.includes(UNCLEAR_MARK));
});

test("a reading comes back as the note, with what could not be read counted", () => {
  const reading = cleanNotesTranscription("Tama at sandpit, filled red bucket.\r\nSaid \"more sand\" when empty.\n\n\n\nCarried it to the [Unclear] trough.");
  assert.deepEqual(reading, {
    text: "Tama at sandpit, filled red bucket.\nSaid \"more sand\" when empty.\n\nCarried it to the [unclear] trough.",
    unclear: 1,
  });
  // The child's words are untouched.
  assert.ok(reading!.text.includes("\"more sand\""));
});

test("no notes, an empty reply, or a page of nothing but [unclear] is not a note", () => {
  assert.equal(cleanNotesTranscription("NO_NOTES"), null);
  assert.equal(cleanNotesTranscription("  no_notes  "), null);
  assert.equal(cleanNotesTranscription(""), null);
  assert.equal(cleanNotesTranscription(null), null);
  assert.equal(cleanNotesTranscription("[unclear] [unclear] the"), null);
});

test("code fences are dropped and a very long page is capped", () => {
  assert.equal(cleanNotesTranscription("```\nMia served her own rice.\n```")?.text, "Mia served her own rice.");
  const long = cleanNotesTranscription("word ".repeat(5000));
  assert.ok(long && long.text.length <= NOTES_PHOTO_MAX_CHARS);
});

test("a story cannot be generated while a word is still marked unclear", () => {
  assert.equal(hasUnclearMark("Jack counted [unclear] red bears"), true);
  assert.equal(hasUnclearMark("Jack counted [UNCLEAR] red bears"), true);
  assert.equal(hasUnclearMark("Jack counted 8 red bears"), false);
});
