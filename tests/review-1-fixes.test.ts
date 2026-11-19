import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { safeRedirectPath } from "../lib/safe-redirect";
import { SIGNUP_EMAIL_LINK_ON } from "../lib/auth/signup-link";

// Fixes from review 1 (19 Nov 2026), each proven here.

test("R1-02: a redirect never leaves the site, through dot segments, backslashes or encodings", () => {
  for (const bad of ["/.//evil.example", "/x/..//evil.example", "/%2e//evil.example", "/%2E%2E//evil.example", "/./%2f/evil.example", "/%2f%2fevil.example", "/%5c%5cevil.example", "/\\evil.example", "/\t/evil.example", "//evil.example", "https://evil.example", "/a/../..//evil.example"]) {
    const out = safeRedirectPath(bad);
    assert.ok(out === "/dashboard", `${JSON.stringify(bad)} -> ${out}`);
  }
  for (const good of ["/generate", "/statement?x=1", "/children/abc/transition#top", "/history"]) {
    assert.equal(safeRedirectPath(good), good);
  }
});

test("R1-05: while email-me-a-link is off, /auth/finish never signs in with a session from the address", () => {
  assert.equal(SIGNUP_EMAIL_LINK_ON, false);
  const page = readFileSync("app/auth/finish/page.tsx", "utf8");
  assert.match(page, /const viaLink = SIGNUP_EMAIL_LINK_ON && params\.get\("method"\) === "link";/);
  assert.match(page, /const fromLink = viaLink \? sessionFromHash\(hash\) : null;/, "the # part is only read through the switch");
  assert.equal((page.match(/setSession\(/g) ?? []).length, 1, "one place sets a session, and only with fromLink");
  assert.match(page, /fromLink\s*\?\s*createClient\(\)\.auth\.setSession\(fromLink\)/);
  const constant = readFileSync("lib/auth/signup-link.ts", "utf8");
  assert.match(constant, /SECURITY, before switching it on \(review 1, R1-05\)/, "the note beside the switch says a guard is needed");
});
