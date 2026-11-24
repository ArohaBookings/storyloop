import assert from "node:assert/strict";
import test from "node:test";
import { CLASS_SET_MAX, addToClassSet, clearClassSet, listClassSet, type ClassPiece } from "../lib/class-set";

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); }, removeItem: (k: string) => { data.delete(k); } };
}
const NOW = Date.parse("2026-11-25T02:00:00Z");
const piece = (name: string, over: Partial<ClassPiece> = {}): ClassPiece => ({
  childFirstName: name, mode: "transition", framework: "TW", note: `${name} built a tower.`,
  draft: { framework: "TW", mode: "transition", childName: name, outcomes: [{ outcome: "Mana reo | Communication", seen: "Talked.", strategy: "", gap: "" }], checks: [], privacyGuardian: { ok: true } } as unknown as ClassPiece["draft"],
  at: NOW, ...over,
});

test("add, list and clear, oldest first; the same child again replaces the earlier piece", () => {
  const s = memory();
  assert.equal(addToClassSet(piece("Aria"), NOW, s), true);
  assert.equal(addToClassSet(piece("Nikau"), NOW + 1, s), true);
  assert.equal(addToClassSet(piece("aria", { note: "again" }), NOW + 2, s), true);
  const list = listClassSet(NOW + 3, s);
  assert.deepEqual(list.map((p) => p.childFirstName), ["Nikau", "aria"]);
  clearClassSet(s);
  assert.deepEqual(listClassSet(NOW, s), []);
});

test("the 31st piece is refused", () => {
  const s = memory();
  for (let i = 0; i < CLASS_SET_MAX; i++) assert.equal(addToClassSet(piece(`Kid${i}`), NOW, s), true);
  assert.equal(addToClassSet(piece("Extra"), NOW, s), false);
  assert.equal(listClassSet(NOW, s).length, 30);
});

test("pieces older than 12 hours are dropped", () => {
  const s = memory();
  addToClassSet(piece("Old"), NOW, s);
  assert.equal(listClassSet(NOW + 11 * 3_600_000, s).length, 1);
  assert.equal(listClassSet(NOW + 13 * 3_600_000, s).length, 0);
});

test("storage that throws gives an empty set, never an error", () => {
  const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
  assert.deepEqual(listClassSet(NOW, broken), []);
  assert.equal(addToClassSet(piece("Aria"), NOW, broken), false);
  assert.doesNotThrow(() => clearClassSet(broken));
  assert.deepEqual(listClassSet(NOW, null), []);
});
