import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calculator } from "lucide-react";
import { verifyAdmin } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isActiveRevenue } from "@/lib/revenue";
import { getPlanByKey, normalizePlanKey } from "@/lib/plans";
import EconomicsCalculator from "@/components/admin/EconomicsCalculator";

export const metadata = { title: "Unit economics · StoryLoop Admin" };
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Unit economics.
 *
 * Read-only. Nothing here touches story generation or any model call: it counts
 * what has already happened and does arithmetic on it. All of that arithmetic
 * lives in lib/economics.ts and is unit tested.
 *
 * Kept flat for scale on purpose. Totals are head:true count queries, and
 * per-customer story volume comes from the stories_this_month counter the
 * profile already maintains, so this page does not scan the stories table no
 * matter how large it grows.
 */
export default async function EconomicsPage() {
  const session = await verifyAdmin();
  if (!session) redirect("/admin-login");

  const sb = createAdminSupabase();
  const since = new Date(Date.now() - 30 * DAY).toISOString();

  const [profilesRes, storiesRes, demosRes, editsRes] = await Promise.all([
    sb
      .from("profiles")
      .select("id, email, plan, subscription_status, is_internal, stories_this_month")
      .neq("plan", "free")
      .limit(5000),
    sb.from("stories").select("id", { count: "exact", head: true }).gte("created_at", since),
    sb
      .from("page_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "demo_completed")
      .gte("created_at", since),
    sb.from("assistant_edits").select("id", { count: "exact", head: true }).gte("created_at", since),
  ]);

  const paying = (profilesRes.data ?? []).filter((profile) => isActiveRevenue(profile));
  const mrrNzd = paying.reduce(
    (sum, profile) => sum + (getPlanByKey(normalizePlanKey(profile.plan)).price.NZD ?? 0),
    0,
  );

  // Quill edits per paying customer, for the contribution table.
  const editsByUser = new Map<string, number>();
  if (paying.length) {
    const { data: edits } = await sb
      .from("assistant_edits")
      .select("user_id")
      .in("user_id", paying.map((p) => p.id))
      .gte("created_at", since)
      .limit(20000);
    for (const row of edits ?? []) {
      editsByUser.set(row.user_id, (editsByUser.get(row.user_id) ?? 0) + 1);
    }
  }

  const users = paying.map((profile) => ({
    userId: profile.id,
    email: profile.email ?? null,
    planPriceNzd: getPlanByKey(normalizePlanKey(profile.plan)).price.NZD ?? 0,
    stories30d: profile.stories_this_month ?? 0,
    assistantEdits30d: editsByUser.get(profile.id) ?? 0,
  }));

  const loadErrors = [profilesRes.error, storiesRes.error, demosRes.error, editsRes.error]
    .filter(Boolean)
    .map((error) => error?.message ?? "unknown error");

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-8 text-white md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-ink-300 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>

        <div className="mb-6 mt-6">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-clay-400">
            <Calculator className="h-3.5 w-3.5" /> Unit economics
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold">What we earn against what the AI costs.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">
            Revenue at NZD list prices for active paying customers, internal and comp accounts excluded. AI cost is
            estimated from call counts over the last 30 days. Enter last month&apos;s real OpenAI invoice to replace the
            estimate with what each call actually cost.
          </p>
        </div>

        {loadErrors.length > 0 && (
          <p className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            Some counts could not load, so figures below may be low: {loadErrors.join("; ")}
          </p>
        )}

        <EconomicsCalculator
          mrrNzd={mrrNzd}
          payingCustomers={paying.length}
          counts={{
            stories: storiesRes.count ?? 0,
            demos: demosRes.count ?? 0,
            assistantEdits: editsRes.count ?? 0,
          }}
          users={users}
        />
      </div>
    </div>
  );
}
