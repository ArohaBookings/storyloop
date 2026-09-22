import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import { consumeRateLimit } from "@/lib/rate-limit";
import { draftIsWorthOffering, normalizeChildWords } from "@/lib/child-voice";

/**
 * A suggested transcript of what a child just said. A SUGGESTION.
 *
 * Published word error rates for this age group run to roughly 35% for
 * kindergarten-aged children and 63% for spontaneous preschool speech in a real
 * room. So this endpoint is not a transcription service, it is a first guess
 * that saves typing when it happens to be close, and it is labelled that way
 * everywhere it surfaces. The educator who was standing there decides.
 *
 * THE AUDIO IS NOT STORED. It arrives in memory, goes to the transcription
 * model, and is gone when this function returns. Nothing is written to a
 * bucket, a table or a log. See supabase/migrations/20260922_child_voice_notes
 * for why that is a design decision and not an oversight.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A minute of a three-year-old. Anything larger is not a child's voice note.
const MAX_AUDIO_BYTES = 6 * 1024 * 1024;

let client: OpenAI | null = null;
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getOrCreateProfile(user);
    if (!hasFeatureAccess(profile.plan, "childVoice")) {
      return NextResponse.json({ error: "Children's own words is on paid plans." }, { status: 403 });
    }

    const allowed = await consumeRateLimit({ scope: "child-voice-draft", key: user.id, limit: 60, windowSeconds: 60 * 60 });
    if (!allowed) {
      return NextResponse.json({ error: "That is a lot of recordings in an hour. Try again shortly." }, { status: 429 });
    }

    const formData = await request.formData();
    const upload = formData.get("file");
    if (!upload || typeof upload === "string" || upload.size === 0) {
      return NextResponse.json({ error: "No recording was provided." }, { status: 400 });
    }
    if (upload.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "That recording is too long." }, { status: 400 });
    }

    // No key configured is not an error worth showing a child: the educator
    // simply writes down what they heard, which is the better path anyway.
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ draft: "", unavailable: true });
    }

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: upload,
      model: "gpt-4o-mini-transcribe",
      // Steer it towards hearing a young child rather than tidying one up. It
      // will still get plenty wrong, which is why an adult checks every word.
      prompt:
        "A young child, around three to five years old, talking about something they made or did. " +
        "Write exactly what you hear, including their own grammar and invented words. " +
        "Do not correct or complete their sentences.",
    });

    const draft = normalizeChildWords(transcription.text ?? "");
    // A one-word guess anchors an educator to somebody else's mistake without
    // saving them any typing, so it is not worth offering at all.
    if (!draftIsWorthOffering(draft)) return NextResponse.json({ draft: "", tooShort: true });

    return NextResponse.json({ draft });
  } catch (error) {
    console.error("Child voice draft failed:", error);
    // Failing here must never block the educator: they can always type it.
    return NextResponse.json({ draft: "", unavailable: true });
  }
}
