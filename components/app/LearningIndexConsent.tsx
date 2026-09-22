"use client";

import { useEffect, useState } from "react";
import { BarChart3, Check, Loader2 } from "lucide-react";

/**
 * The opt-in for the Early Learning Index.
 *
 * Written to be refused easily. A consent control that argues with you is not
 * collecting consent, it is collecting compliance, and the difference matters
 * most in a sector that has been asked to hand over data before.
 */
export default function LearningIndexConsent() {
  const [consentedAt, setConsentedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/learning-index/consent")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (active && data) setConsentedAt(data.consentedAt ?? null); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const toggle = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/learning-index/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consented: !consentedAt }),
      });
      if (res.ok) setConsentedAt(consentedAt ? null : new Date().toISOString());
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <section className="card p-5 md:p-6">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-ink-800 text-paper">
          <BarChart3 className="h-5 w-5" />
        </div>
        <div>
          <p className="section-title mb-1">Early Learning Index</p>
          <h2 className="font-display text-xl font-bold text-ink-900">What tamariki are exploring, counted across services</h2>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-ink-600">
        Ministries hold enrolment numbers and reviewers hold ratings. Nobody holds the moments. If enough services agree,
        StoryLoop can publish a picture, each quarter, of what children this age were actually exploring, by age band and
        region.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">
        <strong className="text-ink-800">What would leave your service: counts.</strong> How often a curriculum link or a
        disposition appeared, in which age band and quarter. Never a child, an educator, a story, your service, or
        anything anybody typed. Anything seen in fewer than three services is not published at all, and nothing is
        published until at least eight services have agreed.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={toggle} disabled={saving} className={consentedAt ? "btn-secondary text-sm" : "btn-primary text-sm"}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : consentedAt ? null : <Check className="h-4 w-4" />}
          {consentedAt ? "Stop contributing" : "Contribute counts to the Index"}
        </button>
        <p className="text-xs text-ink-500">
          {consentedAt ? "Contributing. You can stop at any time, and nothing further is counted." : "Off. Nothing is counted unless you turn this on."}
        </p>
      </div>
    </section>
  );
}
