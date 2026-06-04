import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { STORY_FRAMEWORKS, normalizeFramework } from "@/lib/story-options";
import { billingBlockPayload, isBillingBlocked } from "@/lib/billing-access";

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
    const transcription = await getOpenAI().audio.transcriptions.create({
      file: upload,
      model: "gpt-4o-mini-transcribe",
      prompt: STORY_FRAMEWORKS[framework].transcriptionPrompt,
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
