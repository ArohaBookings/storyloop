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

test("R1-09: a wall card's code never reaches an event or the stored landing page", async () => {
  const { cleanEventValue } = await import("../lib/analytics/events");
  assert.equal(cleanEventValue({ kind: "path" }, "/w/k7mq3rtx"), "/w");
  assert.equal(cleanEventValue({ kind: "path" }, "/w/k7mq3rtx/"), "/w");
  assert.equal(cleanEventValue({ kind: "path" }, "/pricing"), "/pricing");
  const client = readFileSync("lib/analytics/client.ts", "utf8");
  assert.match(client, /landingPath: window\.location\.pathname\.replace\(\/\^\\\/w\\\/\.\+\$\/, "\/w"\),/);
});

test("R1-06: the sharing switch says exactly what a leader sees", () => {
  const page = readFileSync("app/(app)/centre/page.tsx", "utf8");
  assert.match(page, /the notes each one came from, and the first names, ages and interests of the children in them/);
  assert.match(page, /Share my stories and notes with my leaders/);
  assert.doesNotMatch(page, /Share my stories with leadership/);
});

test("review 2: the data sheet states privacy facts only, and the end-of-year guide opens on her own curriculum", () => {
  const sheet = readFileSync("app/data-sheet/page.tsx", "utf8");
  assert.doesNotMatch(sheet, /daily diary|rolls, fees|subsidy admin|No photo or video sharing/);
  assert.match(sheet, /It takes and stores no photos or videos of children\./);
  // The hero drafter moved into the guide slot (components/marketing/StatementGuideHero, 25 Nov 2026).
  const slug = readFileSync("app/[slug]/page.tsx", "utf8") + readFileSync("components/marketing/StatementGuideHero.tsx", "utf8");
  assert.equal((slug.match(/followZone=\{(page\.)?slug === "end-of-year-learning-summary"\}/g) ?? []).length, 2, "the hero drafter and the one further down");
  const demo = readFileSync("components/marketing/TransitionDemo.tsx", "utf8");
  assert.match(demo, /const own = frameworkForZone\(zone\);\n\s+if \(\(choices \?\? \[\]\)\.includes\(own\)\) setFramework\(own\);/);
});
