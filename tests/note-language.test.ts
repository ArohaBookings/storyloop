import assert from "node:assert/strict";
import test from "node:test";
import { isUsableNoteEnglish, looksNonLatin } from "../lib/note-language";

const TAGALOG = `Si Mia ay nagtayo ng tore gamit ang mga bloke. Sabi niya "ang taas!" tapos tumawa siya nang bumagsak ito. Sinubukan niya ulit.`;

test("a reading into English keeps what the child said, exactly", () => {
  const good = { already_english: false, language: "Tagalog", english: `Mia built a tower with the blocks. She said "ang taas!" (it's so tall!) then laughed when it fell. She tried again.` };
  assert.equal(isUsableNoteEnglish(TAGALOG, good), true);
  // The child's words translated away.
  assert.equal(isUsableNoteEnglish(TAGALOG, { ...good, english: `Mia built a tower. She said "it's so tall!" then laughed. She tried again.` }), false);
  // One character of the quote changed.
  assert.equal(isUsableNoteEnglish(TAGALOG, { ...good, english: good.english.replace("ang taas!", "ang taas") }), false);
});

test("it must still be a note, not a fragment and not a story", () => {
  const base = { already_english: false, language: "Tagalog" };
  assert.equal(isUsableNoteEnglish(TAGALOG, { ...base, english: `"ang taas!"` }), false);
  assert.equal(isUsableNoteEnglish(TAGALOG, { ...base, english: `Mia said "ang taas!" ` + "She showed wonderful persistence and resilience. ".repeat(30) }), false);
  assert.equal(isUsableNoteEnglish(TAGALOG, { ...base, english: "" }), false);
});

test("a note already in English is passed through, and bad answers are refused", () => {
  assert.equal(isUsableNoteEnglish("Mia stacked blocks.", { already_english: true, language: "English", english: "" }), true);
  for (const bad of [null, "text", {}, { already_english: "no", english: "x", language: "y" }, { already_english: false, english: 5, language: "y" }, { already_english: false, english: "x" }]) {
    assert.equal(isUsableNoteEnglish(TAGALOG, bad), false);
  }
});

test("a note in another script is noticed; Latin-script notes are not guessed at", () => {
  assert.equal(looksNonLatin("米娅用积木搭了一座塔。她说“好高啊！”然后塔倒了，她笑了，又试了一次。"), true);
  assert.equal(looksNonLatin("मिया ने ब्लॉक से एक मीनार बनाई। उसने कहा \"कितनी ऊँची!\" फिर वह गिर गई।"), true);
  assert.equal(looksNonLatin("Mia stacked the blocks and said \"so tall\". It fell and she laughed."), false);
  assert.equal(looksNonLatin(TAGALOG), false);
  assert.equal(looksNonLatin("好"), false, "too short to judge");
  assert.equal(looksNonLatin("Tama said \"kei te pai\" and Mere said \"好\" once."), false);
});
