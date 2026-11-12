import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getMembership, getCentre, countActiveMembers, canManageTeam, seatsRemaining } from "@/lib/centres";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createCentreInvite } from "@/lib/centre-invites";

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** Pending invites for the caller's centre. Leadership only. */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getMembership(user.id);
    if (!canManageTeam(membership) || !membership) {
      return NextResponse.json({ error: "Only centre leadership can see invitations." }, { status: 403 });
    }

    const { data } = await createAdminSupabase()
      .from("centre_invites")
      .select("id, email, role, expires_at, created_at, from_leader_offer")
      .eq("centre_id", membership.centreId)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    // An invitation made with one tap from a story an educator sent is addressed
    // to her account, which the leader never saw: its address is not shown.
    const invites = (data ?? []).map(({ from_leader_offer: fromOffer, ...row }) => (fromOffer ? { ...row, email: null } : row));
    return NextResponse.json({ invites });
  } catch (error) {
    console.error("Invite list error:", error);
    return NextResponse.json({ error: "Could not load invitations." }, { status: 500 });
  }
}

/** Invite an educator. Leadership only, and only while a seat is free. */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await getMembership(user.id);
    if (!canManageTeam(membership) || !membership) {
      return NextResponse.json({ error: "Only centre leadership can invite people." }, { status: 403 });
    }

    // Invitations send email to an address the caller chose, so this is
    // rate limited per inviter regardless of how many centres they touch.
    const allowed = await consumeRateLimit({
      scope: "centre-invite",
      key: user.id,
      limit: 30,
      windowSeconds: 60 * 60,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Too many invitations just now. Try again shortly." }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const email = cleanEmail(body.email);
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "That does not look like an email address." }, { status: 400 });
    }
    const role = body.role === "admin" ? "admin" : "educator";

    const centre = await getCentre(membership.centreId);
    if (!centre) return NextResponse.json({ error: "Centre not found." }, { status: 404 });

    const activeMembers = await countActiveMembers(centre.id);
    if (seatsRemaining(centre.seatLimit, activeMembers) <= 0) {
      return NextResponse.json(
        { error: `All ${centre.seatLimit} seats are in use. Remove someone or move up a plan.` },
        { status: 409 },
      );
    }

    const admin = createAdminSupabase();

    // Already on the team? Say so rather than sending a confusing invite.
    const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existingProfile) {
      const theirMembership = await getMembership(existingProfile.id);
      if (theirMembership?.centreId === centre.id) {
        return NextResponse.json({ error: "They are already in this centre." }, { status: 409 });
      }
      if (theirMembership) {
        return NextResponse.json(
          { error: "That educator already belongs to another centre. They will need to leave it first." },
          { status: 409 },
        );
      }
    }

    // Replaces any outstanding invite for the same address rather than stacking,
    // and the link is returned either way so it can be shared by hand.
    const made = await createCentreInvite({ centre, email, role, invitedBy: user.id });
    if (!made.ok) return NextResponse.json({ error: "Could not create the invitation." }, { status: 500 });
    const { invite, token } = made;
    const mail = { sent: made.emailSent };

    return NextResponse.json({
      invite: { id: invite.id, email: invite.email, role: invite.role, expiresAt: invite.expires_at },
      emailSent: mail.sent,
      shareUrl: `/join?token=${encodeURIComponent(token)}`,
    });
  } catch (error) {
    console.error("Invite create error:", error);
    return NextResponse.json({ error: "Could not create the invitation." }, { status: 500 });
  }
}
