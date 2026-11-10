"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, Loader2, Mic, RotateCcw, Square } from "lucide-react";
import { track } from "@/lib/analytics/client";
import {
  ROOM_HANDOFF_GROUP,
  ROOM_HANDOFF_STORY,
  ROOM_MAX_SECONDS,
  allSegmentsSettled,
  applyNameFix,
  cleanRoomNames,
  clock,
  hasMissedMark,
  nameChecks,
  roomTranscript,
  shouldCutSegment,
  type RoomSegment,
} from "@/lib/room-mode";

type ChildProfile = { id: string; name: string };
type Phase = "ready" | "recording" | "finishing" | "check";

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function extensionFor(mimeType: string) {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  return "webm";
}

/**
 * Room mode (lib/room-mode.ts): one long voice note for a whole session, then
 * a transcript to check before anything is written.
 *
 * The recording is cut into pieces of under a minute, at a pause, and each
 * piece is sent as soon as it ends. So the words appear while she is still
 * talking, a dropped connection loses seconds rather than the session, and
 * the lost seconds are marked in the transcript. Nothing is written here:
 * the checked transcript goes to the group page (two to eight children) or
 * the story page (one child), which work exactly as they always have.
 */
export default function RoomModePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("ready");
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [segments, setSegments] = useState<RoomSegment[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const startedAtRef = useRef(0);
  const segmentStartedAtRef = useRef(0);
  const quietMsRef = useRef(0);
  const createdRef = useRef(0);
  const namesRef = useRef<string[]>([]);
  const boxRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => { namesRef.current = names; }, [names]);

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined");
    fetch("/api/children")
      .then((res) => (res.ok ? res.json() : { children: [] }))
      .then((data) => setProfiles(((data.children ?? []) as ChildProfile[]).filter((child) => child.name?.trim())))
      .catch(() => {});
  }, []);

  const settle = useCallback((index: number, patch: Partial<RoomSegment>) => {
    setSegments((current) => current.map((segment) => (segment.index === index ? { ...segment, ...patch } : segment)));
  }, []);

  const upload = useCallback(async (index: number, seconds: number, blob: Blob) => {
    setSegments((current) => [...current, { index, seconds }]);
    // A piece with almost nothing in it is silence, not a failure.
    if (blob.size < 1500) { settle(index, { text: "" }); return; }
    const send = async () => {
      const form = new FormData();
      form.append("file", new File([blob], `room-${index}.${extensionFor(blob.type)}`, { type: blob.type || "audio/webm" }));
      form.append("mode", "room");
      form.append("names", namesRef.current.join(","));
      const response = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(data.error ?? "That piece could not be turned into words."), { status: response.status });
      return data as { text?: string; unsure?: string[] };
    };
    try {
      let data: { text?: string; unsure?: string[] };
      try {
        data = await send();
      } catch (first) {
        const status = (first as { status?: number }).status;
        // Payment or sign-in problems will not fix themselves; anything else gets one more go.
        if (status === 401 || status === 402 || status === 403 || status === 429) throw first;
        await new Promise((resolve) => setTimeout(resolve, 1500));
        data = await send();
      }
      settle(index, { text: data.text ?? "", unsure: Array.isArray(data.unsure) ? data.unsure : [] });
    } catch (failure) {
      settle(index, { failed: true });
      setError(failure instanceof Error ? failure.message : "A piece could not be turned into words.");
    }
  }, [settle]);

  const startSegment = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const index = createdRef.current++;
    const startedAt = performance.now();
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
    recorder.onstop = () => {
      void upload(index, (performance.now() - startedAt) / 1000, new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
    };
    recorder.start();
    recorderRef.current = recorder;
    segmentStartedAtRef.current = startedAt;
    quietMsRef.current = 0;
  }, [upload]);

  const cutSegment = useCallback((last: boolean) => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
    recorderRef.current = null;
    if (!last) startSegment();
  }, [startSegment]);

  const releaseDevices = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioRef.current?.close().catch(() => {});
    audioRef.current = null; analyserRef.current = null;
    void wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const stop = useCallback(() => {
    cutSegment(true);
    releaseDevices();
    setPhase("finishing");
  }, [cutSegment, releaseDevices]);

  const start = async () => {
    setError(""); setSegments([]); setTranscript(""); setElapsed(0); createdRef.current = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      // Listening for pauses, so a piece is cut between sentences and not through a word.
      try {
        const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          ctx.createMediaStreamSource(stream).connect(analyser);
          audioRef.current = ctx; analyserRef.current = analyser;
        }
      } catch { /* no pause detection: pieces are cut on the clock instead */ }
      // Keep the screen awake: a phone that sleeps stops recording.
      try {
        const wl = (navigator as unknown as { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
        if (wl) wakeLockRef.current = await wl.request("screen");
      } catch { /* not supported or refused */ }

      startedAtRef.current = performance.now();
      startSegment();
      setPhase("recording");
      const buffer = new Uint8Array(1024);
      timerRef.current = setInterval(() => {
        const now = performance.now();
        const total = (now - startedAtRef.current) / 1000;
        setElapsed(Math.floor(total));
        const analyser = analyserRef.current;
        if (analyser) {
          analyser.getByteTimeDomainData(buffer);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) { const v = (buffer[i] - 128) / 128; sum += v * v; }
          quietMsRef.current = Math.sqrt(sum / buffer.length) < 0.02 ? quietMsRef.current + 100 : 0;
        }
        if (total >= ROOM_MAX_SECONDS) { stop(); return; }
        if (shouldCutSegment({ secondsInSegment: (now - segmentStartedAtRef.current) / 1000, quietMs: quietMsRef.current })) cutSegment(false);
      }, 100);
    } catch {
      releaseDevices();
      setError("StoryLoop could not use the microphone. Allow it in your browser, then try again.");
    }
  };

  // Leaving the page mid-recording must not leave the microphone on.
  useEffect(() => () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") { recorder.onstop = null; recorder.stop(); }
    releaseDevices();
  }, [releaseDevices]);

  // Every piece is back (or marked lost): show the whole transcript to check.
  useEffect(() => {
    if (phase !== "finishing") return;
    if (segments.length < createdRef.current || !allSegmentsSettled(segments)) return;
    const text = roomTranscript(segments);
    setTranscript(text);
    setPhase("check");
    track("room_session", { seconds: Math.round(segments.reduce((sum, s) => sum + s.seconds, 0)), pieces: segments.length, lost: segments.filter((s) => s.failed).length, words: text ? text.split(/\s+/).length : 0 });
  }, [phase, segments]);

  const toggle = (name: string) => setNames((current) => (current.includes(name) ? current.filter((n) => n !== name) : [...current, name]));
  const addTyped = () => {
    const [name] = cleanRoomNames(typed);
    if (name && !names.some((n) => n.toLowerCase() === name.toLowerCase())) setNames([...names, name]);
    setTyped("");
  };

  const live = useMemo(() => roomTranscript(segments), [segments]);
  const waiting = segments.filter((s) => !s.failed && typeof s.text !== "string").length;
  const checks = useMemo(() => nameChecks(transcript, names), [transcript, names]);
  const unsure = useMemo(() => {
    const lower = transcript.toLowerCase();
    const known = new Set(names.map((n) => n.toLowerCase()));
    const seen = new Set<string>();
    return segments.flatMap((s) => s.unsure ?? []).filter((word) => {
      const key = word.toLowerCase();
      if (seen.has(key) || known.has(key) || !lower.includes(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
  }, [segments, transcript, names]);
  const missed = hasMissedMark(transcript);
  const words = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  const findWord = (word: string) => {
    const box = boxRef.current;
    if (!box) return;
    const at = transcript.toLowerCase().indexOf(word.toLowerCase());
    if (at < 0) return;
    box.focus();
    box.setSelectionRange(at, at + word.length);
  };

  const goOn = () => {
    const note = transcript.trim();
    try {
      if (names.length >= 2) {
        window.sessionStorage.setItem(ROOM_HANDOFF_GROUP, JSON.stringify({ note, names }));
        router.push("/group?from=room");
      } else {
        window.sessionStorage.setItem(ROOM_HANDOFF_STORY, note);
        const child = names.length === 1 ? profiles.find((p) => firstName(p.name).toLowerCase() === names[0].toLowerCase()) : undefined;
        router.push(child ? `/generate?room=1&child=${encodeURIComponent(child.id)}` : "/generate?room=1");
      }
    } catch {
      setError("Your browser would not pass the words on. Copy them from the box and paste them into a new story.");
    }
  };

  const nameChips = (
    <div>
      <p className="label">Who is this about today? <span className="font-normal text-ink-500">(so their names are spelled your way)</span></p>
      <div className="flex flex-wrap gap-2">
        {profiles.map((child) => {
          const name = firstName(child.name);
          const on = names.some((n) => n.toLowerCase() === name.toLowerCase());
          return (
            <button key={child.id} type="button" onClick={() => toggle(name)} aria-pressed={on}
              className={`min-h-[44px] rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${on ? "border-clay-600 bg-clay-700 text-paper" : "border-clay-200 bg-paper text-ink-700 hover:border-clay-400"}`}>
              {name}
            </button>
          );
        })}
        {names.filter((n) => !profiles.some((p) => firstName(p.name).toLowerCase() === n.toLowerCase())).map((name) => (
          <button key={name} type="button" onClick={() => toggle(name)} aria-pressed className="rounded-full border border-clay-600 bg-clay-700 px-3.5 py-2 text-sm font-semibold text-paper">{name}</button>
        ))}
      </div>
      <div className="mt-3 flex max-w-sm gap-2">
        <input value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTyped(); } }}
          placeholder="Add a first name" aria-label="Add a child's first name" className="input min-w-0 flex-1 text-sm" />
        <button type="button" onClick={addTyped} className="btn-secondary px-4 py-2 text-sm">Add</button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8" data-testid="room-mode">
      <div className="mb-6 max-w-3xl">
        <p className="section-title mb-2">New</p>
        <h1 className="font-display text-4xl font-bold text-ink-900">Room mode</h1>
        <p className="mt-2 text-base leading-relaxed text-ink-600">
          Talk through your whole session in one go, up to {Math.round(ROOM_MAX_SECONDS / 60)} minutes. You get every word back to check,
          then StoryLoop splits it by child and you write each story.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex max-w-3xl items-start gap-2 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-800" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" /> <span>{error}</span>
        </div>
      )}

      {phase === "ready" && (
        <div className="card max-w-3xl p-5 sm:p-6">
          {nameChips}
          <ul className="mt-5 space-y-1.5 text-sm leading-relaxed text-ink-700">
            <li>Say what you saw, as you would tell a colleague: who, what they did, what they said.</li>
            <li>It is your voice note, not a recording of the room. Step aside to talk, and use first names only.</li>
            <li>The sound is turned into words and is not kept. Nothing is saved until you write a story.</li>
          </ul>
          {supported ? (
            <button type="button" onClick={start} className="btn-primary mt-6 w-full justify-center py-3.5 text-base sm:w-auto sm:px-8" data-testid="room-start">
              <Mic className="h-4 w-4" /> Start talking
            </button>
          ) : (
            <p className="mt-6 rounded-xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm text-clay-800">
              This browser cannot record sound. Use the voice note button on <Link href="/generate" className="font-semibold underline">a new story</Link>, or type your notes.
            </p>
          )}
        </div>
      )}

      {(phase === "recording" || phase === "finishing") && (
        <div className="card max-w-3xl p-5 sm:p-6" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-clay-700">
                {phase === "recording" ? <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-clay-600" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                {phase === "recording" ? "Listening" : "Finishing the last words"}
              </p>
              <p className="mt-1 font-display text-4xl font-bold tabular-nums text-ink-900" data-testid="room-clock">
                {clock(elapsed)} <span className="text-base font-semibold text-ink-500">of {clock(ROOM_MAX_SECONDS)}</span>
              </p>
            </div>
            {phase === "recording" && (
              <button type="button" onClick={stop} className="btn-primary px-7 py-3.5 text-base" data-testid="room-stop">
                <Square className="h-4 w-4" /> I&apos;m done
              </button>
            )}
          </div>
          <div className="mt-5 rounded-2xl border border-clay-100 bg-cream-50/70 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Your words so far{waiting > 0 ? ` (${waiting} ${waiting === 1 ? "piece" : "pieces"} on the way)` : ""}</p>
            <p className="mt-2 min-h-[4rem] whitespace-pre-wrap text-sm leading-relaxed text-ink-800" data-testid="room-live">
              {live || "They appear here about a minute behind you. Keep talking."}
            </p>
          </div>
        </div>
      )}

      {phase === "check" && (
        <div className="grid max-w-6xl gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="card min-w-0 p-5 sm:p-6">
            <label htmlFor="room-words" className="label">Every word you said ({words} words). Fix anything that is wrong.</label>
            <textarea id="room-words" ref={boxRef} value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={10}
              className="input resize-y text-sm leading-relaxed" data-testid="room-transcript" />
            {words < 6 && <p className="mt-2 text-sm text-clay-800">There is not enough here to write from. Start again, or type what you saw.</p>}
          </div>

          <div className="min-w-0 space-y-4">
            {missed && (
              <div className="rounded-2xl border border-clay-300 bg-clay-50 p-4" data-testid="room-missed">
                <p className="flex items-start gap-2 text-sm font-bold text-clay-900"><AlertTriangle className="mt-0.5 h-4 w-4 flex-none" /> A piece was lost on the way</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-700">
                  It is marked in the words as [missed about … seconds here]. Type what you said there, or delete the mark if nothing mattered.
                  You cannot go on while a mark is still there.
                </p>
              </div>
            )}

            {checks.suggestions.length > 0 && (
              <div className="card p-4" data-testid="room-name-fixes">
                <p className="text-sm font-bold text-ink-900">Did it hear these names right?</p>
                <ul className="mt-2 space-y-2">
                  {checks.suggestions.map((fix) => (
                    <li key={`${fix.heard}-${fix.suggest}`} className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-700">
                      <span>It wrote <strong>{fix.heard}</strong>{fix.count > 1 ? ` (${fix.count} times)` : ""}.</span>
                      <button type="button" onClick={() => setTranscript((t) => applyNameFix(t, fix.heard, fix.suggest))} className="btn-secondary px-3 py-1.5 text-xs">
                        Change to {fix.suggest}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {unsure.length > 0 && (
              <div className="card p-4" data-testid="room-unsure">
                <p className="text-sm font-bold text-ink-900">Words it was not sure it heard</p>
                <p className="mt-1 text-xs text-ink-500">Tap one to find it in the box.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {unsure.map((word) => (
                    <button key={word} type="button" onClick={() => findWord(word)} className="rounded-full border border-clay-200 bg-paper px-3 py-1.5 text-sm font-semibold text-ink-700 hover:border-clay-400">{word}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="card p-4">
              {nameChips}
              {checks.heard.length > 0 && (
                <p className="mt-3 flex items-start gap-2 text-sm text-sage-900"><Check className="mt-0.5 h-4 w-4 flex-none" /> Named: {checks.heard.map((h) => `${h.name} (${h.count})`).join(", ")}.</p>
              )}
              {names.filter((n) => !checks.heard.some((h) => h.name.toLowerCase() === n.toLowerCase())).length > 0 && (
                <p className="mt-2 text-sm text-clay-800">
                  Not named in the words: {names.filter((n) => !checks.heard.some((h) => h.name.toLowerCase() === n.toLowerCase())).join(", ")}.
                </p>
              )}
              {checks.others.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Other names it heard</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {checks.others.map((other) => (
                      <button key={other.name} type="button" onClick={() => toggle(other.name)} className="rounded-full border border-dashed border-clay-300 px-3 py-1.5 text-sm font-semibold text-ink-700 hover:border-clay-500">+ {other.name}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {names.length > 8 && <p className="text-sm text-clay-800">Up to eight children at a time. Untick some, and do the rest in a second go.</p>}
              <button type="button" onClick={goOn} disabled={missed || words < 6 || names.length > 8} className="btn-primary w-full justify-center py-3.5 text-base disabled:opacity-50" data-testid="room-continue">
                {names.length >= 2 ? "Split it by child" : "Write a story from this"} <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => { setPhase("ready"); setSegments([]); setTranscript(""); setError(""); }} className="btn-ghost justify-center px-3 py-2 text-sm">
                <RotateCcw className="h-3.5 w-3.5" /> Start again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
