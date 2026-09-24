import assert from "node:assert/strict";
import test from "node:test";
import { aiFailureReason, summariseFallbacks } from "../lib/ai-health";

test("the reason a story fell back is named plainly", () => {
  // The real errors from production on 24 Sept 2026.
  assert.equal(aiFailureReason(new Error("OpenAI: 429 You have no credits remaining. Add credits to continue using the API | Anthropic: 401 {\"type\":\"error\",\"error\":{\"type\":\"authentication_error\",\"message\":\"API key is invalid.\"}}")), "openai_no_credit");
  assert.equal(aiFailureReason(new Error("401 {\"type\":\"error\",\"error\":{\"type\":\"authentication_error\",\"message\":\"API key is invalid.\"}}")), "invalid_key");
  assert.equal(aiFailureReason(new Error("No AI API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.")), "no_key");
  assert.equal(aiFailureReason(new Error("Request timed out.")), "timeout");
  assert.equal(aiFailureReason(new Error("429 Rate limit reached for gpt-5.5")), "rate_limited");
  assert.equal(aiFailureReason(new SyntaxError("Unexpected token } in JSON at position 10")), "bad_output");
  assert.equal(aiFailureReason("something odd"), "unknown");
});

test("the most urgent reason leads the admin alert", () => {
  const summary = summariseFallbacks(["timeout", "openai_no_credit", "timeout", "openai_no_credit", "openai_no_credit"]);
  assert.equal(summary.total, 5);
  assert.equal(summary.top?.reason, "openai_no_credit");
  assert.equal(summary.top?.count, 3);
  assert.match(summary.top?.fix ?? "", /platform\.openai\.com/);
  assert.equal(summariseFallbacks([]).top, null);
  assert.equal(summariseFallbacks(["made-up"]).top?.reason, "unknown");
});
