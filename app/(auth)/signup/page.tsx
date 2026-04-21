"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState("free");
  const router = useRouter();

  useEffect(() => {
    const selectedPlan = new URLSearchParams(window.location.search).get("plan");
    if (selectedPlan) setPlan(selectedPlan);
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, plan }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to create account");
      setLoading(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 relative paper-texture">
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

          <h1 className="font-display text-2xl font-bold text-ink-900 mb-1">Start free</h1>
          <p className="text-sm text-ink-500 mb-6">3 free stories, no credit card.</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div><label className="label">Your name</label><input value={name} onChange={e => setName(e.target.value)} required autoComplete="name" className="input" placeholder="Jane Smith" /></div>
            <div><label className="label">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="input" placeholder="you@centre.com.au" /></div>
            <div><label className="label">Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" minLength={8} className="input" placeholder="At least 8 characters" /></div>
            {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create free account"}
            </button>
            <p className="text-xs text-ink-500 text-center">By signing up you agree to our <Link href="/terms" className="text-clay-700 hover:underline">Terms</Link> and <Link href="/privacy" className="text-clay-700 hover:underline">Privacy Policy</Link></p>
          </form>
        </div>
        <p className="text-center text-sm text-ink-500 mt-5">Already have an account? <Link href="/login" className="text-clay-700 font-semibold hover:underline">Sign in</Link></p>
      </div>
    </div>
  );
}
