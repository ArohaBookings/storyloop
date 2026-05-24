"use client";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Copy, Check, Mic, Square, RefreshCw, AlertCircle, X, ArrowRight, Pencil, Save, Download } from "lucide-react";
import {
  normalizeDepth,
  normalizeFramework,
  normalizeTeReoLevel,
  normalizeTone,
  type StoryDepth,
  type StoryFrameworkId,
  type StoryTone,
  type TeReoLevel,
} from "@/lib/story-options";

const PLACEHOLDERS = [
  "• Ruby (2yo) built a block tower\n• Got frustrated when it fell\n• Tried 4 more times, each bigger\n• Clapped when it stayed up",
  "• Group story time\n• Jax (3) pointed at the pictures\n• Asked 'what's that' 6 times\n• Starting to predict what comes next",
  "• Outdoor play\n• Maya (4) & Sam (4) playing shopkeepers\n• Used pretend money, took turns as cashier\n• Strong language — 'that'll be five dollars please'",
];

const UPGRADE_PROMPT_STORAGE_KEY = `storyloop-upgrade-prompt-${new Date().getFullYear()}-${new Date().getMonth() + 1}`;

export default function GeneratePage() {
  const router = useRouter();
  const [observations, setObservations] = useState("");
  const [childName, setChildName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [tone, setTone] = useState<StoryTone>("natural");
  const [depth, setDepth] = useState<StoryDepth>("balanced");
  const [location, setLocation] = useState<StoryFrameworkId>("AU");
  const [includeTeReoLevel, setIncludeTeReoLevel] = useState<TeReoLevel>("low");
  const [includeKowhitiWhakapae, setIncludeKowhitiWhakapae] = useState(false);
  const [includeTapasa, setIncludeTapasa] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [story, setStory] = useState("");
  const [storyId, setStoryId] = useState("");
  const [storyDraft, setStoryDraft] = useState("");
  const [editingStory, setEditingStory] = useState(false);
  const [savingStory, setSavingStory] = useState(false);
  const [storySaveMessage, setStorySaveMessage] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [curriculumLinks, setCurriculumLinks] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [learningSummary, setLearningSummary] = useState("");
  const [childVoice, setChildVoice] = useState("");
  const [learningDispositions, setLearningDispositions] = useState<string[]>([]);
  const [socialEmotionalLinks, setSocialEmotionalLinks] = useState<string[]>([]);
  const [culturalConnections, setCulturalConnections] = useState<string[]>([]);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [whanauConnection, setWhanauConnection] = useState("");
  const [remaining, setRemaining] = useState<string | number>("");
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [liveRecordingSupported, setLiveRecordingSupported] = useState(false);
  const [suggestUploadFallback, setSuggestUploadFallback] = useState(false);

  useEffect(() => {
    setPlaceholder(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz?.includes("Auckland")) setLocation("NZ");
    if (tz?.startsWith("Australia/")) setLocation("AU");
    if (typeof window !== "undefined") {
      const touchDevice =
        /Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent) ||
        window.navigator.maxTouchPoints > 1 ||
        window.matchMedia?.("(pointer: coarse)").matches;
      setIsTouchDevice(touchDevice);
      setLiveRecordingSupported(canUseLiveRecording());
    }

    void fetch("/api/me")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const preferences = data?.profile?.story_preferences;
        if (preferences?.defaultFramework) {
          setLocation(normalizeFramework(preferences.defaultFramework));
        }
        if (preferences?.preferredTone) {
          setTone(normalizeTone(preferences.preferredTone));
        }
        if (preferences?.depthPreference) {
          setDepth(normalizeDepth(preferences.depthPreference));
        }
        if (preferences?.includeTeReoLevel) {
          setIncludeTeReoLevel(normalizeTeReoLevel(preferences.includeTeReoLevel));
        }
        if (typeof preferences?.includeKowhitiWhakapae === "boolean") {
          setIncludeKowhitiWhakapae(preferences.includeKowhitiWhakapae);
        }
        if (typeof preferences?.includeTapasa === "boolean") {
          setIncludeTapasa(preferences.includeTapasa);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const resetOutput = () => {
    setStory("");
    setStoryId("");
    setStoryDraft("");
    setEditingStory(false);
    setSavingStory(false);
    setStorySaveMessage("");
    setOutcomes([]);
    setCurriculumLinks([]);
    setNextSteps([]);
    setLearningSummary("");
    setChildVoice("");
    setLearningDispositions([]);
    setSocialEmotionalLinks([]);
    setCulturalConnections([]);
    setAssumptions([]);
    setWhanauConnection("");
  };

  const handleGenerate = async () => {
    if (observations.trim().length < 10) {
      setError("Please add more detail (at least 10 characters)");
      return;
    }

    setLoading(true);
    setError("");
    resetOutput();
    setUpgradeRequired(false);
    setShowLimitModal(false);
    setShowUpgradePrompt(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observations,
          childName: childName || undefined,
          ageGroup: ageGroup || undefined,
          tone,
          depth,
          location,
          includeTeReoLevel,
          includeKowhitiWhakapae,
          includeTapasa,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        if (data.upgradeRequired) {
          setUpgradeRequired(true);
          setShowLimitModal(true);
        }
        return;
      }

      setStory(data.story);
      setStoryDraft(data.story);
      setStoryId(typeof data.storyId === "string" ? data.storyId : "");
      setOutcomes(data.outcomes ?? []);
      setCurriculumLinks(data.curriculumLinks ?? []);
      setNextSteps(data.nextSteps ?? []);
      setLearningSummary(data.learningSummary ?? "");
      setChildVoice(data.childVoice ?? "");
      setLearningDispositions(data.learningDispositions ?? []);
      setSocialEmotionalLinks(data.socialEmotionalLinks ?? []);
      setCulturalConnections(data.culturalConnections ?? []);
      setAssumptions(data.assumptions ?? []);
      setWhanauConnection(data.whanauConnection ?? "");
      setRemaining(data.remaining);
      router.refresh();
      const shouldShowUpgradePrompt =
        data.plan === "free" &&
        data.monthlyStoryLimit === 3 &&
        data.remaining === 1 &&
        !data.appliedAccessCode &&
        typeof window !== "undefined" &&
        window.localStorage.getItem(UPGRADE_PROMPT_STORAGE_KEY) !== "dismissed";
      if (shouldShowUpgradePrompt) {
        setShowUpgradePrompt(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const dismissUpgradePrompt = () => {
    setShowUpgradePrompt(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(UPGRADE_PROMPT_STORAGE_KEY, "dismissed");
    }
  };

  const handleSavePreferences = async () => {
    setSavingPreferences(true);
    setPreferencesMessage("");

    try {
      const response = await fetch("/api/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultFramework: location,
          preferredTone: tone,
          depthPreference: depth,
          includeTeReoLevel,
          includeKowhitiWhakapae,
          includeTapasa,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not save settings.");
      }

      setPreferencesMessage("Saved as your default story settings.");
    } catch (preferenceError) {
      setPreferencesMessage(preferenceError instanceof Error ? preferenceError.message : "Could not save settings.");
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(story);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!story || typeof window === "undefined") return;
    const blob = new Blob([story], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const safeName = (childName || "learning-story").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    anchor.href = url;
    anchor.download = `${safeName || "learning-story"}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const startStoryEdit = () => {
    setStoryDraft(story);
    setStorySaveMessage("");
    setEditingStory(true);
  };

  const cancelStoryEdit = () => {
    setStoryDraft(story);
    setEditingStory(false);
    setStorySaveMessage("");
  };

  const handleSaveStory = async () => {
    const nextStory = storyDraft.trim();
    if (nextStory.length < 20) {
      setError("Keep at least 20 characters in the learning story before saving.");
      return;
    }

    setSavingStory(true);
    setError("");
    setStorySaveMessage("");

    try {
      if (!storyId) {
        setStory(nextStory);
        setStoryDraft(nextStory);
        setEditingStory(false);
        setStorySaveMessage("Story updated here. Generate signed-in stories to save edits to history.");
        return;
      }

      const response = await fetch(`/api/stories/${encodeURIComponent(storyId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story: nextStory }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Could not save story edits.");
      }

      const savedStory = data.story ?? nextStory;
      setStory(savedStory);
      setStoryDraft(savedStory);
      setEditingStory(false);
      setStorySaveMessage("Saved to story history.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save story edits.");
    } finally {
      setSavingStory(false);
    }
  };

  const stopMediaStream = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  };

  const canUseLiveRecording = () => {
    if (typeof window === "undefined") return false;
    return window.isSecureContext && !!window.navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
  };

  const getMicrophoneErrorMessage = (error: unknown) => {
    if (error instanceof DOMException) {
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        return "Microphone permission was denied. Allow microphone access for StoryLoop and try Record again, or upload an audio file instead.";
      }
      if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        return "No microphone was found on this device. Check your microphone and try again, or upload an audio file instead.";
      }
      if (error.name === "NotReadableError" || error.name === "TrackStartError") {
        return "Your microphone is busy or unavailable right now. Close other apps using it and try again.";
      }
      if (error.name === "SecurityError") {
        return "Microphone recording needs a secure browser session. Open StoryLoop over HTTPS and try again.";
      }
    }

    if (!canUseLiveRecording()) {
      return "This browser can't record directly here. Try Safari or Chrome on your phone, or upload an audio file instead.";
    }

    return "We couldn't access your microphone. Check browser permissions and try again, or upload an audio file instead.";
  };

  const pickRecordingType = () => {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "";
    return [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
    ].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
  };

  const getAudioExtension = (mimeType: string) => {
    if (mimeType.includes("mp4")) return "m4a";
    if (mimeType.includes("mpeg")) return "mp3";
    return "webm";
  };

  const transcribeAudioFile = async (file: File) => {
    try {
      setTranscribing(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("framework", location);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Voice transcription failed.");
      }

      if (data.text) {
        setObservations((previous) => (previous ? `${previous.trim()}\n${data.text}` : data.text));
      }
    } catch (voiceError) {
      setError(voiceError instanceof Error ? voiceError.message : "Voice transcription failed.");
    } finally {
      setTranscribing(false);
    }
  };

  const handleAudioFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await transcribeAudioFile(file);
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      setError("");
      setSuggestUploadFallback(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      mediaStreamRef.current = stream;
      recordedChunksRef.current = [];

      const preferredType = pickRecordingType();
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setRecording(false);
        setTranscribing(false);
        stopMediaStream();
        setError("We couldn't record that voice note. Please try again.");
      };

      recorder.onstop = async () => {
        setRecording(false);
        stopMediaStream();

        if (recordedChunksRef.current.length === 0) {
          return;
        }

        try {
          const mimeType = recorder.mimeType || recordedChunksRef.current[0]?.type || "audio/webm";
          const blob = new Blob(recordedChunksRef.current, { type: mimeType });
          const file = new File([blob], `storyloop-note.${getAudioExtension(mimeType)}`, { type: mimeType });
          await transcribeAudioFile(file);
        } catch (voiceError) {
          setError(voiceError instanceof Error ? voiceError.message : "Voice transcription failed.");
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
    } catch (recordingError) {
      stopMediaStream();
      setSuggestUploadFallback(true);
      setError(getMicrophoneErrorMessage(recordingError));
    }
  };

  const recordButtonLabel = isTouchDevice ? "Record" : "Live mic";
  const showRecordButton = !recording && liveRecordingSupported;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl">
      <div className="mb-7">
        <h1 className="font-display text-3xl font-bold text-ink-900 mb-1">New learning story</h1>
        <p className="text-ink-600 text-sm">Add your observations below. We&apos;ll shape them into a clear, educator-ready story with practical curriculum links.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Observations</label>
              <div className="flex items-center gap-2">
                {recording && (
                  <button
                    onClick={toggleRecording}
                    disabled={loading || transcribing}
                    className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all bg-red-500 text-white animate-pulse"
                  >
                    <Square className="w-3 h-3" /> Stop
                  </button>
                )}
                {showRecordButton && (
                  <button
                    onClick={toggleRecording}
                    disabled={loading || transcribing}
                    className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all bg-cream-100 text-clay-700 hover:bg-cream-200"
                  >
                    <Mic className="w-3 h-3" /> {recordButtonLabel}
                  </button>
                )}
                <label
                  htmlFor="voice-note-input"
                  className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    loading || transcribing ? "bg-cream-50 text-ink-400 pointer-events-none" : "bg-cream-100 text-clay-700 hover:bg-cream-200"
                  }`}
                >
                  <Mic className="w-3 h-3" /> Upload audio
                </label>
              </div>
            </div>
            <input
              id="voice-note-input"
              type="file"
              accept="audio/*,.m4a,.mp3,.mpeg,.mpga,.wav,.webm"
              className="sr-only"
              onChange={handleAudioFileChange}
            />
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={10}
              placeholder={placeholder}
              className="input font-mono text-sm leading-relaxed resize-none"
            />
            <p className="text-xs text-ink-500 mt-2">
              {observations.length} characters · Aim for at least 3-4 quick points
              {recording ? " · Recording now..." : ""}
              {transcribing ? " · Turning your voice note into text..." : ""}
              {!recording && !transcribing && isTouchDevice && liveRecordingSupported ? " · On phone, Record will ask for microphone access." : ""}
              {!recording && !transcribing && suggestUploadFallback ? " · Upload audio is the fallback if mic access is blocked." : ""}
            </p>
            {!liveRecordingSupported && (
              <p className="mt-2 text-xs text-ink-500 bg-cream-50 border border-clay-100 rounded-lg px-3 py-2">
                Voice recording is not available in this browser session. You can still type bullet points or upload an audio file from Voice Memos/Recorder.
              </p>
            )}
          </div>

          <div className="card p-6 space-y-4">
            <p className="section-title">Personalise (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Child&apos;s name</label>
                <input value={childName} onChange={(e) => setChildName(e.target.value)} className="input" placeholder="Ruby" />
              </div>
              <div>
                <label className="label">Age group</label>
                <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="input">
                  <option value="">Choose...</option>
                  <option>0-12 months</option>
                  <option>1-2 years</option>
                  <option>2-3 years</option>
                  <option>3-4 years</option>
                  <option>4-5 years</option>
                  <option>Mixed group</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Tone</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["natural", "Natural educator"],
                  ["warm", "Warm reflective"],
                  ["professional", "Professional"],
                  ["simple", "Simple"],
                ] as const).map(([option, label]) => (
                  <button
                    key={option}
                    onClick={() => setTone(option)}
                    className={`text-xs font-semibold py-2 rounded-lg border transition-all ${
                      tone === option
                        ? "bg-clay-700 text-paper border-clay-700"
                        : "bg-white text-ink-600 border-clay-200 hover:border-clay-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Story depth</label>
              <div className="grid grid-cols-3 gap-2">
                {(["concise", "balanced", "detailed"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setDepth(option)}
                    className={`text-xs font-semibold py-2 rounded-lg border capitalize transition-all ${
                      depth === option
                        ? "bg-clay-700 text-paper border-clay-700"
                        : "bg-white text-ink-600 border-clay-200 hover:border-clay-400"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Framework</label>
              <div className="grid grid-cols-2 gap-2">
                {(["AU", "NZ"] as const).map((framework) => (
                  <button
                    key={framework}
                    onClick={() => setLocation(framework)}
                    className={`text-xs font-semibold py-2 rounded-lg border transition-all ${
                      location === framework
                        ? "bg-clay-700 text-paper border-clay-700"
                        : "bg-white text-ink-600 border-clay-200 hover:border-clay-400"
                    }`}
                  >
                    {framework === "AU" ? "🇦🇺 EYLF" : "🇳🇿 Te Whāriki"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Te reo Māori</label>
              <div className="grid grid-cols-3 gap-2">
                {(["low", "medium", "high"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setIncludeTeReoLevel(option)}
                    className={`text-xs font-semibold py-2 rounded-lg border capitalize transition-all ${
                      includeTeReoLevel === option
                        ? "bg-clay-700 text-paper border-clay-700"
                        : "bg-white text-ink-600 border-clay-200 hover:border-clay-400"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-ink-500 mt-1">Applies mainly to NZ stories. StoryLoop keeps it natural, not random.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <label className="flex items-start gap-2 rounded-xl border border-clay-200 bg-white p-3 text-xs text-ink-700">
                <input
                  type="checkbox"
                  checked={includeKowhitiWhakapae}
                  onChange={(event) => setIncludeKowhitiWhakapae(event.target.checked)}
                  className="mt-0.5 accent-clay-700"
                />
                <span>
                  <span className="font-bold block text-ink-900">Kōwhiti Whakapae links</span>
                  Add only when social/emotional, language, or maths noticing is relevant.
                </span>
              </label>
              <label className="flex items-start gap-2 rounded-xl border border-clay-200 bg-white p-3 text-xs text-ink-700">
                <input
                  type="checkbox"
                  checked={includeTapasa}
                  onChange={(event) => setIncludeTapasa(event.target.checked)}
                  className="mt-0.5 accent-clay-700"
                />
                <span>
                  <span className="font-bold block text-ink-900">Tapasā lens</span>
                  Use only when Pacific identity, whānau, language, or culture is actually present.
                </span>
              </label>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-clay-100 pt-3">
              <p className="text-xs text-ink-500">These settings apply to this story. Save them if this is your usual style.</p>
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                className="btn-secondary px-4 py-2 text-xs disabled:opacity-50"
              >
                {savingPreferences ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save defaults
              </button>
            </div>
            {preferencesMessage && <p className="text-xs text-clay-700">{preferencesMessage}</p>}
          </div>

          <button onClick={handleGenerate} disabled={loading || transcribing || observations.length < 10} className="btn-primary w-full py-4 text-base">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Writing your story...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate story
              </>
            )}
          </button>

          {showUpgradePrompt && (
            <div className="rounded-2xl border border-clay-200 bg-cream-50 p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1">1 free story left this month</p>
                  <p className="text-sm text-ink-700">
                    Upgrade when you&apos;re ready to keep drafting without limits and keep your learning story backlog under control.
                  </p>
                  <Link href="/billing" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-clay-700 hover:text-clay-900">
                    Upgrade for unlimited stories <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <button
                  onClick={dismissUpgradePrompt}
                  className="w-7 h-7 rounded-lg border border-clay-200 bg-white flex items-center justify-center text-ink-500 hover:text-ink-900"
                  aria-label="Dismiss upgrade reminder"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
                {upgradeRequired && (
                  <Link href="/billing" className="font-bold underline mt-1 inline-block">
                    Upgrade now →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="card-warm p-6 min-h-[420px] md:min-h-[500px] flex flex-col md:sticky md:top-4">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">Your learning story</p>
            {story && (
              <div className="flex items-center gap-2">
                <button onClick={handleGenerate} className="btn-ghost text-xs">
                  <RefreshCw className="w-3 h-3" /> Regenerate
                </button>
                <button onClick={startStoryEdit} disabled={editingStory || savingStory} className="btn-ghost text-xs disabled:opacity-50">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={handleCopy} className="btn-ghost text-xs">
                  {copied ? <Check className="w-3 h-3 text-sage-600" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button onClick={handleDownload} className="btn-ghost text-xs">
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 animate-spin text-clay-500 mb-4" />
              <p className="font-display text-lg font-bold text-ink-900 mb-1">Crafting your story...</p>
              <p className="text-sm text-ink-500">Usually takes 5-10 seconds</p>
            </div>
          ) : story ? (
            <div className="flex-1 flex flex-col">
              {editingStory ? (
                <div className="flex-1 flex flex-col gap-3">
                  <textarea
                    value={storyDraft}
                    onChange={(event) => setStoryDraft(event.target.value)}
                    className="input min-h-[320px] flex-1 resize-y leading-relaxed font-display text-base"
                    aria-label="Edit generated learning story"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs text-ink-500">
                      Adjust wording, add teacher voice, then save. Your history copy updates too.
                    </p>
                    <div className="flex items-center gap-2">
                      <button onClick={cancelStoryEdit} disabled={savingStory} className="btn-secondary px-4 py-2 text-xs">
                        Cancel
                      </button>
                      <button onClick={handleSaveStory} disabled={savingStory || storyDraft.trim().length < 20} className="btn-primary px-4 py-2 text-xs disabled:opacity-50">
                        {savingStory ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Save story
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 text-ink-800 whitespace-pre-wrap leading-relaxed font-display font-normal">
                  {story}
                </div>
              )}
              {storySaveMessage && !editingStory && (
                <p className="mt-3 text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-100 rounded-lg px-3 py-2">
                  {storySaveMessage}
                </p>
              )}

              {(learningSummary ||
                outcomes.length > 0 ||
                curriculumLinks.length > 0 ||
                childVoice ||
                learningDispositions.length > 0 ||
                socialEmotionalLinks.length > 0 ||
                culturalConnections.length > 0 ||
                assumptions.length > 0 ||
                nextSteps.length > 0 ||
                whanauConnection ||
                remaining !== "") && (
                <div className="mt-5 pt-5 border-t border-clay-200 space-y-4">
                  {learningSummary && (
                    <div>
                      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">What this learning shows</p>
                      <p className="text-sm text-ink-700">{learningSummary}</p>
                    </div>
                  )}

                  {outcomes.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Linked outcomes</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {outcomes.map((outcome) => (
                          <span key={outcome} className="text-xs font-mono bg-white border border-clay-200 text-clay-700 px-2 py-1 rounded-md">
                            {outcome}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {curriculumLinks.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Curriculum link</p>
                      <ul className="space-y-1 text-sm text-ink-700">
                        {curriculumLinks.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {childVoice && (
                    <div>
                      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Child&apos;s voice</p>
                      <p className="text-sm text-ink-700">{childVoice}</p>
                    </div>
                  )}

                  {learningDispositions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Learning dispositions</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {learningDispositions.map((item) => (
                          <span key={item} className="text-xs font-mono bg-cream-50 border border-clay-200 text-clay-700 px-2 py-1 rounded-md">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {socialEmotionalLinks.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Social and emotional learning</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {socialEmotionalLinks.map((item) => (
                          <span key={item} className="text-xs font-mono bg-sage-50 border border-sage-100 text-sage-700 px-2 py-1 rounded-md">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {culturalConnections.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Cultural and language links</p>
                      <ul className="space-y-1 text-sm text-ink-700">
                        {culturalConnections.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {nextSteps.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Possible next steps</p>
                      <ul className="space-y-1 text-sm text-ink-700">
                        {nextSteps.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {assumptions.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Assumptions or gaps</p>
                      <ul className="space-y-1 text-sm text-ink-700">
                        {assumptions.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {whanauConnection && (
                    <div>
                      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Family or whanau link</p>
                      <p className="text-sm text-ink-700">{whanauConnection}</p>
                    </div>
                  )}

                  {remaining !== "" && (
                    <p className="text-xs text-ink-500">
                      {typeof remaining === "string" ? remaining : `${remaining} stories remaining this month`}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center px-4">
              <div>
                <Sparkles className="w-10 h-10 text-clay-300 mx-auto mb-3" />
                <p className="font-display text-lg font-bold text-ink-900">Ready when you are</p>
                <p className="text-sm text-ink-500 mt-1">Add observations and hit generate.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 px-4 py-6">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-clay-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-2">Free story limit reached</p>
                <h2 className="font-display text-2xl font-bold text-ink-900 leading-tight">You&apos;ve used your 3 free stories this month.</h2>
              </div>
              <button
                onClick={() => setShowLimitModal(false)}
                className="w-8 h-8 flex-shrink-0 rounded-lg border border-clay-200 flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-cream-50"
                aria-label="Close limit message"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-ink-600 mt-3">
              Upgrade to keep creating learning stories now, or come back next month. Your existing stories and history stay available either way.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Link
                href="/billing"
                onClick={() => setShowLimitModal(false)}
                className="btn-primary justify-center py-3 text-sm"
              >
                Upgrade for unlimited stories <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setShowLimitModal(false)}
                className="btn-secondary justify-center py-3 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
