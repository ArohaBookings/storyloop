import assert from "node:assert/strict";
import test from "node:test";
import {
  ROOM_SEGMENT_MAX_SECONDS, ROOM_SEGMENT_MIN_SECONDS, ROOM_QUIET_MS, ROOM_UNSURE_MAX,
  allSegmentsSettled, applyNameFix, cleanRoomNames, clock, editDistance, hasMissedMark, missedMark, nameChecks, namesHint,
  roomTranscript, shouldCutSegment, unsureWords,
} from "../lib/room-mode";

test("a piece is cut at the first pause after the minimum, and at the maximum whatever is happening", () => {
  assert.equal(shouldCutSegment({ secondsInSegment: ROOM_SEGMENT_MIN_SECONDS - 1, quietMs: 5000 }), false);
  assert.equal(shouldCutSegment({ secondsInSegment: ROOM_SEGMENT_MIN_SECONDS, quietMs: ROOM_QUIET_MS - 1 }), false);
  assert.equal(shouldCutSegment({ secondsInSegment: ROOM_SEGMENT_MIN_SECONDS, quietMs: ROOM_QUIET_MS }), true);
  assert.equal(shouldCutSegment({ secondsInSegment: ROOM_SEGMENT_MAX_SECONDS, quietMs: 0 }), true);
});

test("the transcript is the pieces in the order they were spoken, even when they arrive out of order", () => {
  const text = roomTranscript([
    { index: 2, seconds: 50, text: "Tama dug a hole." },
    { index: 0, seconds: 45, text: " Ruby poured water. " },
    { index: 1, seconds: 60, text: "" }, // a silent minute adds nothing
  ]);
  assert.equal(text, "Ruby poured water.\n\nTama dug a hole.");
});

test("a lost piece is marked where it happened, never skipped silently, and blocks until dealt with", () => {
  const segments = [
    { index: 0, seconds: 45, text: "Ruby poured water." },
    { index: 1, seconds: 52.4, failed: true },
    { index: 2, seconds: 30, text: "Tama dug a hole." },
  ];
  const text = roomTranscript(segments);
  assert.equal(text, "Ruby poured water.\n\n[missed about 52 seconds here]\n\nTama dug a hole.");
  assert.equal(hasMissedMark(text), true);
  assert.equal(hasMissedMark(text.replace(missedMark(52.4), "Then she laughed.")), false);
  assert.equal(missedMark(0.2), "[missed about 1 second here]");
});

test("the transcript waits for every piece: one still uploading means not settled", () => {
  assert.equal(allSegmentsSettled([{ index: 0, seconds: 40, text: "a" }, { index: 1, seconds: 40 }]), false);
  assert.equal(allSegmentsSettled([{ index: 0, seconds: 40, text: "" }, { index: 1, seconds: 40, failed: true }]), true);
});

test("names given to the transcriber are first names only, once each", () => {
  assert.deepEqual(cleanRoomNames(["Ruby Smith", " ruby ", "Tama", "A", "Mere-Ana", "x@y.com", 7]), ["Ruby", "Tama", "Mere-Ana", "xycom"]);
  assert.deepEqual(cleanRoomNames("Ruby, Tama ,  "), ["Ruby", "Tama"]);
  assert.equal(namesHint(["Ruby", "Tama"]), " Children's first names you may hear: Ruby, Tama.");
  assert.equal(namesHint([]), "");
});

test("edit distance counts single changes", () => {
  assert.equal(editDistance("Mia", "Maya"), 2);
  assert.equal(editDistance("Tama", "Tamar"), 1);
  assert.equal(editDistance("Ruby", "ruby"), 0);
});

test("a name heard almost right is offered as a fix; real names are counted; sentence openers are left alone", () => {
  const transcript = "Then Rubie poured the water. Tama said \"more\". After that Tamar dug a hole with Kiri. Rubie laughed. The sand was wet.";
  const checks = nameChecks(transcript, ["Ruby", "Tama", "Arjun"]);
  assert.deepEqual(checks.heard, [{ name: "Tama", count: 1 }]);
  assert.deepEqual(checks.suggestions, [{ heard: "Rubie", suggest: "Ruby", count: 2 }, { heard: "Tamar", suggest: "Tama", count: 1 }]);
  assert.deepEqual(checks.others, [{ name: "Kiri", count: 1 }]);
});

test("a short name needs a closer match, and a different first letter is never suggested", () => {
  const checks = nameChecks("We saw Mya and Ben. Later Zia ran.", ["Mia", "Jen", "Tia"]);
  assert.deepEqual(checks.suggestions, [{ heard: "Mya", suggest: "Mia", count: 1 }]);
});

test("a fix replaces the whole word only, including the possessive, and nothing else", () => {
  const fixed = applyNameFix("Rubie poured. Rubie's cup. Rubies are red. rubie", "Rubie", "Ruby");
  assert.equal(fixed, "Ruby poured. Ruby's cup. Rubies are red. rubie");
  assert.equal(applyNameFix("same", "", "Ruby"), "same");
});

test("words the transcriber doubted are listed once each, real words only", () => {
  const logprobs = [
    { token: "Ruby", logprob: -0.01 }, { token: " po", logprob: -0.2 }, { token: "ured", logprob: -1.9 },
    { token: " the", logprob: -2.5 }, { token: " wa", logprob: -0.1 }, { token: "ter", logprob: -0.1 },
    { token: ".", logprob: -3 }, { token: " Poured", logprob: -2 }, { token: " 12", logprob: -4 }, { token: " kai", logprob: -1.5 },
  ];
  assert.deepEqual(unsureWords(logprobs), ["poured", "the", "kai"]);
  assert.deepEqual(unsureWords(null), []);
  const many = Array.from({ length: 40 }, (_, i) => ({ token: ` word${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}x`, logprob: -3 }));
  assert.equal(unsureWords(many).length, ROOM_UNSURE_MAX);
});

test("the clock reads minutes and seconds", () => {
  assert.equal(clock(0), "0:00");
  assert.equal(clock(75.9), "1:15");
  assert.equal(clock(900), "15:00");
});
