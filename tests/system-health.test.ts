import assert from "node:assert/strict";
import test from "node:test";
import {
  demoReliability,
  emailTone,
  summarizeEmailEvents,
  webhookTone,
  worstTone,
} from "../lib/system-health";

test("email summary counts sent, failed and skipped, and computes failure over attempts only", () => {
  const s = summarizeEmailEvents([
    { email_type: "payment_failed", delivery_status: "sent" },
    { email_type: "payment_failed", delivery_status: "failed" },
    { email_type: "welcome", delivery_status: "sent" },
    { email_type: "welcome", delivery_status: "skipped_duplicate" },
    { email_type: "welcome", delivery_status: "skipped_unsubscribed" },
  ]);
  assert.equal(s.sent, 2);
  assert.equal(s.failed, 1);
  assert.equal(s.failureRate, 1 / 3, "skips are not attempts");
  assert.equal(s.byType[0].type, "payment_failed", "worst failure rate first");
});

test("no attempts means no failure rate, not zero", () => {
  assert.equal(summarizeEmailEvents([]).failureRate, null);
  assert.equal(summarizeEmailEvents([{ email_type: "welcome", delivery_status: "skipped_duplicate" }]).failureRate, null);
});

test("a missing email key with nothing delivered is critical, because payment notices stop too", () => {
  const s = summarizeEmailEvents([
    { email_type: "payment_failed", delivery_status: "skipped_unconfigured" },
    { email_type: "welcome", delivery_status: "skipped_unconfigured" },
  ]);
  assert.equal(emailTone(s), "critical");
});

test("email tone escalates with failure rate", () => {
  const rows = (sent: number, failed: number) => [
    ...Array.from({ length: sent }, () => ({ email_type: "x", delivery_status: "sent" })),
    ...Array.from({ length: failed }, () => ({ email_type: "x", delivery_status: "failed" })),
  ];
  assert.equal(emailTone(summarizeEmailEvents(rows(100, 0))), "ok");
  assert.equal(emailTone(summarizeEmailEvents(rows(95, 5))), "warn");
  assert.equal(emailTone(summarizeEmailEvents(rows(80, 20))), "critical");
});

test("demo reliability flags a landing demo that fails visitors", () => {
  assert.equal(demoReliability({ started: 50, completed: 49, errors: 1 }).tone, "ok");
  assert.equal(demoReliability({ started: 50, completed: 46, errors: 4 }).tone, "warn");
  assert.equal(demoReliability({ started: 50, completed: 30, errors: 10 }).tone, "critical");
  assert.equal(demoReliability({ started: 0, completed: 0, errors: 0 }).errorRate, null);
});

test("demo reliability shrugs off negative or missing counts", () => {
  const r = demoReliability({ started: -5, completed: Number.NaN, errors: -1 });
  assert.equal(r.started, 0);
  assert.equal(r.errorRate, null);
});

test("a webhook stuck processing is critical even with zero failures", () => {
  assert.equal(webhookTone({ total: 100, processed: 99, failed: 0, stuck_processing: 1 }), "critical");
});

test("webhook tone: clean is ok, occasional failure warns, a high failure share is critical", () => {
  assert.equal(webhookTone({ total: 100, processed: 100, failed: 0, stuck_processing: 0 }), "ok");
  assert.equal(webhookTone({ total: 100, processed: 98, failed: 2, stuck_processing: 0 }), "warn");
  assert.equal(webhookTone({ total: 100, processed: 90, failed: 10, stuck_processing: 0 }), "critical");
});

test("unknown webhook health warns rather than claiming all is well", () => {
  assert.equal(webhookTone(null), "warn");
});

test("the overall light is the worst of its parts", () => {
  assert.equal(worstTone(["ok", "warn", "ok"]), "warn");
  assert.equal(worstTone(["ok", "critical", "warn"]), "critical");
  assert.equal(worstTone([]), "ok");
});
