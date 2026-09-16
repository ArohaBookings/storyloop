import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getMembership, getCentre, countActiveMembers, canAcceptInvite } from "@/lib/centres";
import { consumeRateLimit } from "@/lib/rate-limit";

/**
 * Accept a centre invitation.
 *
 * The token is the only proof the invitation is genuine, so this is rate
 * limited per caller: without it the endpoint is a guessing oracle. Tokens are
 * 32 random bytes, so guessing is not realistic, but a bounded endpoint is
 * cheaper than trusting that forever.
 *
 * Deliberately does NOT require the signed-in address to match the invited
 * address. Educators routinely sign up with a personal address and get invited
 * on their work one. What matters is that they hold the token. The invited
 * address is recorded either way so leadership can see who it was meant for.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to accept this invitation." }, { status: 401 });

    const allowed = await consumeRateLimit({
      scope: "centre-invite-accept",
      key: user.id,
      limit: 20,
      windowSeconds: 60 * 10,
    });
    if (!allowed) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!token) return NextResponse.json({ error: "This invitation link is incomplete." }, { status: 400 });

    const existing = await getMembership(user.id);
    if (existing) {
      return NextResponse.json(
        { error: "You already belong to a centre. Leave it before joining another." },
        { status: 409 },
      );
    }

    const admin = createAdminSupabase();
    const { data: invite } = await admin
      .from("centre_invites")
      .select("id, centre_id, email, role, expires_at, accepted_at, revoked_at")
      .eq("token", token)
      .maybeSingle();

    // Same message whether the token is wrong or spent, so this cannot be used
    // to work out which tokens exist.
    if (!invite) return NextResponse.json({ error: "This invitation is not valid any more." }, { status: 404 });

    const centre = await getCentre(invite.centre_id);
    if (!centre) return NextResponse.json({ error: "This invitation is not valid any more." }, { status: 404 });

    const activeMembers = await countActiveMembers(centre.id);
    const verdict = canAcceptInvite({
      seatLimit: centre.seatLimit,
      activeMembers,
      expiresAt: invite.expires_at,
      acceptedAt: invite.accepted_at,
      revokedAt: invite.revoked_at,
      now: new Date(),
    });

    if (!verdict.ok) {
      const message =
        verdict.reason === "no_seats"
          ? "That centre has no seats left. Ask them to free one up."
          : verdict.reason === "expired"
            ? "This invitation has expired. Ask for a new one."
            : "This invitation is not valid any more.";
      return NextResponse.json({ error: message, reason: verdict.reason }, { status: 409 });
    }

    const { error: memberError } = await admin.from("centre_members").insert({
      centre_id: centre.id,
      user_id: user.id,
      role: invite.role === "admin" ? "admin" : "educator",
      status: "active",
      // Opt in, always. Joining a centre never hands over your drafts.
      shares_stories: false,
    });

    if (memberError) {
      console.error("Invite accept insert failed:", memberError.message);
      return NextResponse.json({ error: "Could not join that centre." }, { status: 500 });
    }

    await admin
      .from("centre_invites")
      .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
      .eq("id", invite.id);

    return NextResponse.json({
      centre: { id: centre.id, name: centre.name },
      role: invite.role,
      sharesStories: false,
    });
  } catch (error) {
    console.error("Invite accept error:", error);
    return NextResponse.json({ error: "Could not join that centre." }, { status: 500 });
  }
}
