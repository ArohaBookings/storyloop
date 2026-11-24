import { createAdminSupabase } from "@/lib/supabase/admin";
import { cleanFirstName } from "@/lib/statement-from-notes";
import { cleanLeaderAddress, heldMessage, senderFirstName, type HeldReason } from "@/lib/leader-email";
import { sendLeaderEmail } from "@/lib/email/leader-check";

/**
 * What both doors (a story's check, a whole room's set) do after the link is
 * made, when she asked StoryLoop to email her leader (25 Nov 2026, A2). The
 * link is made first and returned whatever happens here: a held or failed
 * email only means she copies the link herself.
 */
export type EmailOutcome = { asked: false } | { asked: true; sent: true } | { asked: true; sent: false; reason: HeldReason | "failed"; message: string };

export async function emailLeaderIfAsked(input: {
  userId: string;
  body: Record<string, unknown>;
  kind: "story" | "set";
  checkId?: string;
  setId?: string;
  token: string;
  centreName: string;
  pieces: number;
  expiresAt: string;
}): Promise<EmailOutcome> {
  if (typeof input.body.email !== "string" || !input.body.email.trim()) return { asked: false };
  const address = cleanLeaderAddress(input.body.email);
  const admin = createAdminSupabase();
  const { data: profile } = await admin.from("profiles").select("full_name, email").eq("id", input.userId).maybeSingle();
  let fullName = (profile?.full_name as string | null) ?? null;
  const ownEmail = (profile?.email as string | null) ?? null;
  // She was asked for her first name: keep it on her profile, as the rest of the app shows it.
  const typed = cleanFirstName(input.body.firstName);
  if (typed && !senderFirstName(fullName, ownEmail)) {
    await admin.from("profiles").update({ full_name: typed }).eq("id", input.userId);
    fullName = typed;
  }
  const result = await sendLeaderEmail({
    userId: input.userId,
    ownEmail,
    fullName,
    kind: input.kind,
    checkId: input.checkId,
    setId: input.setId,
    token: input.token,
    address,
    centreName: input.centreName,
    pieces: input.pieces,
    expiresAt: input.expiresAt,
  });
  if (result.sent) return { asked: true, sent: true };
  const message = result.reason === "failed" ? "We could not send it. Copy the link instead." : heldMessage(result.reason);
  return { asked: true, sent: false, reason: result.reason, message };
}
