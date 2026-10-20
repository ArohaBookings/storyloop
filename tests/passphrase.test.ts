import assert from "node:assert/strict";
import test from "node:test";
import { PASSPHRASE_WORDS, suggestPassphrase } from "../lib/passphrase";

test("suggested passwords are readable, long enough and vary", () => {
  assert.equal(new Set(PASSPHRASE_WORDS).size, PASSPHRASE_WORDS.length, "no duplicate words");
  assert.ok(PASSPHRASE_WORDS.every((w) => /^[a-z]+$/.test(w)), "plain letters only, so any keyboard can type them");
  const seen = new Set<string>();
  for (let i = 0; i < 500; i += 1) {
    const p = suggestPassphrase();
    assert.match(p, /^([A-Z][a-z]+-){5}\d{2}$/);
    assert.ok(p.length >= 16);
    seen.add(p);
  }
  assert.ok(seen.size > 490, "500 suggestions should almost never repeat");
});
