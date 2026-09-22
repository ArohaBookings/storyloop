import assert from "node:assert/strict";
import test from "node:test";
import { assessReadiness, QUESTIONS, type Answers } from "../lib/review-readiness";

const all = (value: "strong" | "partial" | "weak" | "unknown"): Answers =>
  Object.fromEntries(QUESTIONS.map((q) => [q.id, value]));

test("an unanswered check claims nothing", () => {
  const result = assessReadiness({});
  assert.equal(result.answered, 0);
  assert.deepEqual(result.priorities, []);
  assert.deepEqual(result.solid, []);
  assert.match(result.summary, /Answer the questions above/);
});

test("weak answers come before partial ones, because that is the order to fix them in", () => {
  const result = assessReadiness({ "coverage-known": "partial", "coverage-gaps": "weak", walkthrough: "partial", "qip-honest": "weak" });
  assert.deepEqual(result.priorities.slice(0, 2).map((p) => p.id).sort(), ["coverage-gaps", "qip-honest"]);
  assert.equal(result.priorities.length, 4);
  assert.ok(result.priorities.every((p) => p.firstMove.length > 20), "every finding carries a first move");
});

test("strong answers are reported by area, and only when the whole area is strong", () => {
  const result = assessReadiness({ "coverage-known": "strong", "coverage-gaps": "strong", "reflection-written": "strong", "reflection-changed": "weak" });
  assert.deepEqual(result.solid, ["Coverage"]);
  assert.ok(!result.solid.includes("Critical reflection"), "one weak answer disqualifies the area");
});

test("a clean sheet is not congratulated into complacency", () => {
  const result = assessReadiness(all("strong"));
  assert.deepEqual(result.priorities, []);
  assert.equal(result.solid.length, 5, "every area reads solid");
  assert.match(result.summary, /coverage drifts quietly/);
});

test("not knowing is itself the finding when it happens repeatedly", () => {
  const result = assessReadiness({ "coverage-known": "unknown", "coverage-gaps": "unknown", "reflection-written": "unknown", walkthrough: "strong" });
  assert.equal(result.unknowns.length, 3);
  assert.match(result.summary, /cannot currently answer questions about itself/);
  // An unknown is not counted as a gap in practice, because it is not evidence of one.
  assert.deepEqual(result.priorities, []);
});

test("it never scores, rates or predicts an outcome", () => {
  for (const answers of [all("weak"), all("partial"), all("strong"), all("unknown")]) {
    const text = JSON.stringify(assessReadiness(answers));
    assert.ok(!/\b(score|rating|rated|pass|fail|compliant|non-compliant|guarantee|will meet|predict)\b/i.test(text), text.slice(0, 200));
    assert.ok(!/\d+%/.test(text), "no percentage that could be mistaken for a grade");
  }
});

test("every question has a first move written for it", () => {
  const result = assessReadiness(all("weak"));
  assert.equal(result.priorities.length, QUESTIONS.length);
  assert.ok(result.priorities.every((p) => p.finding && p.firstMove));
  // Four options each, and the last is always the honest "not sure".
  assert.ok(QUESTIONS.every((q) => q.options.length === 4 && q.options[3].value === "unknown"));
  assert.ok(QUESTIONS.every((q) => q.why.length > 40), "every question explains why it matters");
});
