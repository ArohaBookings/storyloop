import assert from "node:assert/strict";
import test from "node:test";
import { cancellationFeedbackMetadata, MAX_CANCEL_COMMENT, summarizeCancellations } from "../lib/churn-reasons";

test("Stripe's cancellation details become bounded, known values", () => {
  assert.deepEqual(cancellationFeedbackMetadata({ feedback: "too_expensive", comment: "  Holidays coming up  " }), {
    cancel_feedback: "too_expensive",
    cancel_comment: "Holidays coming up",
  });
  assert.deepEqual(cancellationFeedbackMetadata({ feedback: "made_up", comment: "" }), {});
  assert.deepEqual(cancellationFeedbackMetadata({ feedback: "__proto__" }), {});
  assert.deepEqual(cancellationFeedbackMetadata(null), {});
  assert.deepEqual(cancellationFeedbackMetadata("too_expensive"), {});
  assert.equal(cancellationFeedbackMetadata({ comment: "x".repeat(2000) }).cancel_comment?.length, MAX_CANCEL_COMMENT);
});

test("a subscription that was cancelled and then ended counts once, with its reason", () => {
  const summary = summarizeCancellations([
    { email_type: "cancellation_scheduled", sent_at: "2026-09-01T02:00:00Z", metadata: { billing_key: "sub_a:cancel_scheduled:1791244800", cancel_feedback: "unused", cancel_comment: "Caught up for the term" } },
    // The ended email arrives later without details.
    { email_type: "subscription_cancelled", sent_at: "2026-10-14T00:00:00Z", metadata: { billing_key: "sub_a" } },
    { email_type: "subscription_cancelled", sent_at: "2026-09-10T00:00:00Z", metadata: { billing_key: "sub_b", cancel_feedback: "too_expensive" } },
    { email_type: "cancellation_scheduled", sent_at: "2026-09-12T00:00:00Z", metadata: { billing_key: "sub_c:cancel_scheduled:1" } },
    { email_type: "cancellation_scheduled", sent_at: "2026-09-13T00:00:00Z", metadata: { billing_key: "sub_d:cancel_scheduled:1", cancel_feedback: "unused" } },
    // Not cancellations, or unusable rows.
    { email_type: "payment_failed", sent_at: "2026-09-13T00:00:00Z", metadata: { billing_key: "in_1", cancel_feedback: "other" } },
    { email_type: "subscription_cancelled", sent_at: "2026-09-13T00:00:00Z", metadata: null },
  ]);

  assert.equal(summary.cancellations, 4);
  assert.equal(summary.withReason, 3);
  assert.deepEqual(summary.reasons, [
    { key: "unused", label: "Not using it enough", count: 2 },
    { key: "too_expensive", label: "Too expensive", count: 1 },
    { key: "not_given", label: "No reason given", count: 1 },
  ]);
  assert.deepEqual(summary.comments, [{ date: "2026-09-01", label: "Not using it enough", comment: "Caught up for the term" }]);
});

test("nothing to summarise is an honest zero", () => {
  assert.deepEqual(summarizeCancellations([]), { cancellations: 0, withReason: 0, reasons: [], comments: [] });
});
