import assert from "node:assert/strict";
import test from "node:test";
import { loginPathFor } from "../lib/auth/visited-path";

test("a signed-out visit goes to sign-in and keeps where it was going", () => {
  assert.equal(loginPathFor("/billing?offer=activation"), "/login?redirect=%2Fbilling%3Foffer%3Dactivation");
  assert.equal(loginPathFor("/generate"), "/login?redirect=%2Fgenerate");
});

test("nothing unsafe or circular survives", () => {
  assert.equal(loginPathFor(null), "/login");
  assert.equal(loginPathFor(""), "/login");
  assert.equal(loginPathFor("//evil.example/x"), "/login");
  assert.equal(loginPathFor("https://evil.example/"), "/login");
  assert.equal(loginPathFor("/\\evil"), "/login");
  assert.equal(loginPathFor("/login?redirect=/billing"), "/login");
});
