"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); }
    else {
      setDone(true); setLoading(false);
      setTimeout(() => router.push("/dashboard"), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 paper-texture">
      <div className="absolute inset-0 bg-warm-mesh pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="card p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <img src="/logo.svg" alt="StoryLoop" className="w-9 h-9" />
            <span className="font-display text-xl font-bold text-ink-900">StoryLoop</span>
          </div>

          {done ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-sage-50 border border-sage-200 flex items-center justify-center mx-auto mb-4">
                <Check className="w-7 h-7 text-sage-600" />
              </div>
              <h3 className="font-display text-xl font-bold text-ink-900 mb-2">Password updated</h3>
              <p className="text-sm text-ink-600">Redirecting you to the dashboard...</p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-ink-900 mb-1">Choose a new password</h1>
              <p className="text-sm text-ink-500 mb-6">Pick something secure — at least 8 characters.</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div><label className="label">New password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" className="input" /></div>
                <div><label className="label">Confirm password</label><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" className="input" /></div>
                {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
