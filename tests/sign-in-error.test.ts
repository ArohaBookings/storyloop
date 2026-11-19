import assert from "node:assert/strict";
import test from "node:test";
import { signInErrorMessage } from "../lib/auth/sign-in-error";

const plain = { googleOn: false, offerSignup: false };

test("a wrong password says what to do, with Google and a free account when they apply", () => {
  const wrong = { message: "Invalid login credentials", status: 400, code: "invalid_credentials" };
  assert.equal(signInErrorMessage(wrong, plain), "That email and password don't match. Or reset your password below.");
  assert.equal(
    signInErrorMessage(wrong, { googleOn: true, offerSignup: true }),
    "That email and password don't match. If you signed up with Google, use Continue with Google above. Or reset your password below. New here? Create a free account above.",
  );
  // An older server without error codes says the same in words.
  assert.match(signInErrorMessage({ message: "Invalid login credentials", status: 400 }, plain), /don't match/);
});

test("nothing Supabase or the browser says is ever shown raw", () => {
  const cases = [
    { message: "Failed to fetch", status: 0 },
    { message: "Load failed" },
    { message: "NetworkError when attempting to fetch resource." },
    { message: "Request rate limit reached", status: 429, code: "over_request_rate_limit" },
    { message: "User is banned", status: 400, code: "user_banned" },
    { message: "Email not confirmed", status: 400, code: "email_not_confirmed" },
    { message: "<html>502 Bad Gateway</html>", status: 502 },
    { message: "{}", status: 500 },
    { message: "", status: 0 },
    {},
  ];
  for (const error of cases) {
    const said = signInErrorMessage(error, plain);
    if (error.message) assert.ok(!said.includes(error.message), `raw text shown for ${JSON.stringify(error)}: ${said}`);
    assert.ok(/\.$/.test(said) && said.length > 30, said);
  }
});

test("each refusal has its own next step", () => {
  assert.match(signInErrorMessage({ message: "Failed to fetch", status: 0 }, plain), /couldn't reach StoryLoop/);
  assert.match(signInErrorMessage({ message: "Request rate limit reached", status: 429 }, plain), /Wait a few minutes/);
  assert.match(signInErrorMessage({ message: "User is banned", status: 400, code: "user_banned" }, plain), /disabled/);
  assert.match(signInErrorMessage({ message: "Email not confirmed", status: 400, code: "email_not_confirmed" }, plain), /sign-in link/);
  assert.match(signInErrorMessage({ message: "<html>502</html>", status: 502 }, plain), /try again in a moment/);
});
