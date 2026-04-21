"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, Mail, Key, Ban, CheckCircle, ChevronDown, RefreshCw } from "lucide-react";

interface User {
  id: string; email: string; full_name: string; plan: string;
  subscription_status: string; stories_this_month: number; created_at: string;
  is_active: boolean;
}

const PLAN_BADGE: Record<string, string> = {
  free: "bg-ink-800 text-ink-300",
  educator: "bg-clay-500/20 text-clay-400 border border-clay-500/30",
  centre: "bg-sage-500/20 text-sage-400 border border-sage-500/30",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openActions, setOpenActions] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState("");
  const [toast, setToast] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setUsers(data.users ?? []); setLoading(false);
  }, [search]);

  useEffect(() => { const t = setTimeout(fetchUsers, 300); return () => clearTimeout(t); }, [fetchUsers]);

  const doAction = async (action: string, userId: string, email: string, plan?: string) => {
    setActionLoading(action + userId);
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId, email, plan }),
    });
    const data = await res.json();
    setToast(res.ok ? (data.message ?? "Done") : ("Error: " + data.error));
    if (data.link) { await navigator.clipboard.writeText(data.link); setToast("Magic link copied to clipboard"); }
    setActionLoading(""); setOpenActions(null); fetchUsers();
    setTimeout(() => setToast(""), 3500);
  };

  return (
    <div className="min-h-screen bg-ink-950 text-paper">
      <header className="h-14 border-b border-ink-800 bg-ink-900/50 flex items-center px-6 gap-4">
        <Link href="/admin" className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-paper"><ArrowLeft className="w-3.5 h-3.5" /> Back</Link>
        <h1 className="font-semibold">User management</h1>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {toast && <div className="mb-4 px-4 py-3 bg-clay-500/20 border border-clay-500/30 text-clay-300 rounded-xl text-sm">{toast}</div>}

        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
              className="w-full bg-ink-900 border border-ink-700 rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-ink-600 focus:outline-none focus:border-clay-500/50" />
          </div>
          <button onClick={fetchUsers} className="flex items-center gap-2 text-xs text-ink-400 hover:text-paper border border-ink-700 px-3 py-2 rounded-xl">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="bg-ink-900 border border-ink-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-ink-800 bg-ink-800/30">
                  {["User", "Plan", "Status", "Stories", "Joined", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-ink-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800/50">
                {loading ? (
                  <tr><td colSpan={6} className="py-16 text-center"><Loader2 className="w-5 h-5 animate-spin text-ink-500 mx-auto" /></td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className={`hover:bg-ink-800/30 ${u.is_active === false ? "opacity-40" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-clay-700 text-paper flex items-center justify-center text-xs font-bold">{(u.full_name ?? u.email ?? "?")[0].toUpperCase()}</div>
                        <div>
                          <p className="text-sm font-medium">{u.full_name ?? "—"}</p>
                          <p className="text-xs text-ink-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PLAN_BADGE[u.plan] ?? PLAN_BADGE.free}`}>{u.plan}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-ink-400">{u.subscription_status ?? "—"}</span></td>
                    <td className="px-4 py-3"><span className="text-sm">{u.stories_this_month ?? 0}</span></td>
                    <td className="px-4 py-3"><span className="text-xs text-ink-500">{new Date(u.created_at).toLocaleDateString("en-AU")}</span></td>
                    <td className="px-4 py-3 relative">
                      <button onClick={() => setOpenActions(openActions === u.id ? null : u.id)}
                        className="flex items-center gap-1 text-xs border border-ink-700 hover:border-ink-600 px-2.5 py-1.5 rounded-lg">
                        Actions <ChevronDown className="w-3 h-3" />
                      </button>
                      {openActions === u.id && (
                        <div className="absolute right-4 top-11 z-30 bg-ink-800 border border-ink-700 rounded-xl shadow-2xl py-1.5 w-56">
                          <div className="px-3 py-1 text-[10px] font-bold text-ink-500 uppercase tracking-wider">User actions</div>
                          {[
                            { icon: Mail, label: "Send password reset", action: "reset_password" },
                            { icon: Key, label: "Copy magic login link", action: "magic_link" },
                          ].map(({ icon: Icon, label, action }) => (
                            <button key={action} onClick={() => doAction(action, u.id, u.email)}
                              disabled={!!actionLoading}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs hover:bg-ink-700 transition-colors">
                              {actionLoading === action + u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5 text-ink-400" />}
                              {label}
                            </button>
                          ))}
                          <div className="border-t border-ink-700 my-1" />
                          <div className="px-3 py-1 text-[10px] font-bold text-ink-500 uppercase tracking-wider">Set plan</div>
                          {["free", "educator", "centre"].map(p => (
                            <button key={p} onClick={() => doAction("set_plan", u.id, u.email, p)}
                              disabled={u.plan === p || !!actionLoading}
                              className={`w-full flex items-center justify-between px-4 py-2 text-xs transition-colors ${u.plan === p ? "text-ink-500" : "hover:bg-ink-700"}`}>
                              <span className="capitalize">{p}</span>
                              {u.plan === p && <span className="text-clay-400">current</span>}
                            </button>
                          ))}
                          <div className="border-t border-ink-700 my-1" />
                          <button onClick={() => doAction(u.is_active === false ? "enable" : "disable", u.id, u.email)}
                            className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs transition-colors ${u.is_active === false ? "text-sage-400 hover:bg-sage-500/10" : "text-red-400 hover:bg-red-500/10"}`}>
                            {u.is_active === false ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            {u.is_active === false ? "Enable account" : "Disable account"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && users.length === 0 && <div className="py-16 text-center text-sm text-ink-500">No users yet. They'll appear here after signup.</div>}
        </div>
      </main>
    </div>
  );
}
