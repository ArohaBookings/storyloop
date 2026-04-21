"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [redirect, setRedirect] = useState("/dashboard");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const nextPath = new URLSearchParams(window.location.search).get("redirect");
    if (nextPath) setRedirect(nextPath);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else { router.push(redirect); router.refresh(); }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 paper-texture">
      <div className="absolute inset-0 bg-warm-mesh pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>
        <div className="card p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <img src="/logo.svg" alt="StoryLoop" className="w-9 h-9" />
            <div>
              <span className="font-display text-xl font-bold text-ink-900">StoryLoop</span>
              <p className="text-[9px] text-clay-600 -mt-1 font-mono tracking-widest">BY ARIA CARE</p>
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-900 mb-1">Welcome back</h1>
          <p className="text-sm text-ink-500 mb-6">Sign in to keep writing beautiful stories.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div><label className="label">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="input" /></div>
            <div><label className="label">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" className="input" /></div>
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
            </button>
            <div className="text-center">
              <Link href="/forgot-password" className="text-xs text-ink-500 hover:text-clay-700 hover:underline">Forgot your password?</Link>
            </div>
          </form>
        </div>
        <p className="text-center text-sm text-ink-500 mt-5">New here? <Link href="/signup" className="text-clay-700 font-semibold hover:underline">Create an account</Link></p>
      </div>
    </div>
  );
}
