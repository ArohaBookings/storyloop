import assert from "node:assert/strict";
import test from "node:test";
import { LEADER_SOURCES_ON } from "../lib/build-switches";
import { GATE, passes, runCases, score } from "./source-lines-eval";

// The A4 gate (RULINGS.txt ruling 5): on the held-out half of the invented
// fixtures, at least 0.90 of the note lines named are right and at most 0.10
// of backed sentences are marked "not in the note". The switch may be on only
// while this holds. Numbers for 25 Nov: review/A4-accuracy.json in the build folder.

test("the fixtures: the splitter reproduces every labelled note line and sentence", () => {
  const cases = runCases(); // throws on any drift
  assert.equal(cases.filter((c) => c.kind === "story").length, 40);
  assert.equal(cases.filter((c) => c.kind === "statement").length, 20);
  assert.equal(cases.filter((c) => c.split === "held").length, 30);
});

test("the held-out gate holds while LEADER_SOURCES_ON is on", () => {
  const held = score(runCases().filter((c) => c.split === "held"));
  console.log(`held out: precision ${held.links.precision} (${held.links.right}/${held.links.drawn}), false flags ${held.falseFlags.rate} (${held.falseFlags.flagged}/${held.falseFlags.backed}), catches ${held.catches.rate} (${held.catches.caught}/${held.catches.unbacked})`);
  if (!LEADER_SOURCES_ON) return;
  assert.ok(held.links.precision >= GATE.precision, `precision ${held.links.precision}`);
  assert.ok(held.falseFlags.rate <= GATE.falseFlags, `false flags ${held.falseFlags.rate}`);
  assert.ok(passes(held));
});
