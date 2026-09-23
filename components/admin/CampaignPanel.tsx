"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";

type Audience = {
  offer: string;
  toSend: number;
  excluded: Record<string, number>;
  recipients: Array<{ id: string; name: string | null; email: string | null; stories: number; lastSeen: string | null }>;
  funnel: { offered: number; sent: number; clicked: number; checkout: number; redeemed: number };
  preview: { subject: string; html: string };
};

const EXCLUDED_LABEL: Record<string, string> = {
  already_paid: "already paying",
  centre_member: "covered by a centre",
  unsubscribed: "unsubscribed",
  already_offered: "already offered",
  internal: "internal",
  inactive: "disabled",
  no_email: "no email",
};

/** The free-month campaign: who it goes to, a test to yourself, then batches. */
export default function CampaignPanel() {
  const [data, setData] = useState<Audience | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "test" | "send">("");
  const [notice, setNotice] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [showList, setShowList] = useState(false);

  const load = () =>
    fetch("/api/admin/campaigns/pro-month")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => { void load(); }, []);

  const test = async () => {
    setBusy("test"); setNotice("");
    const res = await fetch("/api/admin/campaigns/pro-month", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "test" }) });
    const body = await res.json().catch(() => ({}));
    setNotice(res.ok && body.ok ? `Test sent to ${body.to}. Check it on your phone before sending to anyone.` : `Test not sent: ${body.error ?? body.status ?? res.status}`);
    setBusy("");
  };

  const send = async () => {
    if (!data) return;
    const batch = Math.min(30, data.toSend);
    if (!window.confirm(`Send the free-month email to the next ${batch} educators? This cannot be undone.`)) return;
    setBusy("send"); setNotice("");
    const res = await fetch("/api/admin/campaigns/pro-month", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send", confirm: data.offer, limit: batch }),
    });
    const body = await res.json().catch(() => ({}));
    setNotice(res.ok ? `Sent ${body.sent} of ${body.results?.length ?? 0}. ${body.remaining} left to send.` : `Send failed: ${body.error ?? res.status}`);
    setBusy("");
    void load();
  };

  if (error) return <p className="text-sm text-red-300">Campaign data unavailable: {error}</p>;
  if (!data) return <p className="flex items-center gap-2 text-sm text-ink-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading the audience…</p>;

  const steps = [
    ["Offered", data.funnel.offered],
    ["Email sent", data.funnel.sent],
    ["Opened the offer", data.funnel.clicked],
    ["Opened checkout", data.funnel.checkout],
    ["Started the month", data.funnel.redeemed],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-5">
        {steps.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-ink-800 bg-ink-950/60 p-3">
            <p className="font-display text-2xl font-bold tabular-nums text-paper">{value}</p>
            <p className="text-xs text-ink-400">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-ink-300">
        <span className="font-semibold text-paper">{data.toSend} educators</span> would get it next. Left out:{" "}
        {Object.entries(data.excluded).map(([key, value]) => `${value} ${EXCLUDED_LABEL[key] ?? key}`).join(", ") || "nobody"}.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowPreview(!showPreview)} className="rounded-lg border border-ink-700 px-3 py-2 text-xs font-semibold text-ink-200 hover:border-clay-500">
          {showPreview ? "Hide" : "Preview"} the email
        </button>
        <button type="button" onClick={() => setShowList(!showList)} className="rounded-lg border border-ink-700 px-3 py-2 text-xs font-semibold text-ink-200 hover:border-clay-500">
          {showList ? "Hide" : "Show"} who gets it
        </button>
        <button type="button" onClick={test} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg border border-clay-500 px-3 py-2 text-xs font-semibold text-clay-300 hover:bg-clay-500/10 disabled:opacity-50">
          {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />} Send a test to me
        </button>
        <button type="button" onClick={send} disabled={Boolean(busy) || data.toSend === 0} className="inline-flex items-center gap-2 rounded-lg bg-clay-600 px-3 py-2 text-xs font-semibold text-paper hover:bg-clay-500 disabled:opacity-50">
          {busy === "send" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send the next {Math.min(30, data.toSend)}
        </button>
      </div>
      {notice && <p role="status" className="rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-200">{notice}</p>}
      {showPreview && (
        <div className="overflow-hidden rounded-xl border border-ink-700 bg-white">
          <p className="border-b border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-700">Subject: {data.preview.subject}</p>
          <iframe title="Email preview" srcDoc={data.preview.html} className="h-[900px] w-full" sandbox="" />
        </div>
      )}
      {showList && (
        <div className="max-h-80 overflow-y-auto rounded-xl border border-ink-800">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-ink-900 text-ink-400"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Stories</th><th className="px-3 py-2">Last seen</th></tr></thead>
            <tbody className="divide-y divide-ink-800">
              {data.recipients.map((person) => (
                <tr key={person.id}><td className="px-3 py-1.5 text-ink-200">{person.name ?? "(no name)"}</td><td className="px-3 py-1.5 text-ink-300">{person.email}</td><td className="px-3 py-1.5 tabular-nums text-ink-300">{person.stories}</td><td className="px-3 py-1.5 text-ink-400">{person.lastSeen ? person.lastSeen.slice(0, 10) : "never"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
