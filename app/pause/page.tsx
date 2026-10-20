import type { Metadata } from "next";
import Link from "next/link";
import { createStripe } from "@/lib/stripe-client";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { loadPauseView, verifyPauseToken, type PauseView } from "@/lib/billing-pause";
import PauseForm from "./PauseForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pause payments",
  robots: { index: false, follow: false },
};

async function viewFor(token: string | undefined): Promise<{ view: PauseView; first: string } | null> {
  const payload = verifyPauseToken(token);
  if (!payload) return null;
  const { data: profile } = await createAdminSupabase()
    .from("profiles")
    .select("id, full_name, stripe_customer_id, stripe_subscription_id, is_active")
    .eq("id", payload.userId)
    .maybeSingle();
  const first = String(profile?.full_name ?? "").trim().split(/\s+/)[0] || "there";
  if (!profile?.stripe_customer_id || profile.is_active === false) {
    return { view: { status: "no_subscription", nextChargeAt: null, pausedUntil: null, amount: null, currency: null, options: [] }, first };
  }
  const { view } = await loadPauseView(createStripe(), profile.stripe_customer_id, profile.stripe_subscription_id ?? null);
  return { view, first };
}

/**
 * Where a pause email lands. Opening it changes nothing: it says what pausing
 * would do and waits for a button press (lib/billing-pause.ts).
 */
export default async function PausePage({ searchParams }: { searchParams?: Promise<{ token?: string }> }) {
  const params = await searchParams;
  const token = params?.token;
  let loaded: Awaited<ReturnType<typeof viewFor>> = null;
  try {
    loaded = await viewFor(token);
  } catch (error) {
    console.error("Pause page error:", error);
  }

  return (
    <main className="min-h-screen bg-paper px-4 py-12">
      <div className="mx-auto max-w-lg rounded-3xl border border-clay-100 bg-white p-6 shadow-soft sm:p-8">
        <p className="section-title mb-2">StoryLoop billing</p>
        {loaded && token ? (
          <PauseForm token={token} first={loaded.first} initial={loaded.view} />
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold text-ink-900">This link has expired</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Pause links work for 30 days. Sign in to see your plan, or reply to the email and Leo will sort it out.
            </p>
            <Link href="/login?redirect=%2Fbilling" className="btn-primary mt-6 inline-flex justify-center">Sign in to billing</Link>
          </>
        )}
      </div>
    </main>
  );
}
