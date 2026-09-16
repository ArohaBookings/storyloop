import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getMembership, getCentre, countActiveMembers, canManageTeam, seatsRemaining } from "@/lib/centres";
import { normalizePlanKey, getPlanByKey } from "@/lib/plans";

/**
 * A centre, and who is in it.
 *
 * GET returns the caller's centre with its roster. The roster is ACTIVITY only
 * (counts and recency) and never story text, because a centre plan does not buy
 * the right to read an educator's drafts. Content sharing is per educator and
 * opt in; see lib/centres.ts.
 *
 * Every response is safe for a caller with no centre: `{ centre: null }`, which
 * is what every existing account gets and why this route changes nothing for
 * them.
 */

/**
 * Seats follow the plan. An individual plan gets a centre of one, which is
 * deliberate rather than a refusal: they can set the centre up, see exactly
 * what it does, and hit a wall that says "upgrade to invite your team" at the
 * moment they actually want to. Defaulting everyone to 10 would hand a free
 * account nine seats.
 */
const SEATS_FOR_PLAN: Record<string, number> = {
  free: 1,
  educator: 1,
  educator_pro: 1,
  centre_starter: 10,
  centre_growth: 25,
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getMembership(user.id);
    if (!membership) return NextResponse.json({ centre: null, membership: null, members: [] });

    const centre = await getCentre(membership.centreId);
    if (!centre) return NextResponse.json({ centre: null, membership: null, members: [] });

    const activeMembers = await countActiveMembers(centre.id);

    // Only leadership sees the roster. An educator sees their own membership
    // and the seat count, which is all they need and all they are owed.
    let members: unknown[] = [];
    if (canManageTeam(membership)) {
      const { data } = await createAdminSupabase().rpc("centre_activity", { p_centre_id: centre.id });
      members = Array.isArray(data) ? data : [];
    }

    return NextResponse.json({
      centre: {
        id: centre.id,
        name: centre.name,
        plan: centre.plan,
        seatLimit: centre.seatLimit,
        seatsUsed: activeMembers,
        seatsRemaining: seatsRemaining(centre.seatLimit, activeMembers),
      },
      membership: {
        role: membership.role,
        sharesStories: membership.sharesStories,
      },
      members,
    });
  } catch (error) {
    console.error("Centre fetch error:", error);
    return NextResponse.json({ error: "Could not load centre" }, { status: 500 });
  }
}

/** Create a centre. The caller becomes its owner. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // One centre per educator, enforced in the database too. Checking here as
    // well turns a constraint violation into a sentence a person can read.
    const existing = await getMembership(user.id);
    if (existing) return NextResponse.json({ error: "You are already part of a centre." }, { status: 409 });

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    if (name.length < 2) return NextResponse.json({ error: "Give the centre a name." }, { status: 400 });

    const admin = createAdminSupabase();
    const { data: profile } = await admin.from("profiles").select("plan").eq("id", user.id).maybeSingle();
    const planKey = normalizePlanKey(profile?.plan);
    const seatLimit = SEATS_FOR_PLAN[planKey] ?? 10;

    const { data: centre, error: centreError } = await admin
      .from("centres")
      .insert({ name, created_by: user.id, plan: planKey, seat_limit: seatLimit })
      .select("id, name, plan, seat_limit")
      .single();

    if (centreError || !centre) {
      console.error("Centre create failed:", centreError?.message);
      return NextResponse.json({ error: "Could not create the centre." }, { status: 500 });
    }

    const { error: memberError } = await admin.from("centre_members").insert({
      centre_id: centre.id,
      user_id: user.id,
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
      return NextResponse.json({ error: "Could not create the centre." }, { status: 500 });
    }

    return NextResponse.json({
      centre: {
        id: centre.id,
        name: centre.name,
        plan: centre.plan,
        seatLimit: centre.seat_limit,
        seatsUsed: 1,
        seatsRemaining: seatsRemaining(centre.seat_limit, 1),
        planLabel: getPlanByKey(planKey).name,
      },
    });
  } catch (error) {
    console.error("Centre create error:", error);
    return NextResponse.json({ error: "Could not create the centre." }, { status: 500 });
  }
}
