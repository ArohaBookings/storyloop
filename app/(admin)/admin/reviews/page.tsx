"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, EyeOff, Loader2, Star, Trash2 } from "lucide-react";

type Review = {
  id: string;
  reviewer_name: string;
  reviewer_role: string | null;
  rating: number;
  body: string;
  status: string;
  published_at: string | null;
  created_at: string;
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reviews");
      const data = await res.json();
      if (res.ok) setReviews(data.reviews ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = async (id: string, action: "publish" | "hide" | "delete") => {
    setBusy(id);
    try {
      await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const pending = reviews.filter((r) => r.status === "pending");
  const published = reviews.filter((r) => r.status === "published");
  const hidden = reviews.filter((r) => r.status === "hidden");

  const Card = ({ review }: { review: Review }) => (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? "fill-clay-400 text-clay-400" : "text-ink-700"}`} />
          ))}
        </div>
        <span className="text-[11px] text-ink-400">{review.created_at.slice(0, 10)}</span>
      </div>
      <p className="text-sm text-ink-100">{review.body}</p>
      <p className="mt-2 text-xs text-ink-300">
        {review.reviewer_name}
        {review.reviewer_role ? `, ${review.reviewer_role}` : ""}{" "}
        <span className="text-ink-400">(shown as {review.reviewer_name.split(/\s+/)[0]} {review.reviewer_name.split(/\s+/).slice(-1)[0]?.[0] ?? ""}.)</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {review.status !== "published" && (
          <button onClick={() => act(review.id, "publish")} disabled={busy === review.id} className="inline-flex items-center gap-1.5 rounded-lg bg-sage-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sage-500 disabled:opacity-50">
            {busy === review.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Publish
          </button>
        )}
        {review.status === "published" && (
          <button onClick={() => act(review.id, "hide")} disabled={busy === review.id} className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 px-3 py-1.5 text-xs font-bold text-ink-200 hover:border-clay-500">
            <EyeOff className="h-3 w-3" /> Unpublish
          </button>
        )}
        <button onClick={() => act(review.id, "delete")} disabled={busy === review.id} aria-label="Delete" className="rounded-lg border border-ink-700 px-2.5 py-1.5 text-ink-400 hover:text-red-400">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-ink-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
        <h1 className="font-display text-3xl font-bold">Reviews</h1>
        <p className="mt-1 text-sm text-ink-300">
          Publish a review and it appears on the landing page with the reviewer's first name and last initial only.
          The landing section stays hidden until at least one is published.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-ink-300"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading…</p>
        ) : (
          <div className="mt-6 space-y-8">
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-300">Waiting for you ({pending.length})</h2>
              {pending.length === 0 ? <p className="text-sm text-ink-400">Nothing waiting.</p> : (
                <div className="grid gap-3 sm:grid-cols-2">{pending.map((r) => <Card key={r.id} review={r} />)}</div>
              )}
            </section>
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-sage-300">Live on the site ({published.length})</h2>
              {published.length === 0 ? <p className="text-sm text-ink-400">None published yet. The landing page shows no reviews section until you publish one.</p> : (
                <div className="grid gap-3 sm:grid-cols-2">{published.map((r) => <Card key={r.id} review={r} />)}</div>
              )}
            </section>
            {hidden.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-300">Hidden ({hidden.length})</h2>
                <div className="grid gap-3 sm:grid-cols-2">{hidden.map((r) => <Card key={r.id} review={r} />)}</div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
