import assert from "node:assert/strict";
import test from "node:test";
import { setFileName, setText } from "../lib/leader-set-export";
import type { SetPieceView } from "../lib/leader-sets";

const piece = (position: number, name: string, decision: SetPieceView["decision"], comment = ""): SetPieceView => ({
  position, childName: name, mode: "transition", framework: "TW", note: "n",
  draft: { framework: "TW", mode: "transition", outcomes: [{ outcome: "Mana reo | Communication", seen: `${name} told a story.`, strategy: "Ask.", gap: "" }], checks: [] },
  decision, comment,
});

test("one file, in position order, with the answers and first names only", () => {
  const text = setText({ educator: "Sam", centreName: "Kowhai", items: [piece(2, "Nikau", "changes", "Say more about the slide."), piece(1, "Aria", "approved"), piece(3, "Mere", null)] });
  assert.ok(text.startsWith("3 statements from Sam at Kowhai"));
  assert.ok(text.indexOf("Aria: Transition statement") < text.indexOf("Nikau: Transition statement"));
  assert.match(text, /Aria: Transition statement\n\nMana reo \| Communication\nWhat I saw: Aria told a story\.\nStrategy for the new entrant teacher: Ask\.\n\nLeader's answer: looks good\./);
  assert.match(text, /Leader's answer: suggested a change\.\nSay more about the slide\./);
  assert.match(text, /Leader's answer: not answered yet\./);
  assert.equal(setFileName({ educator: "Sam" }), "statements-from-sam.txt");
});
