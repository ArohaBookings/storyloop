import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SendToLeader, { leaderSendPlace } from "../components/app/SendToLeader";
import { EVENTS, LEADER_SEND_PLACES } from "../lib/analytics/events";

(globalThis as unknown as { React: typeof React }).React = React; // the components use the classic JSX runtime

// 25 Nov 2026 integration: the send card records where it is (a story, the
// statement page, the statement wall) on leader_send_offered and leader_check_sent.

test("the send card accepts story, statement and wall, and records what it was given", () => {
  for (const where of ["story", "statement", "wall"] as const) {
    assert.ok((LEADER_SEND_PLACES as readonly string[]).includes(where));
    assert.equal(leaderSendPlace("set", where), where);
    assert.equal(leaderSendPlace("story", where), where);
  }
  assert.equal(leaderSendPlace("set"), "statement", "a set with no place is the statement page, as before");
  assert.equal(leaderSendPlace("story"), "history", "a story with no place is History, as before");
  assert.equal(leaderSendPlace("set", "nowhere" as never), "statement");
  const html = renderToStaticMarkup(React.createElement(SendToLeader, { kind: "set", pieces: [{ childFirstName: "Mia", mode: "transition", framework: "TW", note: "n", draft: {}, at: 0 } as never], where: "wall" }));
  assert.match(html, /data-testid="send-to-leader" data-kind="set" data-where="wall"/);
});

test("the statement wall passes wall, and both events carry the place", () => {
  assert.match(readFileSync("components/app/AppLimitWall.tsx", "utf8"), /<SendToLeader kind="set" pieces=\{centrePieces\} where="wall" \/>/);
  const panel = readFileSync("components/app/SendToLeader.tsx", "utf8");
  assert.match(panel, /trackEvent\("leader_send_offered", \{ kind: props\.kind, where: place \}\)/);
  assert.match(panel, /trackEvent\("leader_check_sent", \{\s*kind: props\.kind,\s*where: place,/);
  const specs = EVENTS as unknown as Record<string, { keys: Record<string, unknown> }>;
  assert.ok(specs.leader_check_sent.keys.where, "leader_check_sent accepts where");
  assert.ok(specs.leader_send_offered.keys.where);
});
