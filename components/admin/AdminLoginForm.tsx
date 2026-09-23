"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";

/**
 * The admin sign-in. Two ways in: straight through, when you are already
 * signed in to StoryLoop as the admin (no second password), or the admin email
 * and password. Rate-limited and audited server-side either way.
 */
export default function AdminLoginForm({ appAdminEmail = null }: { appAdminEmail?: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "That email and password did not match the admin account.");
        setLoading(false);
        return;
      }
      window.location.replace("/admin");
    } catch {
      setError("Could not reach StoryLoop. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-ink-800 bg-ink-900 p-8 shadow-2xl">
          <div className="mb-8 flex items-center gap-3">
            <Image src="/brand/storyloop-icon.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl" />
            <div>
              <p className="font-display text-xl font-bold text-paper">StoryLoop</p>
              <p className="-mt-0.5 font-mono text-[10px] tracking-[0.25em] text-clay-300">COMMAND CENTRE</p>
            </div>
          </div>

          {appAdminEmail && (
            // An API route that sets a cookie and redirects: it needs a full
            // page load, which next/link would turn into a client fetch.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a
              href="/api/admin/session"
              className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-clay-500/50 bg-clay-500/10 px-4 py-3.5 text-left hover:bg-clay-500/20"
            >
              <span>
                <span className="block text-sm font-semibold text-paper">Continue as {appAdminEmail}</span>
                <span className="block text-xs text-ink-400">You are already signed in to StoryLoop.</span>
              </span>
              <ArrowRight className="h-5 w-5 flex-none text-clay-300" />
            </a>
          )}

          <h1 className="font-display text-2xl font-bold text-paper">{appAdminEmail ? "Or sign in" : "Sign in"}</h1>
          <p className="mb-6 mt-1 text-sm text-ink-400">The admin account only. Every sign-in is recorded.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-400">Email</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-ink-700 bg-ink-800 px-4 py-3 text-sm text-paper placeholder:text-ink-500 focus:border-clay-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-400">Password</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-ink-700 bg-ink-800 px-4 py-3 text-sm text-paper placeholder:text-ink-500 focus:border-clay-500 focus:outline-none"
              />
            </div>
            {error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-clay-600 py-3 font-bold text-paper transition-colors hover:bg-clay-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              Sign in
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2 border-t border-ink-800 pt-4 text-center text-xs sm:flex-row">
            <Link href="/" className="flex-1 rounded-xl border border-ink-700 px-3 py-2 font-semibold text-ink-300 hover:border-clay-500 hover:text-paper">StoryLoop site</Link>
            <Link href="/login" className="flex-1 rounded-xl border border-ink-700 px-3 py-2 font-semibold text-ink-300 hover:border-clay-500 hover:text-paper">Educator sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
