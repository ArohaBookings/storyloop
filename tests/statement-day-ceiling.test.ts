import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { STATEMENT_FREE_DAY_LIMIT, STATEMENT_FREE_LIMIT, STATEMENT_FREE_WINDOW_SECONDS, STATEMENT_PAID_LIMIT } from "../lib/child-statement";

// A free account: 3 statements or summaries an hour AND at most 9 in any 24 hours (Leo, 19 Nov 2026, R1-03).

test("the free allowance: 3 an hour, 9 a day; paid unchanged", () => {
  assert.equal(STATEMENT_FREE_LIMIT, 3);
  assert.equal(STATEMENT_FREE_WINDOW_SECONDS, 3600);
  assert.equal(STATEMENT_FREE_DAY_LIMIT, 9);
  assert.equal(STATEMENT_PAID_LIMIT, 30);
});

test("both statement routes check the day ceiling for a free account only, and say which limit she reached", () => {
  for (const file of ["app/api/statement-from-notes/route.ts", "app/api/children/[id]/statement/route.ts"]) {
    const route = readFileSync(file, "utf8");
    assert.match(route, /const today = paid \|\| !allowed \|\| \(await consumeRateLimit\(\{ scope: "child-statement-free-day", key: user\.id, limit: STATEMENT_FREE_DAY_LIMIT, windowSeconds: 86_400 \}\)\);/, file);
    assert.match(route, /if \(!allowed \|\| !today\) \{/, file);
    assert.match(route, /code: "free_limit", limit: "hour"/, file);
    assert.match(route, /code: "free_limit", limit: "day"/, file);
  }
});

test("the statement wall says this hour or today", () => {
  assert.match(readFileSync("components/app/StatementFromNotes.tsx", "utf8"), /work\.limit === "day" \? "You've used today's free drafts\." : "You've used this hour's free drafts\."/);
  assert.match(readFileSync("components/app/ChildStatementDrafter.tsx", "utf8"), /limitKind === "day" \? "You've used today's free drafts\." : "You've used this hour's free drafts\."/);
  assert.match(readFileSync("components/marketing/TransitionDemo.tsx", "utf8"), /setLimitKind\(data\.limit === "day" \? "day" : "hour"\);/);
});
