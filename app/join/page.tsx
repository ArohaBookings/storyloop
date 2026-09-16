"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

/**
 * Accepting a centre invitation.
 *
 * Public on purpose. Most invitees have no StoryLoop account yet, and the
 * signed-in area would bounce them to /login and throw the token away. So the
 * token is stashed in sessionStorage the moment the page loads, which lets it
 * survive the round trip through signup, and the acceptance is retried
 * automatically when they come back.
 */
const TOKEN_KEY = "storyloop-centre-invite-token";

type Status = "working" | "joined" | "needs_account" | "failed";

function JoinInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState<Status>("working");
  const [message, setMessage] = useState("");
  const [centreName, setCentreName] = useState("");

  const readToken = useCallback(() => {
    const fromUrl = params.get("token");
    if (fromUrl) {
      try { window.sessionStorage.setItem(TOKEN_KEY, fromUrl); } catch { /* private mode */ }
      return fromUrl;
    }
    try { return window.sessionStorage.getItem(TOKEN_KEY) ?? ""; } catch { return ""; }
  }, [params]);

  useEffect(() => {
    const token = readToken();
    if (!token) {
      setStatus("failed");
      setMessage("This invitation link is incomplete. Ask whoever invited you to send it again.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/centres/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;

        if (response.status === 401) {
          setStatus("needs_account");
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          setStatus("failed");
          setMessage(data.error ?? "This invitation is not valid any more.");
          return;
        }
        try { window.sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
        setCentreName(data.centre?.name ?? "your centre");
        setStatus("joined");
      } catch {
        if (!cancelled) {
          setStatus("failed");
          setMessage("Something went wrong joining that centre. Try the link again.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [readToken]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      {status === "working" && (
        <p className="flex items-center gap-2 text-ink-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking your invitation…
        </p>
      )}

      {status === "joined" && (
        <div className="card p-7 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-sage-600" />
          <h1 className="font-display text-2xl font-bold text-ink-900">You have joined {centreName}.</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Your drafts stay private to you. Your centre can see that you are writing and when, and nothing
            more, unless you choose to share.
          </p>
          <Link href="/generate" className="btn-primary mt-5 inline-flex">Write a story</Link>
        </div>
      )}

      {status === "needs_account" && (
        <div className="card p-7">
          <h1 className="font-display text-2xl font-bold text-ink-900">You have been invited to a centre.</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Create a free account or sign in, and you will join automatically. Your invitation is held while
            you do.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href="/signup" className="btn-primary justify-center">Create free account</Link>
            <Link href="/login" className="btn-secondary justify-center">I already have one</Link>
          </div>
          <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-ink-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-sage-600" />
            Joining a centre never hands over your writing. Leadership sees that you are documenting, not what
            you documented, until you turn sharing on yourself.
          </p>
        </div>
      )}

      {status === "failed" && (
        <div className="card p-7">
          <h1 className="font-display text-2xl font-bold text-ink-900">That invitation did not work.</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">{message}</p>
          <Link href="/" className="btn-secondary mt-5 inline-flex">Back to StoryLoop</Link>
        </div>
      )}
    </div>
  );
}

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-cream-50">
      <Navbar />
      <Suspense fallback={<p className="p-16 text-center text-ink-500">Loading…</p>}>
        <JoinInner />
      </Suspense>
      <Footer />
    </main>
  );
}
