"use client";
import { useCallback, useEffect, useState } from "react";
import { Building2, Check, Copy, Loader2, Mail, ShieldCheck, UserPlus } from "lucide-react";

type Member = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  shares_stories: boolean;
  stories_total: number;
  stories_30d: number;
  last_story_at: string | null;
};

type CentreState = {
  centre: { id: string; name: string; plan: string | null; seatLimit: number; seatsUsed: number; seatsRemaining: number } | null;
  membership: { role: string; sharesStories: boolean } | null;
  members: Member[];
};

const DAY = 24 * 60 * 60 * 1000;

function lastActive(value: string | null) {
  if (!value) return "no stories yet";
  const days = Math.floor((Date.now() - new Date(value).getTime()) / DAY);
  if (Number.isNaN(days)) return "no stories yet";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export default function CentrePage() {
  const [state, setState] = useState<CentreState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/centres");
      if (!response.ok) throw new Error("Could not load your centre.");
      setState(await response.json());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your centre.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createCentre = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/centres", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create the centre.");
      setName("");
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create the centre.");
    } finally { setBusy(false); }
  };

  // A director invites the whole team at once: paste a list, separated by
  // commas, spaces or new lines. Each invite is its own request, so one bad
  // address never stops the rest, and the seat limit is enforced by the server.
  const invite = async () => {
    const emails = [...new Set(inviteEmail.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
    if (!emails.length) return;
    setBusy(true); setError(""); setNotice("");
    const sent: string[] = [];
    const links: string[] = [];
    const failed: string[] = [];
    for (const email of emails) {
      try {
        const response = await fetch("/api/centres/invites", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not send that invitation.");
        if (data.emailSent) sent.push(email);
        else links.push(`${email}: ${window.location.origin}${data.shareUrl}`);
      } catch (inviteError) {
        failed.push(`${email} (${inviteError instanceof Error ? inviteError.message : "could not invite"})`);
      }
    }
    const parts = [];
    if (sent.length) parts.push(`Invitation${sent.length === 1 ? "" : "s"} emailed to ${sent.join(", ")}.`);
    if (links.length) parts.push(`Email could not be sent for these, so share their links: ${links.join("  ")}`);
    if (parts.length) setNotice(parts.join(" "));
    if (failed.length) setError(`Not invited: ${failed.join("; ")}`);
    setInviteEmail(failed.map((f) => f.split(" ")[0]).join("\n"));
    await load();
    setBusy(false);
  };

  const setSharing = async (next: boolean) => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/centres/sharing", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharesStories: next }),
      });
      if (!response.ok) throw new Error("Could not save that.");
      await load();
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "Could not save that.");
    } finally { setBusy(false); }
  };

  if (loading) {
    return <div className="flex items-center gap-2 p-8 text-ink-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading your centre…</div>;
  }

  const centre = state?.centre;
  const membership = state?.membership;
  const isLeader = membership?.role === "owner" || membership?.role === "admin";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="section-title mb-1">Centre</p>
        <h1 className="font-display text-3xl font-bold text-ink-900">
          {centre ? centre.name : "Work as a team"}
        </h1>
      </div>

      {error && <div className="mb-4 rounded-2xl border border-clay-200 bg-clay-50 p-3 text-sm text-clay-800">{error}</div>}
      {notice && <div className="mb-4 rounded-2xl border border-sage-200 bg-sage-50 p-3 text-sm text-ink-700">{notice}</div>}

      {!centre ? (
        <div className="card p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-clay-700 text-paper">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold text-ink-900">Set up your centre</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                Bring your team onto StoryLoop with their own logins. You will see who is writing and when.
                You will not see what they wrote unless they choose to share it.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="centre-name" className="sr-only">Your centre's name</label>
            <input
              id="centre-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sunnyside Early Learning"
              className="input flex-1"
            />
            <button onClick={createCentre} disabled={busy || name.trim().length < 2} className="btn-primary flex-none">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              Create centre
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm text-ink-600">
                <strong className="font-semibold text-ink-900">{centre.seatsUsed}</strong> of {centre.seatLimit} seats used
              </p>
              <p className="mt-0.5 text-xs text-ink-500">{centre.seatsRemaining} still available</p>
            </div>
            <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-bold text-sage-800">
              {membership?.role}
            </span>
          </div>

          {/* The consent switch. Every member sees this, including leadership. */}
          <div className="card p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-sage-600" />
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold text-ink-900">Your drafts</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-600">
                  {membership?.sharesStories
                    ? "Your centre's leadership can read the stories you write. You can turn this off at any time."
                    : "Your centre can see that you are writing and when, but cannot read your stories. Turning this on lets leadership read them, for moderation and support."}
                </p>
                <button
                  onClick={() => setSharing(!membership?.sharesStories)}
                  disabled={busy}
                  className={membership?.sharesStories ? "btn-secondary mt-3 text-xs" : "btn-primary mt-3 text-xs"}
                >
                  {membership?.sharesStories ? "Stop sharing my stories" : "Share my stories with leadership"}
                </button>
              </div>
            </div>
          </div>

          {isLeader && (
            <>
              <div className="card p-5">
                <h2 className="mb-1 font-display text-lg font-bold text-ink-900">Invite your team</h2>
                <p className="mb-3 text-sm text-ink-600">
                  Paste one or more email addresses. Each educator gets their own login, their own children and their own
                  drafts. {centre.seatsRemaining} {centre.seatsRemaining === 1 ? "seat" : "seats"} left.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <label htmlFor="invite-email" className="sr-only">Email addresses to invite</label>
                  <textarea
                    id="invite-email"
                    rows={3}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={"aroha@centre.co.nz\nsam@centre.co.nz"}
                    className="input flex-1 resize-y"
                  />
                  <button
                    onClick={invite}
                    disabled={busy || !inviteEmail.trim() || centre.seatsRemaining <= 0}
                    className="btn-primary flex-none"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Send invites
                  </button>
                </div>
                {centre.seatsRemaining <= 0 && (
                  <p className="mt-2 text-xs text-clay-700">All seats are in use. Free one up or move to a larger plan.</p>
                )}
              </div>

              <div className="card p-5">
                <h2 className="mb-3 font-display text-lg font-bold text-ink-900">Your team</h2>
                <div className="space-y-2">
                  {state?.members.map((m) => (
                    <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-clay-100 bg-cream-50 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">{m.full_name || m.email || "Educator"}</p>
                        <p className="text-xs text-ink-500">
                          {m.stories_30d} stories in 30 days · last wrote {lastActive(m.last_story_at)}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${m.shares_stories ? "bg-sage-100 text-sage-800" : "bg-ink-100 text-ink-500"}`}>
                        {m.shares_stories ? "Sharing stories" : "Activity only"}
                      </span>
                    </div>
                  ))}
                  {!state?.members.length && <p className="text-sm text-ink-500">Nobody has joined yet.</p>}
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-ink-500">
                  <Mail className="mt-0.5 h-3.5 w-3.5 flex-none" />
                  You see counts and recency for everyone. You see the writing itself only for educators marked
                  as sharing, and that is theirs to decide.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {centre && (
        <button
          onClick={() => {
            void navigator.clipboard.writeText(`${window.location.origin}/centre`);
            setCopied(true); window.setTimeout(() => setCopied(false), 2000);
          }}
          className="btn-ghost mt-6 text-xs"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Link copied" : "Copy centre link"}
        </button>
      )}
    </div>
  );
}
