import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAccessProfile } from "@/lib/supabase/profiles";
import { billingBlockPayload, isBillingBlocked } from "@/lib/billing-access";
import { consumeRateLimit } from "@/lib/rate-limit";
import { NOTES_PHOTO_MAX_BYTES, NOTES_PHOTO_TYPES, readNotesPhoto } from "@/lib/ai/read-notes";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * "Photo of my notes": reads the writing in a photo of an educator's notes and
 * returns it as text for the observation box (lib/ai/read-notes.ts). Signed-in
 * educators on every plan. The photo is held in memory for this request only
 * and is never written to the database or to storage.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to add notes from a photo." }, { status: 401 });

    const profile = await getAccessProfile(user);
    if (profile.is_active === false) {
      return NextResponse.json({ error: "Your account has been disabled. Contact support." }, { status: 403 });
    }
    if (isBillingBlocked(profile)) return NextResponse.json(billingBlockPayload(profile), { status: 402 });

    const allowed = await consumeRateLimit({ scope: "notes-photo", key: user.id, limit: 20, windowSeconds: 60 * 60 });
    if (!allowed) return NextResponse.json({ error: "That is a lot of photos in one hour. Try again a little later, or type the note." }, { status: 429 });

    const formData = await request.formData();
    const upload = formData.get("file");
    if (!upload || typeof upload === "string") return NextResponse.json({ error: "No photo was provided." }, { status: 400 });
    if (upload.size === 0) return NextResponse.json({ error: "That photo was empty. Please try again." }, { status: 400 });
    if (upload.size > NOTES_PHOTO_MAX_BYTES) return NextResponse.json({ error: "That photo is too large. Take it again a little further back." }, { status: 400 });
    if (!(NOTES_PHOTO_TYPES as readonly string[]).includes(upload.type)) {
      return NextResponse.json({ error: "Use a JPG or PNG photo of your notes." }, { status: 400 });
    }

    const base64 = Buffer.from(await upload.arrayBuffer()).toString("base64");
    const reading = await readNotesPhoto({ base64, mimeType: upload.type });
    if (!reading) {
      return NextResponse.json(
        { error: "We could not find any written notes in that photo. Try again in good light with the writing filling the frame, or type the note." },
        { status: 422 },
      );
    }
    return NextResponse.json({ text: reading.text, unclear: reading.unclear });
  } catch (error) {
    console.error("Notes photo error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "We could not read that photo just now. Try again, or type the note." }, { status: 500 });
  }
}
