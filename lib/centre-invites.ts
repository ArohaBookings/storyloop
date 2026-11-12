import { randomBytes } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { sendCentreInviteEmail } from "@/lib/email/centre-invite";

export const INVITE_DAYS = 14;

/**
 * Make a centre invitation and email it. The one way an invitation is made,
 * whether a leader typed the address (app/api/centres/invites) or tapped
 * "Invite Sam" from the story Sam sent them (lib/leader-offer-server.ts).
 *
 * The caller has already checked who may invite and that a seat is free.
 * Any outstanding invitation to the same address for the same centre is
 * replaced rather than stacked. A failed email never loses the invitation: the
 * educator's bell (lib/notifications.ts) finds it by address either way.
 */
export async function createCentreInvite(input: {
  centre: { id: string; name: string };
  email: string;
  role: "admin" | "educator";
  invitedBy: string;
  fromLeaderOffer?: boolean;
}): Promise<{ ok: true; invite: { id: string; email: string; role: string; expires_at: string }; token: string; emailSent: boolean } | { ok: false }> {
  const admin = createAdminSupabase();
  await admin
    .from("centre_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("centre_id", input.centre.id)
    .eq("email", input.email)
    .is("accepted_at", null)
    .is("revoked_at", null);

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: invite, error } = await admin
    .from("centre_invites")
    .insert({
      centre_id: input.centre.id,
      email: input.email,
      role: input.role,
      token,
      invited_by: input.invitedBy,
      expires_at: expiresAt,
      ...(input.fromLeaderOffer ? { from_leader_offer: true } : {}),
    })
    .select("id, email, role, expires_at")
    .single();
  if (error || !invite) {
    console.error("Invite create failed:", error?.message);
    return { ok: false };
  }

  const { data: inviterProfile } = await admin.from("profiles").select("full_name").eq("id", input.invitedBy).maybeSingle();
  const mail = await sendCentreInviteEmail({
    to: input.email,
    centreName: input.centre.name,
    inviterName: inviterProfile?.full_name ?? null,
    token,
  });
  return { ok: true, invite, token, emailSent: mail.sent };
}
