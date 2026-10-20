import assert from "node:assert/strict";
import test from "node:test";
import { hasSignedInHint } from "../lib/auth/signed-in-hint";

test("recognises the Supabase session cookie, whole or split", () => {
  assert.equal(hasSignedInHint("sl_consent=all; sb-jzfynliquzvlldwthyll-auth-token=base64-abc"), true);
  assert.equal(hasSignedInHint("sb-127-auth-token.0=base64-abc; sb-127-auth-token.1=def"), true);
});

test("ignores other cookies and empty values", () => {
  assert.equal(hasSignedInHint(""), false);
  assert.equal(hasSignedInHint("sl_consent=all; storyloop_sid=123"), false);
  assert.equal(hasSignedInHint("sb-x-auth-token="), false);
  assert.equal(hasSignedInHint("sb-x-auth-token-code-verifier=abc"), false);
});
