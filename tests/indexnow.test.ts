import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { INDEXNOW_KEY, indexNowPayload, shouldSubmit, submitToIndexNow } from "../lib/indexnow";

test("the key file the engines check exists and contains exactly the key", () => {
  const file = new URL(`../public/${INDEXNOW_KEY}.txt`, import.meta.url);
  assert.ok(existsSync(file));
  assert.equal(readFileSync(file, "utf8"), INDEXNOW_KEY);
  assert.match(INDEXNOW_KEY, /^[a-f0-9]{32}$/);
});

test("only https storyloop.space URLs are submitted, once each", () => {
  const payload = indexNowPayload([
    "/blog/a",
    "blog/a",
    "https://storyloop.space/blog/a",
    "https://evil.example/x",
    "http://storyloop.space/insecure",
    "https://storyloop.space/pricing",
    "/has space",
  ]);
  assert.equal(payload.host, "storyloop.space");
  assert.equal(payload.key, INDEXNOW_KEY);
  assert.equal(payload.keyLocation, `https://storyloop.space/${INDEXNOW_KEY}.txt`);
  assert.deepEqual(payload.urlList, ["https://storyloop.space/blog/a", "https://storyloop.space/pricing"]);
});

test("nothing is submitted from previews or local development", async () => {
  assert.equal(shouldSubmit({ VERCEL_ENV: "production" }), true);
  assert.equal(shouldSubmit({ VERCEL_ENV: "preview" }), false);
  assert.equal(shouldSubmit({}), false);
  let called = false;
  const fetchImpl = (async () => { called = true; return new Response(null, { status: 200 }); }) as typeof fetch;
  assert.deepEqual(await submitToIndexNow(["/pricing"], { env: { VERCEL_ENV: "preview" }, fetchImpl }), { submitted: 0, status: null, skipped: "not_production" });
  assert.equal(called, false);
});

test("in production it posts the payload, and a network failure never throws", async () => {
  let body: unknown = null;
  const ok = (async (_url: unknown, init?: RequestInit) => { body = JSON.parse(String(init?.body)); return new Response(null, { status: 202 }); }) as typeof fetch;
  const result = await submitToIndexNow(["/pricing", "/blog"], { env: { VERCEL_ENV: "production" }, fetchImpl: ok });
  assert.deepEqual(result, { submitted: 2, status: 202 });
  assert.deepEqual((body as { urlList: string[] }).urlList, ["https://storyloop.space/pricing", "https://storyloop.space/blog"]);

  const failing = (async () => { throw new Error("offline"); }) as typeof fetch;
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await submitToIndexNow(["/pricing"], { env: { VERCEL_ENV: "production" }, fetchImpl: failing }), { submitted: 0, status: null, skipped: "request_failed" });
  } finally {
    console.error = originalError;
  }
});
