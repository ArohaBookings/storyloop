"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Mic, Play, RotateCcw, Square, Trash2, Wand2 } from "lucide-react";
import { MAX_RECORDING_SECONDS, MAX_WORDS_LENGTH } from "@/lib/child-voice";

/**
 * The only screen in StoryLoop operated by a three-year-old.
 *
 * Everything about it is shaped by one fact: the user cannot read. So nothing
 * they must understand is written down. There is one enormous button, it is
 * round because a round thing is pressable and a rectangle is a label, and it
 * grows with the sound of their own voice so they can SEE that it is listening
 * to them. That feedback is not decoration. It is the only way a pre-literate
 * person can tell the difference between a machine that is recording and a
 * machine that has frozen.
 *
 * Afterwards they get two choices, both pictures: a tick to keep it and an
 * arrow to go again. A child who does not want their recording kept can say so
 * and be obeyed in one press, which is the only form of consent somebody that
 * age can meaningfully give, so it is given the bigger, friendlier control.
 *
 * Then the adult step, deliberately separate: an educator writes down what they
 * heard. The machine's guess is offered only if asked for, and labelled as a
 * guess, because published error rates for this age run from a third to two
 * thirds of words wrong and an educator who reads a plausible sentence will
 * believe it.
 *
 * THE RECORDING NEVER LEAVES THIS TAB unless the educator asks for a draft,
 * and it is never stored anywhere at all.
 */

type Stage = "idle" | "recording" | "heard" | "writing";

type Child = { id: string; name: string; voice_consent_at: string | null };

export default function ChildVoiceRecorder({
  child,
  onSaved,
}: {
  child: Child;
  onSaved?: () => void;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [words, setWords] = useState("");
  const [draft, setDraft] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedName, setSavedName] = useState("");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const urlRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);

  /** Let go of the microphone, the meter and the blob URL. */
  const teardown = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  }, []);

  const discard = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    blobRef.current = null;
    chunksRef.current = [];
    setLevel(0);
    setElapsed(0);
    setDraft(null);
    setWords("");
  }, []);

  useEffect(() => () => { teardown(); discard(); }, [teardown, discard]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError("");
    setSavedName("");
    discard();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // The meter. This is what tells a child the machine can hear them.
      const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const context = new AudioContextCtor();
      audioContextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      context.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const sample of data) peak = Math.max(peak, Math.abs(sample - 128) / 128);
        // Eased, so the circle breathes rather than flickers.
        setLevel((current) => current + (peak - current) * 0.35);
        setElapsed((Date.now() - startedAtRef.current) / 1000);
        frameRef.current = requestAnimationFrame(tick);
      };

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        teardown();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        blobRef.current = blob;
        urlRef.current = URL.createObjectURL(blob);
        setLevel(0);
        setStage("heard");
      };

      startedAtRef.current = Date.now();
      recorder.start();
      setStage("recording");
      frameRef.current = requestAnimationFrame(tick);
    } catch {
      setError("StoryLoop could not reach the microphone. Check the browser's microphone permission.");
      setStage("idle");
    }
  }, [discard, teardown]);

  // Nobody is listening past a minute, and a runaway recording is a runaway
  // upload, so the limit is enforced rather than suggested.
  useEffect(() => {
    if (stage !== "recording") return;
    if (elapsed >= MAX_RECORDING_SECONDS) stop();
  }, [stage, elapsed, stop]);

  const playBack = () => {
    if (!urlRef.current) return;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = urlRef.current;
    void audioRef.current.play().catch(() => {});
  };

  const askForDraft = async () => {
    if (!blobRef.current) return;
    setDrafting(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", blobRef.current, "voice.webm");
      const res = await fetch("/api/child-voice/draft", { method: "POST", body: form });
      const data = await res.json();
      if (data.draft) {
        setDraft(data.draft);
        setWords(data.draft);
      } else {
        setError("No guess this time. Write down what you heard.");
      }
    } catch {
      setError("No guess this time. Write down what you heard.");
    } finally {
      setDrafting(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/child-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ childId: child.id, words, draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save that.");
      setSavedName(child.name);
      setStage("idle");
      discard();
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that.");
    } finally {
      setSaving(false);
    }
  };

  if (!child.voice_consent_at) {
    return (
      <div className="rounded-3xl border border-clay-200 bg-paper p-6 text-center">
        <Mic className="mx-auto h-12 w-12 text-clay-200" strokeWidth={1.5} />
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-600">
          Record {child.name}&apos;s family consent above and this becomes a button {child.name} can press.
        </p>
      </div>
    );
  }

  const remaining = Math.max(0, 1 - elapsed / MAX_RECORDING_SECONDS);
  // 1 at rest, up to ~1.18 when they are really going for it.
  const scale = 1 + Math.min(level, 1) * 0.18;

  return (
    <div className="rounded-3xl border border-clay-200 bg-paper p-6 text-center">
      {stage === "idle" && (
        <>
          <p className="font-display text-2xl font-bold text-ink-900">{child.name}, tell us about it</p>
          <p className="mt-1 text-sm text-ink-500">Press the big circle and talk. Press it again when you are done.</p>
          <button
            type="button"
            onClick={start}
            aria-label={`Start recording ${child.name}`}
            className="child-mic mx-auto mt-6 flex h-44 w-44 items-center justify-center rounded-full bg-clay-700 text-paper shadow-warm transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-clay-400 active:scale-95"
          >
            <Mic className="h-20 w-20" strokeWidth={1.5} />
          </button>
          {savedName && (
            <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-sage-100 px-4 py-1.5 text-sm text-sage-800">
              <Check className="h-4 w-4" /> Saved in {savedName}&apos;s own words
            </p>
          )}
        </>
      )}

      {stage === "recording" && (
        <>
          <p className="font-display text-2xl font-bold text-ink-900">Listening…</p>
          <p className="mt-1 text-sm text-ink-500">Press again when you are finished.</p>
          <div className="relative mx-auto mt-6 h-44 w-44">
            {/* The ring empties as the time goes. No numbers: a three-year-old
                cannot read a countdown, but they can see a circle closing. */}
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="3" className="text-clay-100" />
              <circle
                cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                className="text-sage-600" strokeDasharray={2 * Math.PI * 47}
                strokeDashoffset={2 * Math.PI * 47 * (1 - remaining)}
              />
            </svg>
            <button
              type="button"
              onClick={stop}
              aria-label="Stop recording"
              style={{ transform: `scale(${scale})` }}
              className="child-mic-live absolute inset-2 flex items-center justify-center rounded-full bg-sage-700 text-paper shadow-warm transition-transform duration-100 active:scale-95"
            >
              <Square className="h-16 w-16" strokeWidth={1.5} fill="currentColor" />
            </button>
          </div>
        </>
      )}

      {stage === "heard" && (
        <>
          <p className="font-display text-2xl font-bold text-ink-900">Want to hear it?</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={playBack}
              aria-label="Play it back"
              className="flex h-28 w-28 items-center justify-center rounded-full bg-cream-100 text-ink-800 shadow-soft transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Play className="h-12 w-12" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => { discard(); setStage("idle"); }}
              aria-label="Delete this and start again"
              className="flex h-28 w-28 items-center justify-center rounded-full bg-cream-100 text-clay-700 shadow-soft transition-transform hover:scale-[1.03] active:scale-95"
            >
              <RotateCcw className="h-12 w-12" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => setStage("writing")}
              aria-label="Keep this one"
              className="flex h-28 w-28 items-center justify-center rounded-full bg-sage-700 text-paper shadow-warm transition-transform hover:scale-[1.03] active:scale-95"
            >
              <Check className="h-12 w-12" strokeWidth={2} />
            </button>
          </div>
          <p className="mt-4 text-sm text-ink-500">
            Listen, go again, or keep it. Nothing is saved until a grown-up writes down what you said.
          </p>
        </>
      )}

      {stage === "writing" && (
        <div className="text-left">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-xl font-bold text-ink-900">What did {child.name} say?</p>
            <button type="button" onClick={playBack} className="btn-secondary text-xs">
              <Play className="h-3.5 w-3.5" /> Play it again
            </button>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            Their words, not tidied up. &ldquo;I builded a tower&rdquo; is the record, and it is worth more than a
            corrected version of it.
          </p>

          <textarea
            id="child-words"
            value={words}
            onChange={(event) => setWords(event.target.value.slice(0, MAX_WORDS_LENGTH))}
            rows={3}
            autoFocus
            placeholder="i builded it really high and it dint fall down"
            className="mt-3 w-full rounded-2xl border border-clay-200 bg-cream-50 p-3 text-base leading-relaxed text-ink-900 focus:border-clay-400 focus:outline-none"
          />

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={askForDraft} disabled={drafting} className="btn-secondary text-xs">
              {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              {drafting ? "Listening back…" : "Have a guess for me"}
            </button>
            {draft && (
              <span className="text-xs text-ink-500">
                That is a guess, and this age transcribes badly. Check every word against the recording.
              </span>
            )}
          </div>

          {error && <p role="alert" className="mt-3 text-sm text-clay-700">{error}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={save} disabled={saving || !words.trim()} className="btn-primary text-sm disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save {child.name}&apos;s words
            </button>
            <button
              type="button"
              onClick={() => { discard(); setStage("idle"); }}
              className="btn-secondary text-sm"
            >
              <Trash2 className="h-4 w-4" /> Throw it away
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            The recording itself is never saved. It stays in this tab and disappears when you leave the page.
          </p>
        </div>
      )}

      {error && stage !== "writing" && <p role="alert" className="mt-4 text-sm text-clay-700">{error}</p>}
    </div>
  );
}
