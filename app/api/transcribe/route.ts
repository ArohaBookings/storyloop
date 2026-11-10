import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { STORY_FRAMEWORKS, normalizeFramework } from "@/lib/story-options";
import { INTERNATIONAL_FRAMEWORKS, isInternationalFramework, normalizeAnyFramework } from "@/lib/international-frameworks";
import { billingBlockPayload, isBillingBlocked } from "@/lib/billing-access";
import { consumeRateLimit } from "@/lib/rate-limit";
import { cleanRoomNames, namesHint, unsureWords } from "@/lib/room-mode";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

let openAIClient: OpenAI | null = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for voice transcription.");
  }

  if (!openAIClient) {
    openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openAIClient;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Sign in to use voice notes." }, { status: 401 });
    }

    const profile = await getOrCreateProfile(user);
    if (profile.is_active === false) {
      return NextResponse.json({ error: "Your account has been disabled. Contact support." }, { status: 403 });
    }
    if (isBillingBlocked(profile)) {
      return NextResponse.json(billingBlockPayload(profile), { status: 402 });
    }
    const formData = await request.formData();
    // Room mode (lib/room-mode.ts) sends a long session as pieces of under a
    // minute, so it has its own allowance: a 15-minute session is about 20
    // pieces. An ordinary voice note is counted exactly as before.
    const room = formData.get("mode") === "room";
    const allowed = await consumeRateLimit(
      room
        ? { scope: "room-transcription", key: user.id, limit: 90, windowSeconds: 60 * 60 }
        : { scope: "voice-transcription", key: user.id, limit: 30, windowSeconds: 60 * 60 },
    );
    if (!allowed) {
      return NextResponse.json({ error: "Voice-note limit reached. Try again later." }, { status: 429 });
    }

    const upload = formData.get("file");

    if (!upload || typeof upload === "string") {
      return NextResponse.json({ error: "No audio file was provided." }, { status: 400 });
    }

    if (upload.size === 0) {
      return NextResponse.json({ error: "The recording was empty. Please try again." }, { status: 400 });
    }

    if (upload.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Voice notes must be under 25 MB." }, { status: 400 });
    }

    const requestedFramework =
      typeof formData.get("framework") === "string" ? String(formData.get("framework")) : undefined;
    const framework = normalizeFramework(requestedFramework ?? profile.story_preferences.defaultFramework);
    // England and Ireland get their own transcription hint; AU and NZ unchanged.
    const internationalFramework = normalizeAnyFramework(requestedFramework ?? profile.story_preferences.defaultFramework);
    const basePrompt = isInternationalFramework(internationalFramework)
      ? INTERNATIONAL_FRAMEWORKS[internationalFramework].transcriptionPrompt
      : STORY_FRAMEWORKS[framework].transcriptionPrompt;

    if (room) {
      // The children's first names, so they are spelled the educator's way, and
      // the transcriber's own confidence, so doubtful words can be shown to her.
      const names = cleanRoomNames(typeof formData.get("names") === "string" ? String(formData.get("names")) : "");
      const heard = await getOpenAI().audio.transcriptions.create({
        file: upload,
        model: "gpt-4o-mini-transcribe",
        prompt: `${basePrompt}${namesHint(names)}`,
        response_format: "json",
        include: ["logprobs"],
      });
      // A quiet minute in a long session is normal: it comes back empty, not as an error.
      return NextResponse.json({ text: heard.text?.trim() ?? "", unsure: unsureWords(heard.logprobs) });
    }

    const transcription = await getOpenAI().audio.transcriptions.create({
      file: upload,
      model: "gpt-4o-mini-transcribe",
      prompt: basePrompt,
    });

    const text = transcription.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "We couldn't make out that voice note. Please try again." }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Voice transcription failed." },
      { status: 500 }
    );
  }
}
