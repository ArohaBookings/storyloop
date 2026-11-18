import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { accountHasStories, accountsWithStories, hasOtherStories, withoutStories } from "../lib/story-count";

// Fault P11 (18 Nov 2026): five accounts from 18 May 2026 have stories the
// counter never counted (every story saved before the counter was written on
// 19 May), and four of them were emailed that they had not written a story.
// Anything that says "no story yet" now asks the stories table.

type Call = { method: string; args: unknown[] };

/** A stand-in for the Supabase query builder: records the calls, answers with `result`. */
function fakeDb(result: { count?: number | null; data?: unknown[] | null; error?: unknown } | ((calls: Call[]) => { count?: number | null; data?: unknown[] | null; error?: unknown })) {
  const queries: Call[][] = [];
  const db = {
    from(table: string) {
      const calls: Call[] = [{ method: "from", args: [table] }];
      queries.push(calls);
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "eq", "neq", "in", "limit"]) {
        builder[method] = (...args: unknown[]) => {
          calls.push({ method, args });
          return builder;
        };
      }
      builder.then = (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => {
        try {
          resolve(typeof result === "function" ? result(calls) : result);
        } catch (error) {
          reject(error);
        }
      };
      return builder;
    },
  };
  return { db: db as unknown as SupabaseClient, queries };
}

test("a zero counter is checked against the stories table; a counter above zero is trusted", async () => {
  const none = fakeDb({ count: 0 });
  assert.equal(await accountHasStories(none.db, "u1", 0), false);
  const some = fakeDb({ count: 2 });
  assert.equal(await accountHasStories(some.db, "u1", 0), true, "counter 0, two story rows: she has stories");
  const untouched = fakeDb({ count: 0 });
  assert.equal(await accountHasStories(untouched.db, "u1", 3), true);
  assert.equal(untouched.queries.length, 0, "no read when the counter already says yes");
  const broken = fakeDb({ count: null, error: { message: "down" } });
  assert.equal(await accountHasStories(broken.db, "u1", 0), null, "unsure is said as unsure");
});

test("'your first story' asks whether there is any story other than this one", async () => {
  const first = fakeDb({ count: 0 });
  assert.equal(await hasOtherStories(first.db, "u1", "s-new"), false);
  const calls = first.queries[0];
  assert.deepEqual(calls[0], { method: "from", args: ["stories"] });
  assert.ok(calls.some((c) => c.method === "eq" && c.args[0] === "user_id" && c.args[1] === "u1"));
  assert.ok(calls.some((c) => c.method === "neq" && c.args[0] === "id" && c.args[1] === "s-new"), "the story just saved is not counted");
  const earlier = fakeDb({ count: 1 });
  assert.equal(await hasOtherStories(earlier.db, "u1", "s-new"), true, "a May story: not her first");
  const noId = fakeDb({ count: 0 });
  await hasOtherStories(noId.db, "u1", null);
  assert.ok(!noId.queries[0].some((c) => c.method === "neq"), "no id: every story counts");
  const broken = fakeDb({ error: { message: "down" } });
  assert.equal(await hasOtherStories(broken.db, "u1", "s"), null);
});

test("the no-story emails only go to accounts the stories table says have none", async () => {
  const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const { db, queries } = fakeDb({ data: [{ user_id: "b" }, { user_id: "b" }] });
  const withStories = await accountsWithStories(db, rows.map((r) => r.id));
  assert.deepEqual([...(withStories ?? [])], ["b"]);
  assert.deepEqual(withoutStories(rows, withStories).map((r) => r.id), ["a", "c"]);
  assert.deepEqual(queries[0][0], { method: "from", args: ["stories"] });

  const many = Array.from({ length: 230 }, (_, i) => `u${i}`);
  const batched = fakeDb({ data: [] });
  assert.equal((await accountsWithStories(batched.db, many))?.size, 0);
  assert.equal(batched.queries.length, 3, "in batches of 100");

  const broken = fakeDb({ data: null, error: { message: "down" } });
  assert.deepEqual(withoutStories(rows, await accountsWithStories(broken.db, ["a"])), [], "unsure: nobody is told they have no story");
  const full = fakeDb({ data: Array.from({ length: 1000 }, () => ({ user_id: "a" })) });
  assert.equal(await accountsWithStories(full.db, ["a", "b"]), null, "a full page may hide someone: unsure");
  assert.equal((await accountsWithStories(fakeDb({ data: [] }).db, []))?.size, 0);
});

test("the email rules that say 'no story yet' ask the table; the writer itself is untouched", () => {
  const automation = readFileSync("lib/email/automation.ts", "utf8");
  assert.match(automation, /for \(const row of await zeroCounter\(noStoryUsers as ProfileEmailRow\[\] \| null\)\) \{\n {4}consider\(row, "no_first_story"\);/);
  assert.match(automation, /for \(const row of await zeroCounter\(paidNoUsageUsers as ProfileEmailRow\[\] \| null\)\) \{\n {4}consider\(row, "paid_no_usage_checkin"\);/);
  assert.match(automation, /\.\.\.\(await zeroCounter\(neverUsers as ProfileEmailRow\[\] \| null\)\)/);
  assert.match(automation, /\(await hasOtherStories\(createAdminSupabase\(\), profile\.id, storyId\)\) === false/);
  // The generate route (protected) still only imports the email helper; it is not edited here.
  const route = readFileSync("app/api/generate/route.ts", "utf8");
  assert.match(route, /import \{ sendStoryMilestoneEmails \} from "@\/lib\/email\/automation";/);
});
