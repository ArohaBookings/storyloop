import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTodayFocus,
  FREE_TODAY_CAPTURE_LIMIT,
  todayCaptureAllowance,
  type DailyCapture,
} from "../lib/today-loop";

test("free Today Loop has a useful allowance and paid plans are unlimited", () => {
  assert.deepEqual(todayCaptureAllowance("free", 0), {
    limit: FREE_TODAY_CAPTURE_LIMIT,
    used: 0,
    remaining: FREE_TODAY_CAPTURE_LIMIT,
    allowed: true,
  });
  assert.equal(todayCaptureAllowance("free", FREE_TODAY_CAPTURE_LIMIT).allowed, false);
  assert.equal(todayCaptureAllowance("educator", 999).limit, null);
});

test("Today Loop prioritises unfinished captures, then open next steps", () => {
  const captures: DailyCapture[] = [{
    id: "capture-1",
    child_id: "child-1",
    child_name: "Ari",
    note: "Ari returned to the bridge and tried a wider base.",
    status: "captured",
    observed_at: "2026-07-29T01:00:00.000Z",
    created_at: "2026-07-29T01:00:00.000Z",
    updated_at: "2026-07-29T01:00:00.000Z",
  }];

  const focus = buildTodayFocus({
    children: [{ id: "child-1", name: "Ari" }, { id: "child-2", name: "Mia" }],
    captures,
    stories: [{
      id: "story-1",
      child_id: "child-2",
      child_name: "Mia",
      next_steps: ["Offer more loose parts and notice how Mia combines them."],
      metadata: { followUpStatus: "open" },
      created_at: "2026-07-28T01:00:00.000Z",
    }],
  });

  assert.equal(focus[0].kind, "close_loop");
  assert.equal(focus[0].childId, "child-1");
  assert.equal(focus[1].kind, "revisit");
  assert.equal(focus[1].sourceStoryId, "story-1");
});

test("Today Loop does not rank children and supplies a gentle empty state", () => {
  const focus = buildTodayFocus({ children: [], captures: [], stories: [] });
  assert.equal(focus.length, 1);
  assert.equal(focus[0].kind, "notice");
  assert.match(focus[0].body, /Capture what a child did/);
});
