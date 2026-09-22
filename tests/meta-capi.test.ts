import assert from "node:assert/strict";
import test from "node:test";
import { buildMetaEvent, fbcFromClick, hashedExternalId, isValidFbc, metaConfigured, sendMetaEvent } from "../lib/meta-capi";

const NOW = Date.UTC(2026, 8, 23, 2, 0, 0);
const CLICK = "IwAR2abcDEF_ghi-JKL123";
const ON = { META_PIXEL_ID: "1234567890", META_CAPI_TOKEN: "token" };

test("off unless both the pixel id and the token are set", () => {
  assert.equal(metaConfigured({}), false);
  assert.equal(metaConfigured({ META_PIXEL_ID: "1" }), false);
  assert.equal(metaConfigured({ META_PIXEL_ID: " ", META_CAPI_TOKEN: "t" }), false);
  assert.equal(metaConfigured(ON), true);
});

test("a click becomes Meta's fbc value, and junk does not", () => {
  assert.equal(fbcFromClick(CLICK, NOW - 5000, NOW), `fb.1.${NOW - 5000}.${CLICK}`);
  assert.equal(fbcFromClick("short", NOW, NOW), null);
  assert.equal(fbcFromClick("<script>alert(1)</script>", NOW, NOW), null);
  assert.equal(fbcFromClick(CLICK, NOW + 10 * 60_000, NOW), null, "a click from the future is tampered");
  assert.equal(fbcFromClick(CLICK, NOW - 100 * 86_400_000, NOW), null, "too old to attribute");
  assert.ok(isValidFbc(fbcFromClick(CLICK, undefined, NOW)));
});

test("what is sent is the minimum: no email, name, IP, or anything about a child", () => {
  const event = buildMetaEvent({
    eventName: "CompleteRegistration",
    eventId: "signup:u1",
    userId: "11111111-2222-3333-4444-555555555555",
    fbc: `fb.1.${NOW}.${CLICK}`,
    userAgent: "Mozilla/5.0",
    sourceUrl: "https://storyloop.space/signup",
    eventTimeSeconds: 1790000000,
  });
  assert.deepEqual(Object.keys(event.user_data).sort(), ["client_user_agent", "external_id", "fbc"]);
  assert.equal(event.user_data.external_id[0], hashedExternalId("11111111-2222-3333-4444-555555555555"));
  assert.doesNotMatch(JSON.stringify(event), /11111111-2222/, "the raw account id never leaves");
  assert.doesNotMatch(JSON.stringify(event), /@|client_ip_address|"em"|"ph"|"fn"|"ln"/);
  assert.equal(event.action_source, "website");
});

test("nothing is sent when switched off, or for someone who did not come from an ad", async () => {
  let calls = 0;
  const fetcher = (async () => { calls++; return new Response("{}"); }) as typeof fetch;
  const base = { eventName: "CompleteRegistration" as const, eventId: "e", userId: "u", userAgent: null, sourceUrl: "https://storyloop.space/signup" };
  assert.deepEqual(await sendMetaEvent({ ...base, fbc: `fb.1.${NOW}.${CLICK}` }, {}, fetcher), { sent: false, reason: "not_configured" });
  assert.deepEqual(await sendMetaEvent({ ...base, fbc: undefined }, ON, fetcher), { sent: false, reason: "not_from_an_ad_click" });
  assert.deepEqual(await sendMetaEvent({ ...base, fbc: "fb.1.123.bad value" }, ON, fetcher), { sent: false, reason: "not_from_an_ad_click" });
  assert.equal(calls, 0);
});

test("when on, it posts one event to the pixel, with the test code if given", async () => {
  let seen: { url: string; body: { data: unknown[]; test_event_code?: string } } | null = null;
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    seen = { url: String(url), body: JSON.parse(String(init?.body)) };
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  const result = await sendMetaEvent(
    { eventName: "StartTrial", eventId: "trial:sub_1", userId: "u", userAgent: null, actionSource: "system_generated", sourceUrl: "https://storyloop.space/billing", fbc: `fb.1.${NOW}.${CLICK}` },
    { ...ON, META_TEST_EVENT_CODE: "TEST123" },
    fetcher,
  );
  assert.deepEqual(result, { sent: true });
  assert.match(seen!.url, /^https:\/\/graph\.facebook\.com\/v\d+\.\d+\/1234567890\/events\?access_token=token$/);
  assert.equal(seen!.body.data.length, 1);
  assert.equal(seen!.body.test_event_code, "TEST123");
});

test("a failure or a hang never throws into the caller", async () => {
  const failing = (async () => { throw new Error("network down"); }) as typeof fetch;
  const rejected = (async () => new Response("no", { status: 400 })) as typeof fetch;
  const input = { eventName: "CompleteRegistration" as const, eventId: "e", userId: "u", userAgent: "UA", sourceUrl: "https://storyloop.space/signup", fbc: `fb.1.${NOW}.${CLICK}` };
  assert.deepEqual(await sendMetaEvent(input, ON, failing), { sent: false, reason: "error" });
  assert.deepEqual(await sendMetaEvent(input, ON, rejected), { sent: false, reason: "http_400" });
});
