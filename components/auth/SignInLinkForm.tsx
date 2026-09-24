"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { track } from "@/lib/analytics/client";

/** "Email me a sign-in link": signing in without the password (app/api/auth/sign-in-link). */
export default function SignInLinkForm({ redirect, defaultEmail = "", compact = false }: { redirect: string; defaultEmail?: string; compact?: boolean }) {
  const [email, setEmail] = useState(defaultEmail);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/auth/sign-in-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirect }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send the link.");
      setState("sent");
      track("cta_click", { name: "sign_in_link_sent", redirect });
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Could not send the link.");
    }
  };

  if (state === "sent") {
    return (
      <div role="status" className="rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm leading-relaxed text-ink-800">
        <strong className="font-semibold text-ink-900">Check your email.</strong> If {email} has a StoryLoop account, a sign-in
        link is on its way. It works once, for the next hour.
      </div>
    );
  }

  return (
    <form onSubmit={send} className={compact ? "space-y-2" : "space-y-3"} aria-label="Email me a sign-in link">
      <label htmlFor="sign-in-link-email" className="label">Your StoryLoop email</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="sign-in-link-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="input flex-1"
          placeholder="you@example.com"
        />
        <button type="submit" disabled={state === "sending"} className="btn-secondary justify-center whitespace-nowrap disabled:opacity-60">
          {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Email me a sign-in link
        </button>
      </div>
      {state === "error" && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
