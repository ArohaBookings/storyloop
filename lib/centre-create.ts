import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizePlanKey, type PlanKey } from "@/lib/plans";

/**
 * Seats follow the plan. An individual plan gets a centre of one, which is
 * deliberate rather than a refusal: they can set the centre up, see exactly
 * what it does, and hit a wall that says "upgrade to invite your team" at the
 * moment they actually want to. Defaulting everyone to 10 would hand a free
 * account nine seats.
 */
export const SEATS_FOR_PLAN: Record<string, number> = {
  free: 1,
  educator: 1,
  educator_pro: 1,
  centre_starter: 10,
  centre_growth: 25,
};

/**
 * Create a centre with this account as its owner. Moved unchanged out of
 * app/api/centres/route.ts (25 Nov 2026) so the centre start with no payment
 * page (app/api/centres/start-free) creates it exactly the same way. The
 * caller checks first that the account is in no centre.
 */
export async function createCentreForOwner(
  userId: string,
  name: string,
): Promise<{ ok: true; centre: { id: string; name: string; plan: string; seat_limit: number }; planKey: PlanKey } | { ok: false }> {
  const admin = createAdminSupabase();
  const { data: profile } = await admin.from("profiles").select("plan").eq("id", userId).maybeSingle();
  const planKey = normalizePlanKey(profile?.plan);
  const seatLimit = SEATS_FOR_PLAN[planKey] ?? 10;

  const { data: centre, error: centreError } = await admin
    .from("centres")
    .insert({ name, created_by: userId, plan: planKey, seat_limit: seatLimit })
    .select("id, name, plan, seat_limit")
    .single();

  if (centreError || !centre) {
    console.error("Centre create failed:", centreError?.message);
    return { ok: false };
  }

  const { error: memberError } = await admin.from("centre_members").insert({
    centre_id: centre.id,
    user_id: userId,
    role: "owner",
    status: "active",
    // The owner's own drafts are shared with the centre by default, because
    // the owner IS the centre. Everyone else opts in.
    shares_stories: true,
  });

  if (memberError) {
    // Do not leave a centre with no owner behind.
    await admin.from("centres").delete().eq("id", centre.id);
    console.error("Centre owner insert failed:", memberError.message);
    return { ok: false };
  }
  return { ok: true, centre, planKey };
}
