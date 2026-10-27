import assert from "node:assert/strict";
import test from "node:test";

import { DIFFICULTY_BITS, PASS_MAX_AGE_MS, issuePass, leadingZeroBits, proofBits, solvePass, verifyPass } from "../lib/auth/human-pass";
import { isDisposableEmail } from "../lib/auth/disposable-email";

// The secret is read on each call, so setting it here is enough.
process.env.HUMAN_PASS_SECRET = "unit-test-secret-for-the-quiet-check";

test("leading zero bits are counted exactly", () => {
  assert.equal(leadingZeroBits(new Uint8Array([0xff])), 0);
  assert.equal(leadingZeroBits(new Uint8Array([0x0f])), 4);
  assert.equal(leadingZeroBits(new Uint8Array([0x00, 0x01])), 15);
  assert.equal(leadingZeroBits(new Uint8Array([0x00, 0x00, 0x80])), 16);
});

test("a fresh pass with a real proof is accepted, once per nonce", () => {
  const now = Date.now();
  const { pass, bits } = issuePass(now);
  assert.equal(bits, DIFFICULTY_BITS);
  const proof = solvePass(pass, bits);
  assert.ok(proofBits(pass, proof) >= bits);
  const check = verifyPass(pass, proof, now + 2000);
  assert.equal(check.ok, true);
  if (check.ok) assert.match(check.nonce, /^[A-Za-z0-9_-]{8,40}$/);
});

test("no pass, a forged pass, or a lazy proof is refused", () => {
  const now = Date.now();
  const { pass } = issuePass(now);
  const proof = solvePass(pass);
  assert.deepEqual(verifyPass(undefined, undefined, now), { ok: false, reason: "missing" });
  assert.deepEqual(verifyPass("", "1", now), { ok: false, reason: "missing" });
  const [issued, nonce] = pass.split(".");
  assert.deepEqual(verifyPass(`${issued}.${nonce}.forgedsignaturexxxxxxxxxxxxxxxxxxxxxxxxxxxxx`, proof, now).ok, false);
  assert.deepEqual(verifyPass(`${Number(issued) + 1}.${nonce}.${pass.split(".")[2]}`, proof, now).ok, false);
  // A proof that doesn't meet the difficulty.
  let weak = 0;
  while (proofBits(pass, weak) >= DIFFICULTY_BITS) weak += 1;
  assert.deepEqual(verifyPass(pass, String(weak), now), { ok: false, reason: "weak_proof" });
  assert.deepEqual(verifyPass(pass, "12abc", now), { ok: false, reason: "malformed" });
});

test("old passes expire; a pass signed with another secret is refused", () => {
  const now = Date.now();
  const { pass } = issuePass(now);
  const proof = solvePass(pass);
  assert.deepEqual(verifyPass(pass, proof, now + PASS_MAX_AGE_MS + 1000), { ok: false, reason: "expired" });
  process.env.HUMAN_PASS_SECRET = "a-different-secret";
  assert.deepEqual(verifyPass(pass, proof, now + 1000), { ok: false, reason: "bad_signature" });
  process.env.HUMAN_PASS_SECRET = "unit-test-secret-for-the-quiet-check";
});

test("throwaway inboxes are caught; everyday providers never are", () => {
  for (const email of ["a@mailinator.com", "b@necub.com", "c@sub.yopmail.com", "d@10minutemail.com", "E@GuerrillaMail.com"]) assert.equal(isDisposableEmail(email), true, email);
  for (const email of ["jane@gmail.com", "kiri@xtra.co.nz", "sam@bigpond.com", "a@outlook.com", "b@centre.co.nz", "c@icloud.com", "d@hotmail.com", "not-an-email"]) assert.equal(isDisposableEmail(email), false, email);
});
