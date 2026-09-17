import assert from "node:assert/strict";
import test from "node:test";
import { stripeTestServer } from "../lib/stripe-client";

test("the test server override is ignored on every Vercel deployment", () => {
  const base = { STRIPE_API_BASE_FOR_TESTS: "http://127.0.0.1:12111" };
  assert.equal(stripeTestServer({ ...base, VERCEL: "1" }), null);
  assert.equal(stripeTestServer({ ...base, VERCEL_ENV: "preview" }), null);
  assert.equal(stripeTestServer({ ...base, VERCEL_ENV: "production", ALLOW_STRIPE_TEST_SERVER: "1" }), null);
});

test("it only ever points at this machine, and a production build must opt in", () => {
  assert.deepEqual(stripeTestServer({ STRIPE_API_BASE_FOR_TESTS: "http://127.0.0.1:12111", NODE_ENV: "development" }), { host: "127.0.0.1", port: 12111, protocol: "http" });
  assert.equal(stripeTestServer({ STRIPE_API_BASE_FOR_TESTS: "https://api.evil.example", NODE_ENV: "development" }), null);
  assert.equal(stripeTestServer({ STRIPE_API_BASE_FOR_TESTS: "http://127.0.0.1:12111", NODE_ENV: "production" }), null);
  assert.deepEqual(stripeTestServer({ STRIPE_API_BASE_FOR_TESTS: "http://localhost:12111", NODE_ENV: "production", ALLOW_STRIPE_TEST_SERVER: "1" }), { host: "localhost", port: 12111, protocol: "http" });
  assert.equal(stripeTestServer({}), null);
  assert.equal(stripeTestServer({ STRIPE_API_BASE_FOR_TESTS: "not a url" }), null);
});
