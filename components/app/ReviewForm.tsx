"use client";

import { useState } from "react";
import { Check, Loader2, Star } from "lucide-react";

/** Educators leave a review from Support. It is held for moderation, so the
 *  form is honest about that: it thanks them and says a human will read it. */
export default function ReviewForm() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [role, setRole] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!rating) { setError("Please choose a star rating."); return; }
    setSending(true); setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, role, body }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Could not send your review."); return; }
      setSent(true);
    } catch {
      setError("Could not send your review.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <section className="card p-6 md:p-7">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage-600 text-paper">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">Thank you, that means a lot.</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">
              A real person reads every review. If it helps other educators understand StoryLoop, it may appear on
              our site with just your first name and last initial.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card p-6 md:p-7">
      <p className="section-title mb-1">Leave a review</p>
      <h2 className="font-display text-xl font-bold text-ink-900">If StoryLoop has helped, tell other educators.</h2>
      <p className="mt-1 text-sm text-ink-600">
        We may share it on our site with your first name and last initial only. Never your email.
      </p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Star rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n === 1 ? "" : "s"}`}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="p-0.5"
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  n <= (hover || rating) ? "fill-clay-500 text-clay-500" : "text-clay-200"
                }`}
              />
            </button>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="review-role">Your role (optional)</label>
          <input
            id="review-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Kaiako, centre manager, home based educator..."
            className="input"
          />
        </div>

        <div>
          <label className="label" htmlFor="review-body">Your review</label>
          <textarea
            id="review-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="What has StoryLoop changed for you?"
            className="input resize-none"
          />
        </div>

        {error && <p className="rounded-xl border border-clay-200 bg-clay-50 px-3 py-2 text-xs text-clay-700">{error}</p>}

        <button type="submit" disabled={sending} className="btn-primary disabled:opacity-50">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
          Send review
        </button>
      </form>
    </section>
  );
}
