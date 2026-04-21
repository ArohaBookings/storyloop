"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Login failed"); setLoading(false); }
    else { router.push("/admin"); router.refresh(); }
  };

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-ink-900 border border-ink-800 rounded-2xl p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <span className="font-display text-xl font-bold text-paper">StoryLoop Admin</span>
              <p className="text-[10px] text-red-400 -mt-1 font-mono tracking-widest">SUPER ADMIN</p>
            </div>
          </div>
          <h1 className="font-display text-2xl font-bold text-paper mb-1">Sign in</h1>
          <p className="text-sm text-ink-400 mb-6">Admin access only.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink-400 uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
                className="w-full bg-ink-800 border border-ink-700 rounded-xl px-4 py-3 text-sm text-paper placeholder:text-ink-500 focus:outline-none focus:border-red-500/50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink-400 uppercase tracking-wider mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"
                className="w-full bg-ink-800 border border-ink-700 rounded-xl px-4 py-3 text-sm text-paper placeholder:text-ink-500 focus:outline-none focus:border-red-500/50" />
            </div>
            {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
