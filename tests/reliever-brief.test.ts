import assert from "node:assert/strict";
import test from "node:test";
import { buildRelieverBrief, MAX_BRIEF_CHILDREN, NOTICE_AFTER_DAYS, type BriefChild, type BriefMoment } from "../lib/reliever-brief";

const TODAY = "2026-09-22";

const child = (id: string, name: string, extra: Partial<BriefChild> = {}): BriefChild => ({
  id, name, ageGroup: "3-4 years", interests: [], homeLanguages: [], notes: null, developmentalFocus: null, ...extra,
});
const moment = (childId: string, date: string, extra: Partial<BriefMoment> = {}): BriefMoment => ({
  childId, date, title: null, summary: null, dispositions: [], nextSteps: [], ...extra,
});

test("a reliever gets the room in one page, newest moment first", () => {
  const brief = buildRelieverBrief({
    today: TODAY,
    children: [
      child("c1", "Aroha", { interests: ["water play", "eels", "blocks", "painting"], homeLanguages: ["te reo Māori", "English"], notes: "Needs a warning before transitions." }),
      child("c2", "Ben"),
    ],
    moments: [
      moment("c1", "2026-09-21", { title: "The long pipe", summary: "Tested how water travels.", nextSteps: [{ text: "Offer longer pipes", status: "planned" }, { text: "Photograph it", status: "tried" }] }),
      moment("c1", "2026-09-10", { title: "Bridge", summary: "Rebuilt after it fell." }),
      moment("c1", "2026-08-02", { title: "Older", summary: "Should not appear." }),
      moment("c2", "2026-09-20", { summary: "Sang the whole waiata." }),
    ],
  });
  const aroha = brief.entries.find((e) => e.name === "Aroha")!;
  assert.deepEqual(aroha.lastMoments.map((m) => m.date), ["2026-09-21", "2026-09-10"]);
  assert.equal(aroha.lastMoments[0].line, "The long pipe: Tested how water travels.");
  assert.deepEqual(aroha.intoRightNow, ["water play", "eels", "blocks"], "three interests is enough to start a conversation");
  assert.deepEqual(aroha.languages, ["te reo Māori", "English"]);
  assert.equal(aroha.settles, "Needs a warning before transitions.");
  // A step already tried is done; it is not handed to the reliever.
  assert.deepEqual(aroha.openNextSteps, ["Offer longer pipes"]);
  assert.equal(aroha.needsNoticing, false);
  assert.equal(aroha.daysSinceLastMoment, 1);
});

test("children nobody has written about lately are named first, without judging them", () => {
  const brief = buildRelieverBrief({
    today: TODAY,
    children: [child("c1", "Quinn"), child("c2", "Sione"), child("c3", "Lily")],
    moments: [
      moment("c3", "2026-09-21", { summary: "Mixed two blues." }),
      moment("c2", "2026-06-30", { summary: "Kept the beat." }),
    ],
  });
  assert.deepEqual(brief.noticeToday, ["Quinn", "Sione"]);
  assert.match(brief.headlines[0], /Worth noticing today: Quinn, Sione\./);
  assert.ok(!/behind|concern|poor|risk/i.test(JSON.stringify(brief)), "no deficit language about a child");
  assert.equal(brief.entries.find((e) => e.name === "Sione")!.daysSinceLastMoment, 84);
  assert.equal(brief.entries.find((e) => e.name === "Lily")!.needsNoticing, false);
});

test("the notice threshold is a week of silence, counted from today", () => {
  const atThreshold = buildRelieverBrief({ today: TODAY, children: [child("c1", "Edge")], moments: [moment("c1", "2026-09-15")] });
  assert.equal(atThreshold.entries[0].daysSinceLastMoment, NOTICE_AFTER_DAYS);
  assert.equal(atThreshold.entries[0].needsNoticing, true);
  const dayBefore = buildRelieverBrief({ today: TODAY, children: [child("c1", "Edge")], moments: [moment("c1", "2026-09-16")] });
  assert.equal(dayBefore.entries[0].needsNoticing, false);
});

test("an empty room reads as an invitation, not an error", () => {
  const brief = buildRelieverBrief({ today: TODAY, children: [], moments: [] });
  assert.equal(brief.childCount, 0);
  assert.deepEqual(brief.noticeToday, []);
  assert.match(brief.headlines[0], /Every child here has a moment recorded/);
  assert.match(brief.headlines[brief.headlines.length - 1], /Nobody expects you to know the history/);

  const allSilent = buildRelieverBrief({ today: TODAY, children: [child("c1", "A"), child("c2", "B")], moments: [] });
  assert.match(allSilent.headlines[0], /Nothing has been captured for this room lately/);
});

test("the brief stays a brief: bounded children, two moments each, two next steps", () => {
  const children = Array.from({ length: 40 }, (_, i) => child(`c${i}`, `Child ${String(i).padStart(2, "0")}`));
  const moments = children.flatMap((c) => [1, 2, 3, 4].map((n) => moment(c.id, `2026-09-1${n}`, { summary: `moment ${n}`, nextSteps: [{ text: `step ${n}`, status: "planned" }] })));
  const brief = buildRelieverBrief({ today: TODAY, children, moments });
  assert.equal(brief.entries.length, MAX_BRIEF_CHILDREN);
  assert.ok(brief.entries.every((e) => e.lastMoments.length <= 2 && e.openNextSteps.length <= 2));
});

test("headlines summarise the room: languages and planned steps", () => {
  const brief = buildRelieverBrief({
    today: TODAY,
    children: [
      child("c1", "Ana", { homeLanguages: ["Samoan", "English"] }),
      child("c2", "Bo", { homeLanguages: ["English"] }),
      child("c3", "Cy", { homeLanguages: ["Mandarin"] }),
    ],
    moments: [
      moment("c1", "2026-09-21", { nextSteps: [{ text: "Offer the big brushes", status: "continue" }] }),
      moment("c2", "2026-09-21"),
      moment("c3", "2026-09-20"),
    ],
  });
  assert.ok(brief.headlines.some((h) => h === "Languages spoken at home in this room: Samoan, Mandarin."), JSON.stringify(brief.headlines));
  assert.ok(brief.headlines.some((h) => h === "1 child has a next step the team already planned."), JSON.stringify(brief.headlines));
});

test("a moment with no title or summary still says something true", () => {
  const brief = buildRelieverBrief({
    today: TODAY,
    children: [child("c1", "Mo")],
    moments: [moment("c1", "2026-09-21", { dispositions: ["Perseverance"] })],
  });
  assert.equal(brief.entries[0].lastMoments[0].line, "Perseverance was recorded.");
  const bare = buildRelieverBrief({ today: TODAY, children: [child("c1", "Mo")], moments: [moment("c1", "2026-09-21")] });
  assert.equal(bare.entries[0].lastMoments[0].line, "A moment was recorded.");
});
