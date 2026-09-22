import assert from "node:assert/strict";
import test from "node:test";
import { buildPickupBrief, polishIsFaithful, type PickupMoment } from "../lib/pickup-brief";

const TODAY = "2026-09-22";
const moment = (childId: string, date: string, text: string, source: PickupMoment["source"] = "capture"): PickupMoment =>
  ({ childId, date, text, source });

test("each child gets the specific true thing from today", () => {
  const brief = buildPickupBrief({
    today: TODAY,
    children: [{ id: "c1", name: "Ruby" }, { id: "c2", name: "Tāne" }],
    moments: [
      moment("c1", TODAY, "spent ages at the water trough working out the angle"),
      moment("c2", TODAY, "sang the whole waiata without prompting"),
    ],
  });
  const ruby = brief.lines.find((l) => l.name === "Ruby")!;
  assert.equal(ruby.says, "spent ages at the water trough working out the angle");
  assert.equal(ruby.freshness, "today");
  assert.deepEqual(brief.nothingToSay, []);
  assert.match(brief.headline, /2 of 2 have something from today/);
});

test("a child with nothing today is told plainly, never covered up", () => {
  const brief = buildPickupBrief({
    today: TODAY,
    children: [{ id: "c1", name: "Ruby" }, { id: "c2", name: "Quinn" }],
    moments: [moment("c1", TODAY, "water trough again")],
  });
  const quinn = brief.lines.find((l) => l.name === "Quinn")!;
  assert.equal(quinn.says, null);
  assert.equal(quinn.freshness, "nothing");
  assert.match(brief.headline, /Nothing yet for Quinn/);
  // The child with nothing comes FIRST: that handover needs the most help.
  assert.equal(brief.lines[0].name, "Quinn");
});

test("an older moment is offered, and marked as older rather than passed off as today", () => {
  const brief = buildPickupBrief({
    today: TODAY,
    children: [{ id: "c1", name: "Ruby" }],
    moments: [moment("c1", "2026-09-19", "kept going back to the eel book")],
  });
  assert.equal(brief.lines[0].says, "kept going back to the eel book");
  assert.equal(brief.lines[0].freshness, "earlier");
  assert.equal(brief.lines[0].date, "2026-09-19");
});

test("a moment older than the week is not offered at all", () => {
  const brief = buildPickupBrief({
    today: TODAY,
    children: [{ id: "c1", name: "Ruby" }],
    moments: [moment("c1", "2026-09-10", "ancient history")],
  });
  assert.equal(brief.lines[0].freshness, "nothing", "a fortnight ago is not something to say at the door");
  assert.deepEqual(brief.nothingToSay, ["Ruby"]);
});

test("the child's own words beat an adult's summary of the same day", () => {
  const brief = buildPickupBrief({
    today: TODAY,
    children: [{ id: "c1", name: "Ruby" }],
    moments: [
      moment("c1", TODAY, "persisted at the water trough", "capture"),
      moment("c1", TODAY, "i putted a block unner it so it goed up", "child-voice"),
      moment("c1", TODAY, "Tested a working theory about water", "story"),
    ],
  });
  assert.equal(brief.lines[0].says, "i putted a block unner it so it goed up");
  assert.equal(brief.lines[0].source, "child-voice");
});

test("a future-dated moment is never used", () => {
  const brief = buildPickupBrief({
    today: TODAY,
    children: [{ id: "c1", name: "Ruby" }],
    moments: [moment("c1", "2026-09-25", "has not happened yet")],
  });
  assert.equal(brief.lines[0].freshness, "nothing");
});

test("an empty room says so instead of inventing a reason to be cheerful", () => {
  const empty = buildPickupBrief({ today: TODAY, children: [], moments: [] });
  assert.match(empty.headline, /No child profiles yet/);
  const silent = buildPickupBrief({
    today: TODAY,
    children: [{ id: "c1", name: "Ruby" }, { id: "c2", name: "Quinn" }],
    moments: [],
  });
  assert.match(silent.headline, /Nothing has been captured for this room lately/);
  assert.ok(silent.lines.every((line) => line.says === null));
  // Nothing anywhere in the output resembles a reassuring fiction.
  assert.ok(!/good day|lovely|great day|happy/i.test(JSON.stringify(silent)), JSON.stringify(silent));
});

test("blank and unattached moments are ignored", () => {
  const brief = buildPickupBrief({
    today: TODAY,
    children: [{ id: "c1", name: "Ruby" }],
    moments: [
      { childId: null, date: TODAY, text: "group moment", source: "capture" },
      moment("c1", TODAY, "   "),
    ],
  });
  assert.equal(brief.lines[0].freshness, "nothing");
});

test("THE guard: a polished line may not introduce anything that was not recorded", () => {
  const source = "Ruby - trough, angle, kept adjusting the block";

  // Smoothing is fine.
  assert.equal(polishIsFaithful(source, "Ruby kept adjusting the block at the trough to change the angle.", "Ruby"), true);
  // Reordering and ordinary inflection are fine.
  assert.equal(polishIsFaithful(source, "She was adjusting the angle of the block at the trough.", "Ruby"), true);

  // This is the failure this guard exists for. Neither the happiness nor the
  // friends were ever written down, and a parent would hear an invention.
  assert.equal(polishIsFaithful(source, "Ruby worked happily at the trough with her friends.", "Ruby"), false);
  assert.equal(polishIsFaithful(source, "Ruby had a wonderful day at the trough.", "Ruby"), false);
  assert.equal(polishIsFaithful(source, "Ruby was proud of the angle she made.", "Ruby"), false);
});

test("the guard lets the child's name through without it counting as invention", () => {
  assert.equal(polishIsFaithful("trough, angle", "Ruby worked on the angle at the trough.", "Ruby"), true);
  assert.equal(polishIsFaithful("trough, angle", "Tāne worked on the angle at the trough.", "Ruby"), false);
});

test("the guard is not fooled by an empty or trivial polish", () => {
  assert.equal(polishIsFaithful("trough, angle", "", "Ruby"), true, "nothing added is nothing to reject");
  assert.equal(polishIsFaithful("", "She played outside with the blocks.", "Ruby"), false);
});
