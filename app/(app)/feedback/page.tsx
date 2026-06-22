"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle, Loader2, MessageSquareText, Send, Sparkles } from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "story_quality", label: "Story quality" },
  { value: "feature_request", label: "Feature request" },
  { value: "bug", label: "Bug or broken flow" },
  { value: "billing", label: "Billing or upgrade" },
  { value: "centre_rollout", label: "Centre rollout" },
  { value: "mobile", label: "Phone or tablet fit" },
  { value: "other", label: "Other" },
];

export default function FeedbackPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [category, setCategory] = useState("feature_request");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const requested = searchParams.get("category");
    if (requested && CATEGORY_OPTIONS.some((option) => option.value === requested)) {
      setCategory(requested);
    }
  }, [searchParams]);

  const submitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, page: pathname }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not send feedback.");
      setSent(true);
      setMessage("");
    } catch (feedbackError) {
      setError(feedbackError instanceof Error ? feedbackError.message : "Could not send feedback.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-clay-200 bg-gradient-to-br from-cream-100 via-white to-sage-50 p-6 md:p-8 shadow-warm animate-fade-up">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-clay-300/20 blur-3xl" />
        <div className="absolute -bottom-24 left-8 h-56 w-56 rounded-full bg-sage-200/30 blur-3xl" />
        <div className="relative z-10 max-w-3xl">
          <p className="section-title mb-3">Feedback loop</p>
          <h1 className="font-display text-4xl font-bold text-ink-900">Tell us exactly what would make StoryLoop worth keeping.</h1>
          <p className="mt-3 text-sm text-ink-600 md:text-base">
            Your message goes word-for-word into the admin dashboard so it can be used to improve story quality, conversion, support, and the product roadmap.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.75fr]">
        <form onSubmit={submitFeedback} className="card p-5 md:p-6">
          {sent && (
            <div className="mb-5 rounded-2xl border border-sage-200 bg-sage-50 p-4 text-sm text-sage-800">
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>Feedback sent. It is now visible in the StoryLoop admin dashboard.</p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="label">What is this about?</label>
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="input">
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Your exact feedback</label>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={10}
              className="input resize-y text-sm leading-relaxed"
              placeholder="Example: The story is useful, but I still spend time rewriting the family version. I wish it gave me a shorter parent message and a question to ask at home."
              required
            />
            <p className="mt-2 text-xs text-ink-500">{message.length}/5000 characters. Plain text is best.</p>
          </div>

          {error && <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>}

          <button type="submit" disabled={loading || message.trim().length < 3} className="btn-primary mt-5 w-full justify-center py-3 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send feedback
          </button>
        </form>

        <div className="space-y-4">
          <div className="card-warm p-5 md:p-6">
            <MessageSquareText className="mb-4 h-6 w-6 text-clay-700" />
            <h2 className="font-display text-2xl font-bold text-ink-900">What helps most</h2>
            <div className="mt-4 grid gap-3 text-sm text-ink-600">
              <p className="rounded-2xl bg-white/70 p-3">Where the story still sounds wrong or too generic.</p>
              <p className="rounded-2xl bg-white/70 p-3">The task that eats the most time after generating a draft.</p>
              <p className="rounded-2xl bg-white/70 p-3">What would make you upgrade without feeling pushed.</p>
              <p className="rounded-2xl bg-white/70 p-3">Any page that feels cramped, broken, or awkward on phone.</p>
            </div>
          </div>

          <div className="card p-5 md:p-6">
            <Sparkles className="mb-4 h-6 w-6 text-clay-700" />
            <h2 className="font-display text-2xl font-bold text-ink-900">Keep moving</h2>
            <div className="mt-4 grid gap-2">
              <Link href="/generate" className="btn-secondary justify-between">
                Create a story <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/billing?offer=activation" className="btn-secondary justify-between">
                See plan features <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/support" className="btn-secondary justify-between">
                Contact support <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
