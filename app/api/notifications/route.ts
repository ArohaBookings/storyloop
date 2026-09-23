import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { getMonthlyStoryLimit } from "@/lib/story-limits";
import { hasFeatureAccess, normalizePlanKey } from "@/lib/plans";
import { buildNotifications, mergeSeen, unseenCount, type NotificationFacts } from "@/lib/notifications";
import { parseTermSettings } from "@/lib/term-settings";
import { buildQuietChildRadar } from "@/lib/quiet-radar";
import { currentOrNextTerm, localDate } from "@/lib/terms";
import { isCentrePlan } from "@/lib/centre-offer";
import { createStripe } from "@/lib/stripe-client";

export const dynamic = "force-dynamic";

/**
 * The bell. GET works out what is worth telling this educator right now; POST
 * records which of those they have seen.
 *
 * Every fact below is read on its own and every read is allowed to fail. Several
 * of these tables and columns arrive with migrations that may not have been
 * applied yet (centre invites, wall cards, term settings, notification state),
 * and a missing one must mean "nothing to say about that", never a broken bell,
 * and never a broken page around it.
 */

type SettledRows<T> = { data: T[] | null; error: unknown };

async function settle<T>(query: PromiseLike<SettledRows<T>>): Promise<T[]> {
  try {
    const { data, error } = await query;
    return error ? [] : data ?? [];
  } catch {
    return [];
  }
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

  const admin = createAdminSupabase();
  const profile = await getOrCreateProfile(user);
  const plan = normalizePlanKey(profile.plan);
  const now = new Date();

  // Columns that may not exist yet are read separately, so their absence
  // cannot take the rest of the profile down with them.
  const [stateRow, termRow, resetRow] = await Promise.all([
    settle(admin.from("profiles").select("notification_state").eq("id", user.id).limit(1)),
    settle(admin.from("profiles").select("term_settings").eq("id", user.id).limit(1)),
    settle(admin.from("profiles").select("last_reset_at, trial_ends_at").eq("id", user.id).limit(1)),
  ]);
  const seen = mergeSeen((stateRow[0] as { notification_state?: { seen?: unknown } } | undefined)?.notification_state?.seen, []);
  const extra = (resetRow[0] ?? {}) as { last_reset_at?: string | null; trial_ends_at?: string | null };

  const email = (user.email ?? "").trim().toLowerCase();
  const [referrals, wallCards, invites, children] = await Promise.all([
    settle(
      admin
        .from("referrals")
        .select("id, status, qualified_at, credited_at")
        .eq("referrer_id", user.id)
        .in("status", ["credited", "earned"])
        .order("created_at", { ascending: false })
        .limit(20),
    ),
    settle(admin.from("wall_cards").select("scan_count, last_scanned_at").eq("user_id", user.id).limit(500)),
    email
      ? settle(
          admin
            .from("centre_invites")
            .select("id, token, created_at, centre_id, centres(name)")
            .eq("email", email)
            .is("accepted_at", null)
            .is("revoked_at", null)
            .gt("expires_at", now.toISOString())
            .limit(5),
        )
      : Promise.resolve([]),
    settle(admin.from("child_profiles").select("id, name").eq("user_id", user.id).limit(500)),
  ]);

  // Quiet children and the end of term. The term note is only given when the
  // calendar is known to be theirs: New Zealand has one, and an Australian
  // educator has to have chosen their state, because a wrong term date is
  // worse than no reminder.
  let quiet: NotificationFacts["quiet"] = null;
  let term: NotificationFacts["term"] = null;
  try {
    const defaultFramework = (profile.story_preferences as { defaultFramework?: string } | null)?.defaultFramework ?? null;
    const settings = parseTermSettings((termRow[0] as { term_settings?: unknown } | undefined)?.term_settings, defaultFramework);
    const calendarKnown = settings.configured || settings.jurisdiction === "NZ";
    const today = localDate(now, settings.jurisdiction) ?? now.toISOString().slice(0, 10);
    const currentTerm = calendarKnown ? currentOrNextTerm(today, settings.jurisdiction) : null;
    const inTerm = currentTerm && currentTerm.start <= today && today <= currentTerm.end ? currentTerm : null;
    const hasRadar = hasFeatureAccess(plan, "quietChildRadar");

    let childrenWithNoMomentThisTerm: number | null = null;
    if (hasRadar && children.length > 0) {
      const since = new Date(now.getTime() - 120 * 86_400_000).toISOString();
      const [stories, captures] = await Promise.all([
        settle(admin.from("stories").select("child_id, created_at").eq("user_id", user.id).gte("created_at", since).limit(5000)),
        settle(admin.from("daily_captures").select("child_id, observed_at").eq("user_id", user.id).gte("observed_at", since).limit(5000)),
      ]);
      const radar = buildQuietChildRadar(
        (children as Array<{ id: string; name: string }>).map((child) => ({ id: child.id, name: child.name })),
        [
          ...(stories as Array<{ child_id: string | null; created_at: string }>).map((row) => ({ childId: row.child_id, createdAt: row.created_at })),
          ...(captures as Array<{ child_id: string | null; observed_at: string }>).map((row) => ({ childId: row.child_id, createdAt: row.observed_at })),
        ],
        { today: now, jurisdiction: settings.jurisdiction, followsSchoolTerms: settings.followsSchoolTerms },
      );
      quiet = { count: radar.worthNoticing.length, onHoliday: radar.onHoliday };
      childrenWithNoMomentThisTerm = [...radar.worthNoticing, ...radar.noticedRecently].filter((entry) => entry.momentsThisTerm === 0).length;
    }
    if (inTerm && children.length > 0) {
      term = { number: inTerm.term, end: inTerm.end, childrenWithNoMomentThisTerm };
    }
  } catch (error) {
    console.error("Notifications: term and radar facts skipped:", error);
  }

  const wallRows = wallCards as Array<{ scan_count: number | null; last_scanned_at: string | null }>;
  const wallScans = wallRows.reduce((sum, row) => sum + (row.scan_count ?? 0), 0);
  const lastScannedAt = wallRows.map((row) => row.last_scanned_at).filter(Boolean).sort().pop() ?? null;

  // A centre's free month asks for no card up front, so "nothing to do" would be
  // untrue without one. Only asked of Stripe in the last days of such a trial.
  let trialCardOnFile: boolean | null | undefined;
  const trialEnds = extra.trial_ends_at ? Date.parse(extra.trial_ends_at) : Number.NaN;
  if (
    profile.subscription_status === "trialing" &&
    isCentrePlan(plan) &&
    Number.isFinite(trialEnds) &&
    trialEnds - now.getTime() <= 3 * 86_400_000 &&
    profile.stripe_customer_id
  ) {
    try {
      const stripe = createStripe();
      const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: "trialing", limit: 5 });
      trialCardOnFile = subs.data.some((sub) => Boolean(sub.default_payment_method));
      if (!trialCardOnFile) {
        const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
        trialCardOnFile = !("deleted" in customer && customer.deleted) && Boolean((customer as { invoice_settings?: { default_payment_method?: unknown } }).invoice_settings?.default_payment_method);
      }
    } catch {
      trialCardOnFile = null;
    }
  }

  const items = buildNotifications({
    trialCardOnFile,
    now,
    plan,
    subscriptionStatus: profile.subscription_status ?? null,
    trialEndsAt: extra.trial_ends_at ?? null,
    storiesThisMonth: profile.stories_this_month ?? 0,
    usageResetAt: extra.last_reset_at ?? null,
    monthlyLimit: getMonthlyStoryLimit(profile),
    referrals: (referrals as Array<{ id: string; status: string; qualified_at: string | null; credited_at: string | null }>).map((row) => ({
      id: row.id,
      status: row.status,
      qualifiedAt: row.qualified_at,
      creditedAt: row.credited_at,
    })),
    quiet,
    wall: wallRows.length ? { scans: wallScans, lastScannedAt } : null,
    term,
    invites: (invites as Array<{ id: string; token: string; created_at: string; centres: { name?: string } | Array<{ name?: string }> | null }>).map((row) => {
      const centre = Array.isArray(row.centres) ? row.centres[0] : row.centres;
      return { id: row.id, token: row.token, createdAt: row.created_at, centreName: centre?.name?.trim() || "A centre" };
    }),
  });

  return NextResponse.json(
    { items, seen: seen.filter((id) => items.some((item) => item.id === id)), unseen: unseenCount(items, seen) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

/** Record that the educator opened the bell and saw these. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body?.action !== "seen" || !Array.isArray(body.ids)) {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  const ids = (body.ids as unknown[]).filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 200).slice(0, 50);

  const admin = createAdminSupabase();
  const { data: row, error: readError } = await admin
    .from("profiles")
    .select("notification_state")
    .eq("id", user.id)
    .maybeSingle();
  if (readError) {
    // Most likely the column is not there yet. The browser keeps its own copy,
    // so the count still clears; say so rather than pretend.
    return NextResponse.json({ ok: false, stored: "browser" });
  }

  const state = (row?.notification_state ?? {}) as { seen?: unknown };
  const { error } = await admin
    .from("profiles")
    .update({ notification_state: { ...state, seen: mergeSeen(state.seen, ids) } })
    .eq("id", user.id);
  if (error) return NextResponse.json({ ok: false, stored: "browser" });

  return NextResponse.json({ ok: true });
}
