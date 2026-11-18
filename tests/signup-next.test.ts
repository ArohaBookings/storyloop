import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  FIRST_STORY_PATH,
  SIGNUP_DESTINATIONS,
  SIGNUP_FRONT_DOORS,
  STATEMENT_SIGNUP_HREF,
  existingAccountDestination,
  isAppDestination,
  loginPathForDestination,
  signupDestination,
  signupPathFor,
} from "../lib/signup-next";
import { loginPathFor } from "../lib/auth/visited-path";

test("a new account lands on the first story unless the link asks for a listed page", () => {
  assert.equal(signupDestination(null), FIRST_STORY_PATH);
  assert.equal(signupDestination(""), FIRST_STORY_PATH);
  assert.equal(signupDestination("/statement"), "/statement");
  assert.equal(signupDestination("/statement/"), "/statement");
  assert.equal(signupDestination("/statement?x=1#top"), "/statement", "only the path is kept");
});

test("a signed-out visit to an app page comes back to that page after signup (19 Nov dead end)", () => {
  for (const page of ["/statement", "/today", "/year", "/children", "/group", "/room", "/centre"]) {
    assert.equal(signupDestination(page), page, page);
    assert.equal(signupDestination(`${page}?from=email`), page, `${page} with a query`);
  }
  // The app's front doors start a new account on the guided first story.
  for (const door of ["/generate", "/generate?welcome=1", "/dashboard", "/billing", "/billing?offer=activation"]) {
    assert.equal(signupDestination(door), FIRST_STORY_PATH, door);
  }
  // A deeper page belongs to an account that already has children and stories.
  assert.equal(signupDestination("/children/0d6f1f0e-3a55-4c8a-9a3e-5f0f1b2c3d4e/transition"), FIRST_STORY_PATH);
});

test("nothing off the list, and nothing off the site", () => {
  for (const bad of [
    "/dashboard",
    "/billing",
    "/admin",
    "/login",
    "/signup",
    "/auth/finish",
    "/api/auth/signup",
    "/pricing",
    "https://evil.example/statement",
    "//evil.example/statement",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "statement",
    "/statement-other",
    "/%2F%2Fevil.example",
    "/\t/evil.example",
    "/\n/evil.example/statement",
  ]) {
    assert.equal(signupDestination(bad), FIRST_STORY_PATH, JSON.stringify(bad));
  }
});

test("every page of the signed-in app is either a destination or a front door", () => {
  const appDir = join(process.cwd(), "app", "(app)");
  const pages = readdirSync(appDir).filter((name) => statSync(join(appDir, name)).isDirectory());
  assert.ok(pages.length > 10, "app/(app) was read");
  for (const name of pages) {
    const path = `/${name}`;
    assert.ok(SIGNUP_DESTINATIONS.has(path) || SIGNUP_FRONT_DOORS.has(path), `${path} is on neither list in lib/signup-next.ts`);
  }
  for (const path of [...SIGNUP_DESTINATIONS, ...SIGNUP_FRONT_DOORS]) {
    assert.ok(pages.includes(path.slice(1)), `${path} is listed but app/(app)${path} does not exist`);
  }
});

test("the sign-in page knows when a redirect is a page of the app", () => {
  assert.equal(isAppDestination("/statement"), true);
  assert.equal(isAppDestination("/dashboard"), true);
  assert.equal(isAppDestination("/generate?welcome=1"), true);
  assert.equal(isAppDestination("/billing/receipt/in_123"), true);
  assert.equal(isAppDestination("/children/abc/term"), true);
  for (const other of [null, "", "/", "/pricing", "/offer/pro-month", "/login", "https://evil.example/statement", "//evil.example/dashboard"]) {
    assert.equal(isAppDestination(other), false, String(other));
  }
});

test("create-account and sign-in links carry the page both ways", () => {
  assert.equal(signupPathFor("/statement"), "/signup?next=%2Fstatement");
  assert.equal(signupPathFor("/today?x=1"), "/signup?next=%2Ftoday");
  assert.equal(signupPathFor("/dashboard"), "/signup");
  assert.equal(signupPathFor("https://evil.example/statement"), "/signup");
  assert.equal(signupPathFor(null), "/signup");
  // The signed-out visit, the sign-in page and the signup page agree on the page.
  const login = loginPathFor("/statement");
  const redirect = new URL(login, "https://storyloop.space").searchParams.get("redirect");
  assert.equal(signupPathFor(redirect), "/signup?next=%2Fstatement");
  assert.equal(loginPathForDestination("/statement"), "/login?redirect=%2Fstatement");
  assert.equal(loginPathForDestination(FIRST_STORY_PATH), "/login");
  assert.equal(loginPathForDestination("/statement", { email_link: "1" }), "/login?redirect=%2Fstatement&email_link=1");
  assert.equal(loginPathForDestination(FIRST_STORY_PATH, { email_link: "1" }), "/login?email_link=1");
});

test("someone who already has an account goes home, to the page she came for, or to Billing", () => {
  assert.equal(existingAccountDestination(FIRST_STORY_PATH, "free"), "/dashboard");
  assert.equal(existingAccountDestination("/statement", "free"), "/statement");
  assert.equal(existingAccountDestination("/statement", "educator"), "/billing");
  assert.equal(existingAccountDestination(FIRST_STORY_PATH, "centre_starter"), "/billing");
});

test("the statement guides' button carries the destination signup accepts", () => {
  const next = new URL(STATEMENT_SIGNUP_HREF, "https://storyloop.space").searchParams.get("next");
  assert.equal(signupDestination(next), "/statement");
});
