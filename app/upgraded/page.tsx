import type { Metadata } from "next";
import PaidReturn from "@/components/analytics/PaidReturn";
import { paidReturnTarget, safeSessionId } from "@/lib/paid-return";
import { getPlanByKey, normalizePlanKey } from "@/lib/plans";

export const metadata: Metadata = { title: "Starting your plan", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The one stop between Stripe Checkout and the app (lib/paid-return.ts): it
 * shows no child, story or note, sends the Google Ads "paid plan started"
 * conversion, and moves on to the page she came from. The plan itself is set
 * only by Stripe's webhook, never here.
 */
export default async function UpgradedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const plan = normalizePlanKey(one("plan"));
  const target = paidReturnTarget(one("to"), plan, one("session_id"));
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4">
      <p className="text-base text-ink-700" data-testid="paid-return">Starting your plan…</p>
      <PaidReturn value={plan === "free" ? 0 : getPlanByKey(plan)?.price.NZD ?? 0} sessionId={safeSessionId(one("session_id"))} target={target} />
    </main>
  );
}
