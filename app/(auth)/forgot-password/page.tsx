"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const response = await fetch("/api/auth/password-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error ?? "Could not send reset email."); setLoading(false); }
    else { setDone(true); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 paper-texture">
      <div className="absolute inset-0 bg-warm-mesh pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
        </Link>
        <div className="card p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <Image src="/logo.svg" alt="StoryLoop" width={36} height={36} className="h-9 w-9" />
            <div>
              <span className="font-display text-xl font-bold text-ink-900">StoryLoop</span>
              <p className="text-[9px] text-clay-600 -mt-1 font-mono tracking-widest">BY ARIA CARE</p>
            </div>
          </div>

          {done ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-sage-50 border border-sage-200 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-sage-600" />
              </div>
              <h3 className="font-display text-xl font-bold text-ink-900 mb-2">Check your email</h3>
              <p className="text-sm text-ink-600">If an account exists for <span className="font-medium">{email}</span>, you'll receive a reset link shortly.</p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-ink-900 mb-1">Reset password</h1>
              <p className="text-sm text-ink-500 mb-6">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div><label className="label">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="input" /></div>
                {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
