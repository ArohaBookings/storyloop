import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getMembership, getCentre, countActiveMembers, canManageTeam, seatsRemaining } from "@/lib/centres";
import { normalizePlanKey, getPlanByKey } from "@/lib/plans";
import { isCentrePlan } from "@/lib/centre-offer";
import { educatorFirstName } from "@/lib/story-check";

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
    if (!membership) return NextResponse.json({ centre: null, membership: null, members: [], onBoard: await onBoardFor(user.id) });

    const centre = await getCentre(membership.centreId);
    if (!centre) return NextResponse.json({ centre: null, membership: null, members: [] });

    const activeMembers = await countActiveMembers(centre.id);

    // Only leadership sees the roster. An educator sees their own membership
    // and the seat count, which is all they need and all they are owed.
    let members: unknown[] = [];
    if (canManageTeam(membership)) {
      const admin = createAdminSupabase();
      const [{ data }, { data: fromOffer }] = await Promise.all([
        admin.rpc("centre_activity", { p_centre_id: centre.id }),
        admin.from("centre_invites").select("accepted_by").eq("centre_id", centre.id).eq("from_leader_offer", true).not("accepted_by", "is", null),
      ]);
      // Somebody who joined from a one-tap invitation (lib/leader-offer-server.ts)
      // is shown as the leader first met them: a first name, never an address.
      const viaOffer = new Set((fromOffer ?? []).map((row) => row.accepted_by as string));
      members = (Array.isArray(data) ? data : []).map((member: { user_id: string; full_name: string | null; email: string | null }) =>
        viaOffer.has(member.user_id) ? { ...member, full_name: educatorFirstName(member.full_name), email: null } : member);
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

/**
 * "Get your centre on board" (13 Nov 2026), for an educator in no centre and
 * not on a centre plan: where their newest saved story is, so the card's one
 * button opens its "Send this story to your leader" panel. Null for anyone
 * the card is not for.
 */
async function onBoardFor(userId: string): Promise<{ newestStoryId: string | null } | null> {
  try {
    const admin = createAdminSupabase();
    const [{ data: profile }, { data: newest }] = await Promise.all([
      admin.from("profiles").select("plan").eq("id", userId).maybeSingle(),
      admin.from("stories").select("id").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    if (isCentrePlan(profile?.plan)) return null;
    return { newestStoryId: (newest?.id as string | undefined) ?? null };
  } catch {
    return null;
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

    // Seats follow the owner's plan as it is now (lib/centres.ts liveSeatLimit),
    // so the answer here is read back rather than taken from the row just written.
    const live = await getCentre(centre.id);
    const liveSeats = live?.seatLimit ?? 1;
    return NextResponse.json({
      centre: {
        id: centre.id,
        name: centre.name,
        plan: live?.plan ?? null,
        seatLimit: liveSeats,
        seatsUsed: 1,
        seatsRemaining: seatsRemaining(liveSeats, 1),
        planLabel: getPlanByKey(planKey).name,
      },
    });
  } catch (error) {
    console.error("Centre create error:", error);
    return NextResponse.json({ error: "Could not create the centre." }, { status: 500 });
  }
}
