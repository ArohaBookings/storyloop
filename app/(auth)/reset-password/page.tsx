"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const tokenHash = new URLSearchParams(window.location.search).get("token_hash");
      if (tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        if (!mounted) return;
        if (verifyError) {
          setError(verifyError.message);
          setHasRecoverySession(false);
        } else {
          setHasRecoverySession(true);
        }
        setCheckingSession(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setHasRecoverySession(Boolean(data.session));
      setCheckingSession(false);
    };

    void checkSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(Boolean(session));
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase.auth]);

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
            <Image src="/logo.svg" alt="StoryLoop" width={36} height={36} className="h-9 w-9" />
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
          ) : checkingSession ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-clay-500 mx-auto mb-4" />
              <h1 className="font-display text-xl font-bold text-ink-900">Checking reset link</h1>
              <p className="text-sm text-ink-500 mt-2">This should only take a moment.</p>
            </div>
          ) : !hasRecoverySession ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-amber-700" />
              </div>
              <h1 className="font-display text-xl font-bold text-ink-900 mb-2">Reset link expired or already used</h1>
              <p className="text-sm text-ink-600">
                {error || "Please request a fresh password reset email. For security, reset links only work once."}
              </p>
              <Link href="/forgot-password" className="btn-primary mt-5 w-full justify-center">
                Send a new reset link
              </Link>
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
