import { test } from "node:test";
import assert from "node:assert/strict";
import { FIRST_STORY_PATH, STATEMENT_SIGNUP_HREF, signupDestination } from "../lib/signup-next";

test("a new account lands on the first story unless the link asks for a listed page", () => {
  assert.equal(signupDestination(null), FIRST_STORY_PATH);
  assert.equal(signupDestination(""), FIRST_STORY_PATH);
  assert.equal(signupDestination("/statement"), "/statement");
  assert.equal(signupDestination("/statement/"), "/statement");
  assert.equal(signupDestination("/statement?x=1#top"), "/statement", "only the path is kept");
});

test("nothing off the list, and nothing off the site", () => {
  for (const bad of [
    "/dashboard",
    "/billing",
    "/admin",
    "https://evil.example/statement",
    "//evil.example/statement",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "statement",
    "/statement-other",
    "/%2F%2Fevil.example",
  ]) {
    assert.equal(signupDestination(bad), FIRST_STORY_PATH, bad);
  }
});

test("the statement guides' button carries the destination signup accepts", () => {
  const next = new URL(STATEMENT_SIGNUP_HREF, "https://storyloop.space").searchParams.get("next");
  assert.equal(signupDestination(next), "/statement");
});
