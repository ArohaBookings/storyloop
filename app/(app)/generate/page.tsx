"use client";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Mic,
  Square,
  RefreshCw,
  AlertCircle,
  X,
  ArrowRight,
  Pencil,
  Save,
  Download,
  ClipboardList,
  Wand2,
  Users,
  MessageCircleHeart,
  LockKeyhole,
} from "lucide-react";
import ObservationCoach from "@/components/app/ObservationCoach";
import StoryIntelligence from "@/components/app/StoryIntelligence";
import QuillAssistant from "@/components/app/QuillAssistant";
import ExportPackPanel from "@/components/app/ExportPackPanel";
import FamilyTranslationPanel from "@/components/app/FamilyTranslationPanel";
import type { ChildProfile } from "@/lib/children";
import { hasFeatureAccess, normalizePlanKey, type PlanKey } from "@/lib/plans";
import {
  normalizeDepth,
  normalizeFramework,
  normalizePedagogyFocus,
  normalizeTeReoLevel,
  normalizeTone,
  type PedagogyFocus,
  type StoryDepth,
  type StoryFrameworkId,
  type StoryTone,
  type TeReoLevel,
} from "@/lib/story-options";
import type { PrivacyGuardianResult } from "@/lib/privacy-guardian";

const PLACEHOLDERS = [
  "Example only - replace this with your real notes:\nRuby (2yo) built a block tower. It fell twice, then she tried again with a wider base and clapped when it stayed up.",
  "Example only - replace this with your real notes:\nDuring group story time, Jax pointed to the pictures, asked \"what's that?\" several times, and began predicting what might happen next.",
  "Example only - replace this with your real notes:\nMaya and Sam played shopkeepers outside. Maya used pretend money, took turns as cashier, and said, \"That will be five dollars please.\"",
];

const SAMPLE_OBSERVATION =
  "Today Lily spent time building a tower with wooden blocks. It fell twice, and she paused each time before trying again. She asked another child to hold the base steady, then smiled and said, \"It stayed!\" when the tower stood up.";

// Shown while the story is being written. The frontier writer takes a little
// longer than a quick autocomplete — these steps reassure the educator that
// real, careful work is happening rather than leaving them on a bare spinner.
const GENERATION_STEPS = [
  "Reading your observation closely…",
  "Noticing the learning that matters most…",
  "Matching it to the right curriculum links…",
  "Writing it in a polished educator voice…",
  "Adding practical, in-the-room next steps…",
];

type InputMethod = "typed" | "paste" | "voice" | "sample" | "backlog";

type BacklogItem = {
  id: string;
  observation: string;
  recommendation: "full_story" | "short_update" | "combine" | "skip";
  priority: "high" | "medium" | "low";
  reason: string;
  suggestedTitle: string;
  storySeed: string;
  frameworkHint: string;
};

type BacklogResult = {
  summary: string;
  items: BacklogItem[];
  nextBestAction: string;
  upgradeNudge?: boolean;
};

type FamilyPack = {
  familyMessage: string;
  familyQuestion: string;
  homeConnection: string;
  photoCaption: string;
  handoverNote: string;
  teacherCheck: string;
};

const UPGRADE_PROMPT_STORAGE_KEY = `storyloop-upgrade-prompt-${new Date().getFullYear()}-${new Date().getMonth() + 1}`;

export default function GeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [observations, setObservations] = useState("");
  const [inputMethod, setInputMethod] = useState<InputMethod>("typed");
  const [showFirstStoryWizard, setShowFirstStoryWizard] = useState(false);
  const [showCentreVoice, setShowCentreVoice] = useState(false);
  const [accountPlan, setAccountPlan] = useState<PlanKey>("free");
  const [centrePhilosophy, setCentrePhilosophy] = useState("");
  const [likedPhrases, setLikedPhrases] = useState("");
  const [avoidedPhrases, setAvoidedPhrases] = useState("");
  const [mode, setMode] = useState<"story" | "backlog">("story");
  const [backlogLoading, setBacklogLoading] = useState(false);
  const [backlogResult, setBacklogResult] = useState<BacklogResult | null>(null);
  const [showBacklogUpgradeNudge, setShowBacklogUpgradeNudge] = useState(false);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [childName, setChildName] = useState("");
  const [educatorNames, setEducatorNames] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [tone, setTone] = useState<StoryTone>("natural");
  const [depth, setDepth] = useState<StoryDepth>("balanced");
  const [location, setLocation] = useState<StoryFrameworkId>("AU");
  const [includeTeReoLevel, setIncludeTeReoLevel] = useState<TeReoLevel>("low");
  const [includeKowhitiWhakapae, setIncludeKowhitiWhakapae] = useState(false);
  const [includeTapasa, setIncludeTapasa] = useState(false);
  const [pedagogyFocus, setPedagogyFocus] = useState<PedagogyFocus>("balanced");
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [story, setStory] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
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
  const [evidenceAnchors, setEvidenceAnchors] = useState<string[]>([]);
  const [educatorChecks, setEducatorChecks] = useState<string[]>([]);
  const [pedagogyLinks, setPedagogyLinks] = useState<string[]>([]);
  const [frameworkEvidence, setFrameworkEvidence] = useState<string[]>([]);
  const [storyQuality, setStoryQuality] = useState<{
    score?: number;
    passes?: boolean;
    revisionCount?: number;
    issues?: string[];
    strengths?: string[];
  } | null>(null);
  const [privacyGuardian, setPrivacyGuardian] = useState<PrivacyGuardianResult | null>(null);
  const [parentFriendlyVersion, setParentFriendlyVersion] = useState("");
  const [parentVersionLoading, setParentVersionLoading] = useState(false);
  const [familyPack, setFamilyPack] = useState<FamilyPack | null>(null);
  const [familyPackLoading, setFamilyPackLoading] = useState(false);
  const [familyQuestion, setFamilyQuestion] = useState("");
  const [followUpPrompt, setFollowUpPrompt] = useState("");
  const [sourceStoryId, setSourceStoryId] = useState("");
  const [remaining, setRemaining] = useState<string | number>("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState("");
  const [clarification, setClarification] = useState<{
    kind?: string;
    reason: string;
    questions: string[];
  } | null>(null);
  const [clarificationAnswers, setClarificationAnswers] = useState<string[]>([]);
  const [clarificationStep, setClarificationStep] = useState(0);
  const [transcriptionMessage, setTranscriptionMessage] = useState("");
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [billingRequired, setBillingRequired] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradePromptKind, setUpgradePromptKind] = useState<"first_story" | "one_left">("one_left");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const storyPanelRef = useRef<HTMLDivElement | null>(null);
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

    void Promise.all([
      fetch("/api/me").then((response) => response.ok ? response.json() : null),
      fetch("/api/children").then((response) => response.ok ? response.json() : null),
    ])
      .then(([accountData, childData]) => {
        const preferences = accountData?.profile?.story_preferences;
        setAccountPlan(normalizePlanKey(accountData?.profile?.plan));
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
        if (preferences?.pedagogyFocus) {
          setPedagogyFocus(normalizePedagogyFocus(preferences.pedagogyFocus));
        }
        if (typeof preferences?.centrePhilosophy === "string") {
          setCentrePhilosophy(preferences.centrePhilosophy);
          setShowCentreVoice(Boolean(preferences.centrePhilosophy));
        }
        if (Array.isArray(preferences?.likedPhrases)) {
          setLikedPhrases(preferences.likedPhrases.join(", "));
        }
        if (Array.isArray(preferences?.avoidedPhrases)) {
          setAvoidedPhrases(preferences.avoidedPhrases.join(", "));
        }
        if ((accountData?.profile?.total_stories ?? 0) === 0 && typeof window !== "undefined") {
          // Arriving straight from signup (?welcome=1) always gets the guided
          // first-story wizard, even if it was dismissed in a past session.
          const justSignedUp = searchParams.get("welcome") === "1";
          setShowFirstStoryWizard(justSignedUp || window.sessionStorage.getItem("storyloop-first-story-wizard") !== "dismissed");
        }
        const loadedChildren = Array.isArray(childData?.children) ? childData.children : [];
        setChildren(loadedChildren);
        const requestedChild = searchParams.get("child");
        const selected = loadedChildren.find((child: ChildProfile) => child.id === requestedChild);
        if (selected) {
          setSelectedChildId(selected.id);
          setChildName(selected.name);
          setAgeGroup(selected.age_group ?? "");
        }
      })
      .catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    const fromStory = searchParams.get("from");
    if (!fromStory || fromStory === sourceStoryId) return;

    void fetch(`/api/stories/${encodeURIComponent(fromStory)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load the earlier story.");
        return data.story;
      })
      .then((source) => {
        const metadata =
          source?.metadata && typeof source.metadata === "object"
            ? (source.metadata as Record<string, unknown>)
            : {};
        const prompt =
          typeof metadata.followUpPrompt === "string" && metadata.followUpPrompt.trim()
            ? metadata.followUpPrompt.trim()
            : "What happened when this learning was revisited?";
        const nextSteps = Array.isArray(source?.next_steps)
          ? source.next_steps.filter((item: unknown): item is string => typeof item === "string").slice(0, 2)
          : [];

        setChildName(source?.child_name ?? "");
        setAgeGroup(source?.age_group ?? "");
        setSelectedChildId(source?.child_id ?? "");
        setObservations(
          [
            `Follow-up to the earlier story for ${source?.child_name || "this child"}.`,
            `Notice next: ${prompt}`,
            nextSteps.length ? `Earlier response ideas: ${nextSteps.join(" / ")}` : "",
            "",
            "What happened this time:",
          ]
            .filter(Boolean)
            .join("\n")
        );
        setSourceStoryId(fromStory);
      })
      .catch((followUpError) => {
        setError(followUpError instanceof Error ? followUpError.message : "Could not load the earlier story.");
      });
  }, [searchParams, sourceStoryId]);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStep((step) => (step + 1) % GENERATION_STEPS.length);
    }, 3200);
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    if (location !== "NZ") {
      setIncludeTeReoLevel("low");
      setIncludeKowhitiWhakapae(false);
    }
  }, [location]);

  const chooseFramework = (framework: StoryFrameworkId) => {
    setLocation(framework);
    if (framework !== "NZ") {
      setIncludeTeReoLevel("low");
      setIncludeKowhitiWhakapae(false);
    }
  };

  const resetOutput = () => {
    setStory("");
    setStoryTitle("");
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
    setEvidenceAnchors([]);
    setEducatorChecks([]);
    setPedagogyLinks([]);
    setFrameworkEvidence([]);
    setStoryQuality(null);
    setPrivacyGuardian(null);
    setParentFriendlyVersion("");
    setParentVersionLoading(false);
    setFamilyPack(null);
    setFamilyPackLoading(false);
    setFamilyQuestion("");
    setFollowUpPrompt("");
  };

  const resetClarification = () => {
    setClarification(null);
    setClarificationAnswers([]);
    setClarificationStep(0);
  };

  const updateClarificationAnswer = (index: number, value: string) => {
    setClarificationAnswers((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const normalizeClarificationAnswers = (answers: string[]) =>
    answers
      .map((answer) => answer.trim())
      .filter(Boolean)
      .slice(0, 3);

  const parseEducatorNames = (value: string) =>
    Array.from(
      new Set(
        value
          .split(",")
          .map((item) => item.trim().replace(/\s+/g, " "))
          .filter((item) => item.length > 1)
          .slice(0, 4)
      )
    );

  const handleGenerate = async (clarificationAnswersOverride: string[] = []) => {
    if (observations.trim().length < 10) {
      setError("Please add more detail (at least 10 characters)");
      return;
    }

    const submittedClarificationAnswers = normalizeClarificationAnswers(clarificationAnswersOverride);

    setLoading(true);
    setError("");
    resetClarification();
    resetOutput();
    setUpgradeRequired(false);
    setBillingRequired(false);
    setShowLimitModal(false);
    setShowUpgradePrompt(false);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observations,
          childId: selectedChildId || undefined,
          childName: childName || undefined,
          ageGroup: ageGroup || undefined,
          tone,
          depth,
          location,
          includeTeReoLevel: location === "NZ" ? includeTeReoLevel : "low",
          includeKowhitiWhakapae: location === "NZ" ? includeKowhitiWhakapae : false,
          includeTapasa,
          pedagogyFocus,
          sourceStoryId: sourceStoryId || undefined,
          inputMethod,
          educatorNames: parseEducatorNames(educatorNames),
          clarificationAnswers: submittedClarificationAnswers,
        }),
      });
      const data = await res.json();
      if (data.needsClarification) {
        const questions = Array.isArray(data.clarificationQuestions)
          ? data.clarificationQuestions.filter((question: unknown): question is string => typeof question === "string" && question.trim().length > 0).slice(0, 3)
          : [];

        setClarification({
          kind: data.clarificationKind,
          reason: data.clarificationReason ?? "A little more context is needed before this becomes a learning story.",
          questions,
        });
        setClarificationAnswers(questions.map(() => ""));
        setClarificationStep(0);
        setRemaining(data.remaining ?? "");
        setAccountPlan(normalizePlanKey(data.plan));
        setTimeout(() => storyPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Failed");
        if (data.billingRequired) {
          setBillingRequired(true);
        }
        if (data.upgradeRequired) {
          setUpgradeRequired(true);
          setShowLimitModal(true);
        }
        return;
      }

      setStory(data.story);
      setStoryTitle(data.storyTitle ?? "");
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
      setEvidenceAnchors(data.evidenceAnchors ?? []);
      setEducatorChecks(data.educatorChecks ?? []);
      setPedagogyLinks(data.pedagogyLinks ?? []);
      setFrameworkEvidence(data.frameworkEvidence ?? []);
      setStoryQuality(data.storyQuality ?? null);
      setPrivacyGuardian(data.privacyGuardian ?? null);
      setFamilyQuestion(data.familyQuestion ?? "");
      setFollowUpPrompt(data.followUpPrompt ?? "");
      setAccountPlan(normalizePlanKey(data.plan));
      setRemaining(data.remaining);
      if (sourceStoryId) {
        void fetch(`/api/stories/${encodeURIComponent(sourceStoryId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followUpStatus: "revisited" }),
        });
      }
      router.refresh();
      const showFirstStoryUpgradePrompt =
        data.plan === "free" &&
        data.monthlyStoryLimit === 3 &&
        data.storiesUsedThisMonth === 1 &&
        !data.appliedAccessCode &&
        typeof window !== "undefined" &&
        window.localStorage.getItem(UPGRADE_PROMPT_STORAGE_KEY) !== "dismissed";
      const shouldShowUpgradePrompt =
        data.plan === "free" &&
        data.monthlyStoryLimit === 3 &&
        data.remaining === 1 &&
        !data.appliedAccessCode &&
        typeof window !== "undefined" &&
        window.localStorage.getItem(UPGRADE_PROMPT_STORAGE_KEY) !== "dismissed";
      if (shouldShowUpgradePrompt || showFirstStoryUpgradePrompt) {
        setUpgradePromptKind(shouldShowUpgradePrompt ? "one_left" : "first_story");
        setShowUpgradePrompt(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClarificationContinue = async () => {
    if (!clarification) return;

    const answers = clarification.questions.map((_, index) => (clarificationAnswers[index] ?? "").trim());
    const currentAnswer = answers[clarificationStep] ?? "";

    if (!currentAnswer) {
      setError("Answer this question before continuing.");
      return;
    }

    setError("");

    if (clarificationStep < clarification.questions.length - 1) {
      setClarificationStep((step) => step + 1);
      return;
    }

    if (answers.some((answer) => !answer)) {
      const firstMissingIndex = answers.findIndex((answer) => !answer);
      setClarificationStep(Math.max(firstMissingIndex, 0));
      setError("Answer each clarification question before generating.");
      return;
    }

    await handleGenerate(answers);
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
          includeTeReoLevel: location === "NZ" ? includeTeReoLevel : "low",
          includeKowhitiWhakapae: location === "NZ" ? includeKowhitiWhakapae : false,
          includeTapasa,
          pedagogyFocus,
          centrePhilosophy,
          likedPhrases: parsePhraseList(likedPhrases),
          avoidedPhrases: parsePhraseList(avoidedPhrases),
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

  const handleQuillApply = async (newStory: string) => {
    setStory(newStory);
    setStoryDraft(newStory);
    setStorySaveMessage("");
    if (storyId) {
      try {
        await fetch(`/api/stories/${encodeURIComponent(storyId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ story: newStory }),
        });
        router.refresh();
      } catch {
        // Keep the change locally even if the background save hiccups.
      }
    }
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

  const dismissFirstStoryWizard = () => {
    setShowFirstStoryWizard(false);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("storyloop-first-story-wizard", "dismissed");
    }
  };

  const useSampleObservation = () => {
    setMode("story");
    resetClarification();
    setObservations(SAMPLE_OBSERVATION);
    setInputMethod("sample");
    dismissFirstStoryWizard();
  };

  const parsePhraseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10);

  const handleBacklogRescue = async () => {
    if (observations.trim().length < 40) {
      setError("Paste a few observations from the week so Backlog Rescue has enough to sort.");
      return;
    }

    setBacklogLoading(true);
    setError("");
    setBacklogResult(null);
    setShowBacklogUpgradeNudge(false);

    try {
      const response = await fetch("/api/backlog-rescue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ observations, framework: location }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.upgradeRequired) {
          setUpgradeRequired(true);
          setShowBacklogUpgradeNudge(true);
        }
        throw new Error(data.error ?? "Could not analyse backlog.");
      }
      setBacklogResult(data);
      setShowBacklogUpgradeNudge(Boolean(data.upgradeNudge));
      setInputMethod("backlog");
    } catch (backlogError) {
      setError(backlogError instanceof Error ? backlogError.message : "Could not analyse backlog.");
    } finally {
      setBacklogLoading(false);
    }
  };

  const selectBacklogItem = (item: BacklogItem) => {
    setMode("story");
    resetClarification();
    setObservations(item.storySeed || item.observation);
    setInputMethod("backlog");
    setBacklogResult(null);
    setShowBacklogUpgradeNudge(false);
  };

  const handleParentFriendlyVersion = async () => {
    if (!storyId) {
      setError("Save this signed-in story first, then create a parent-friendly version.");
      return;
    }

    setParentVersionLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/stories/${encodeURIComponent(storyId)}/parent-version`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create parent-friendly version.");
      setParentFriendlyVersion(data.parentVersion ?? "");
    } catch (parentError) {
      setError(parentError instanceof Error ? parentError.message : "Could not create parent-friendly version.");
    } finally {
      setParentVersionLoading(false);
    }
  };

  const handleFamilyConnectionPack = async () => {
    if (!storyId) {
      setError("Save this signed-in story first, then create a family connection pack.");
      return;
    }

    if (!hasFeatureAccess(accountPlan, "familyConnectionPack")) {
      setError("Family Connection Pack is available on Educator and Centre plans.");
      setUpgradeRequired(true);
      return;
    }

    setFamilyPackLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/stories/${encodeURIComponent(storyId)}/family-pack`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.upgradeRequired) setUpgradeRequired(true);
        throw new Error(data.error ?? "Could not create family connection pack.");
      }
      setFamilyPack(data.familyPack ?? null);
    } catch (familyError) {
      setError(familyError instanceof Error ? familyError.message : "Could not create family connection pack.");
    } finally {
      setFamilyPackLoading(false);
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
      setTranscriptionMessage("");
      setBillingRequired(false);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("framework", location);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        if (data.billingRequired) {
          setBillingRequired(true);
        }
        throw new Error(data.error ?? "Voice transcription failed.");
      }

      if (data.text) {
        resetClarification();
        setObservations((previous) => (previous ? `${previous.trim()}\n${data.text}` : data.text));
        setInputMethod("voice");
        setTranscriptionMessage("Voice note added to observations. Review the text, then generate the story.");
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
      setTranscriptionMessage("");
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

  const recordButtonLabel = isTouchDevice ? "Record" : "Record voice note";
  const showRecordButton = !recording && liveRecordingSupported;
  const clarificationQuestionCount = clarification?.questions.length ?? 0;
  const boundedClarificationStep = Math.min(clarificationStep, Math.max(clarificationQuestionCount - 1, 0));
  const currentClarificationQuestion = clarification?.questions[boundedClarificationStep] ?? "";
  const currentClarificationAnswer = clarificationAnswers[boundedClarificationStep] ?? "";
  const isFinalClarificationQuestion = boundedClarificationStep >= clarificationQuestionCount - 1;

  return (
    <div className="w-full max-w-none p-4 sm:p-6 md:p-8">
      <div className="mb-7">
        <h1 className="font-display text-3xl font-bold text-ink-900 mb-1">New learning story</h1>
        <p className="text-ink-600 text-sm">Add your observations below. We&apos;ll shape them into a clear, educator-ready story with practical curriculum links.</p>
      </div>

      {showFirstStoryWizard && (
        <div className="mb-6 rounded-3xl border border-clay-200 bg-gradient-to-br from-cream-100 via-white to-sage-50 p-5 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-clay-700 text-paper">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <p className="section-title mb-1">First story wizard</p>
                <h2 className="font-display text-2xl font-bold text-ink-900">Create your first learning story in under 2 minutes.</h2>
                <p className="mt-1 text-sm text-ink-600">
                  Paste a real observation, type bullet points, record a voice note, or use the sample to see the output instantly.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setMode("story"); dismissFirstStoryWizard(); }} className="btn-secondary text-xs">
                Paste observation
              </button>
              <button onClick={() => { setMode("story"); setInputMethod("typed"); dismissFirstStoryWizard(); }} className="btn-secondary text-xs">
                Type bullet points
              </button>
              <button onClick={() => { setMode("story"); setInputMethod("voice"); dismissFirstStoryWizard(); }} className="btn-secondary text-xs">
                Record voice note
              </button>
              <button onClick={useSampleObservation} className="btn-primary text-xs">
                Use sample observation
              </button>
              <button onClick={dismissFirstStoryWizard} className="btn-ghost text-xs">
                Hide
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="inline-flex w-full rounded-2xl border border-clay-200 bg-white p-1 shadow-soft md:w-fit">
          {([
            ["story", "Single story", Sparkles],
            ["backlog", "Backlog Rescue", ClipboardList],
          ] as const).map(([option, label, Icon]) => (
            <button
              key={option}
              onClick={() => {
                setMode(option);
                if (option === "backlog") {
                  setShowBacklogUpgradeNudge(true);
                }
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all md:flex-none ${
                mode === option ? "bg-clay-700 text-paper shadow-warm" : "text-ink-600 hover:bg-cream-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        {mode === "backlog" && (
          <p className="text-xs text-ink-500">
            Paste several rough observations. StoryLoop will sort full stories from quick updates first.
          </p>
        )}
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <div className="card p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                <label className="label mb-0">Observations</label>
              <div className="flex flex-wrap items-center gap-2">
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
                  <Mic className="w-3 h-3" /> Upload audio file
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
              onChange={(e) => {
                setObservations(e.target.value);
                if (clarification) resetClarification();
                if (inputMethod !== "voice" && inputMethod !== "sample" && inputMethod !== "backlog") {
                  setInputMethod("typed");
                }
              }}
              onPaste={() => setInputMethod("paste")}
              rows={10}
              placeholder={placeholder}
              className="input font-mono text-sm leading-relaxed resize-none"
            />
            <p className="text-xs text-ink-500 mt-2">
              {observations.length} characters · Aim for at least 3-4 quick points
              {recording ? " · Recording now..." : ""}
              {transcribing ? " · Turning your voice note into text and adding it here..." : ""}
              {!recording && !transcribing && isTouchDevice && liveRecordingSupported ? " · On phone, Record will ask for microphone access." : ""}
              {!recording && !transcribing && suggestUploadFallback ? " · Upload audio is the fallback if mic access is blocked." : ""}
            </p>
            {liveRecordingSupported && (
              <p className="mt-2 text-xs text-ink-500 bg-cream-50 border border-clay-100 rounded-lg px-3 py-2">
                Press Record, talk through the observation, then press Stop. StoryLoop will add the transcript into this box automatically.
              </p>
            )}
            {transcriptionMessage && (
              <p className="mt-2 text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-100 rounded-lg px-3 py-2">
                {transcriptionMessage}
              </p>
            )}
            {!liveRecordingSupported && (
              <p className="mt-2 text-xs text-ink-500 bg-cream-50 border border-clay-100 rounded-lg px-3 py-2">
                Voice recording is not available in this browser session. You can still type bullet points or upload an audio file from Voice Memos/Recorder.
              </p>
            )}
            <ObservationCoach observation={observations} plan={accountPlan} framework={location} />
          </div>

          <div className="card p-6 space-y-4">
            <p className="section-title">Personalise (optional)</p>
            <div>
              <div className="flex items-center justify-between gap-3">
                <label className="label">Learning profile</label>
                <Link href="/children" className="text-[11px] font-bold text-clay-700 hover:text-clay-900">
                  Manage profiles
                </Link>
              </div>
              <select
                value={selectedChildId}
                onChange={(event) => {
                  const childId = event.target.value;
                  setSelectedChildId(childId);
                  const selected = children.find((child) => child.id === childId);
                  if (selected) {
                    setChildName(selected.name);
                    setAgeGroup(selected.age_group ?? "");
                  }
                }}
                className="input"
              >
                <option value="">No saved profile</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}{child.age_group ? ` · ${child.age_group}` : ""}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-ink-500">
                A saved profile carries interests and {location === "NZ" ? "whānau" : "family"} aspirations into the drafting context without treating them as evidence from today.
              </p>
              {selectedChildId && !hasFeatureAccess(accountPlan, "childContinuityProfiles") && (
                <p className="mt-2 rounded-xl border border-clay-100 bg-cream-50 px-3 py-2 text-[11px] leading-relaxed text-ink-600">
                  This story will still use the child&apos;s name and age. Educator Pro carries interests, family context, home languages, and recent learning into future stories.
                  <Link href="/billing?feature=child-continuity" className="ml-1 font-bold text-clay-700 hover:text-clay-900">Compare Pro</Link>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Child&apos;s name</label>
                <input
                  value={childName}
                  onChange={(event) => {
                    setChildName(event.target.value);
                    if (selectedChildId) setSelectedChildId("");
                  }}
                  className="input"
                  placeholder="Optional - e.g. Ruby"
                />
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
              <label className="label">Educator or staff names (optional)</label>
              <input
                value={educatorNames}
                onChange={(event) => setEducatorNames(event.target.value)}
                className="input"
                placeholder="Optional - e.g. Sarah, Moana"
              />
              <p className="mt-1 text-[11px] text-ink-500">
                Add one or more names if you want the story to say “Sarah noticed...” instead of only “we noticed...”.
              </p>
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
                    onClick={() => chooseFramework(framework)}
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
              <label className="label">Pedagogy focus</label>
              <select
                value={pedagogyFocus}
                onChange={(event) => setPedagogyFocus(normalizePedagogyFocus(event.target.value))}
                className="input"
              >
                <option value="balanced">Balanced story</option>
                <option value="intentional_teaching">Intentional teaching response</option>
                <option value="child_voice">Child voice and agency</option>
                <option value="family_partnership">Family partnership</option>
                <option value="working_theories">Working theories and inquiry</option>
              </select>
              <p className="mt-1 text-[11px] text-ink-500">
                Shapes the reflection lens without forcing unsupported curriculum claims.
              </p>
            </div>
            <div className="rounded-2xl border border-clay-100 bg-cream-50 p-4">
              <button
                type="button"
                onClick={() => setShowCentreVoice((value) => !value)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <span>
                  <span className="flex items-center gap-2 text-xs font-bold text-ink-900">
                    <Users className="h-4 w-4 text-clay-700" /> Centre Voice / Philosophy Memory
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-ink-500">
                    Optional style memory for your centre or room. It shapes tone, not evidence.
                  </span>
                </span>
                <span className="text-xs font-bold text-clay-700">{showCentreVoice ? "Hide" : "Set up"}</span>
              </button>
              {showCentreVoice && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="label">Centre philosophy or room voice</label>
                    <textarea
                      value={centrePhilosophy}
                      onChange={(event) => setCentrePhilosophy(event.target.value)}
                      rows={4}
                      className="input resize-none text-sm leading-relaxed"
                      placeholder={location === "NZ"
                        ? "Example: We value child agency, connection with whānau, outdoor inquiry, and calm practical language."
                        : "Example: We value child agency, family partnership, outdoor inquiry, and calm practical language."
                      }
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label">Words or phrases you like</label>
                      <input
                        value={likedPhrases}
                        onChange={(event) => setLikedPhrases(event.target.value)}
                        className="input"
                        placeholder="working theories, ako, confident learner"
                      />
                    </div>
                    <div>
                      <label className="label">Words or phrases to avoid</label>
                      <input
                        value={avoidedPhrases}
                        onChange={(event) => setAvoidedPhrases(event.target.value)}
                        className="input"
                        placeholder="beautiful moment, demonstrated"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-clay-200 bg-white p-3 text-[11px] leading-relaxed text-ink-600">
                    Centre plans make this shared across teams. Free and Educator accounts can still save a personal voice memory here.
                    <Link href="/billing?offer=activation" className="ml-1 font-bold text-clay-700 hover:text-clay-900">
                      See centre options
                    </Link>
                  </div>
                </div>
              )}
            </div>
            {location === "NZ" && (
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
                <p className="text-[11px] text-ink-500 mt-1">
                  NZ-only wording for Te Whāriki stories. EYLF stories stay in Australian educator language.
                </p>
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              {location === "NZ" && (
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
              )}
              <label className="flex items-start gap-2 rounded-xl border border-clay-200 bg-white p-3 text-xs text-ink-700">
                <input
                  type="checkbox"
                  checked={includeTapasa}
                  onChange={(event) => setIncludeTapasa(event.target.checked)}
                  className="mt-0.5 accent-clay-700"
                />
                  <span>
                    <span className="font-bold block text-ink-900">Tapasā lens</span>
                  Use only when Pacific identity, {location === "NZ" ? "whānau" : "family"}, language, or culture is actually present.
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

          {mode === "backlog" ? (
            <button onClick={handleBacklogRescue} disabled={backlogLoading || loading || transcribing || observations.length < 40} className="btn-primary w-full py-4 text-base">
              {backlogLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sorting your backlog...
                </>
              ) : (
                <>
                  <ClipboardList className="w-4 h-4" /> Analyse backlog
                </>
              )}
            </button>
          ) : (
            <button onClick={() => handleGenerate()} disabled={loading || transcribing || observations.length < 10} className="btn-primary w-full py-4 text-base">
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
          )}

          {showBacklogUpgradeNudge && mode === "backlog" && (
            <div className="rounded-2xl border border-clay-200 bg-white p-4 shadow-soft">
              <p className="text-[10px] font-bold uppercase tracking-wider text-clay-600">Centre-ready workflow</p>
              <p className="mt-1 text-sm text-ink-700">
                Backlog Rescue is built for educators catching up across a week. Centre plans make this easier to roll out across teams.
              </p>
              <Link href="/billing?offer=activation" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-clay-700 hover:text-clay-900">
                See upgrade options <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {backlogResult && (
            <div className="rounded-3xl border border-sage-200 bg-gradient-to-br from-sage-50 via-white to-cream-50 p-5 shadow-soft">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-sage-700 text-paper">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <p className="section-title mb-1">Backlog Rescue plan</p>
                  <h3 className="font-display text-xl font-bold text-ink-900">{backlogResult.summary || "Here is a practical order to tackle these notes."}</h3>
                  {backlogResult.nextBestAction && <p className="mt-1 text-xs text-ink-600">{backlogResult.nextBestAction}</p>}
                </div>
              </div>
              <div className="space-y-3">
                {backlogResult.items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-clay-100 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-clay-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-clay-700">
                            {item.priority} priority
                          </span>
                          <span className="rounded-full bg-sage-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sage-700">
                            {item.recommendation.replace("_", " ")}
                          </span>
                        </div>
                        <p className="font-display text-base font-bold text-ink-900">{item.suggestedTitle || "Observation"}</p>
                        <p className="mt-1 text-xs leading-relaxed text-ink-600">{item.reason}</p>
                        {item.frameworkHint && <p className="mt-2 text-[11px] text-clay-700">{item.frameworkHint}</p>}
                      </div>
                      {item.recommendation !== "skip" && (
                        <button onClick={() => selectBacklogItem(item)} className="btn-secondary flex-shrink-0 px-3 py-2 text-xs">
                          Draft this one <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showUpgradePrompt && (
            <div className="rounded-2xl border border-clay-200 bg-cream-50 p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1">
                    {upgradePromptKind === "one_left" ? "1 free story left this month" : "First story created"}
                  </p>
                  <p className="text-sm text-ink-700">
                    {upgradePromptKind === "one_left"
                      ? "You can use your final free story or upgrade with the first-month activation offer when you are ready."
                      : "Try one more real observation while the workflow is fresh. If it keeps saving time, the Educator plan removes the monthly story limit."}
                  </p>
                  <Link href="/billing?offer=activation" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-clay-700 hover:text-clay-900">
                    {upgradePromptKind === "one_left" ? "View activation offer" : "See plan options"} <ArrowRight className="w-3 h-3" />
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
                {billingRequired && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link href="/billing" className="font-bold underline">
                      Fix payment →
                    </Link>
                    <Link href="/support" className="font-bold underline">
                      Contact support →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={storyPanelRef} className="story-safe card-warm flex min-h-[220px] min-w-0 max-w-full flex-col overflow-hidden p-4 sm:min-h-[280px] sm:p-6 md:min-h-[420px] xl:sticky xl:top-4 xl:min-h-[500px]">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="section-title">Your learning story</p>
            {story && (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button onClick={() => handleGenerate()} className="btn-ghost text-xs">
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
                <button onClick={handleParentFriendlyVersion} disabled={parentVersionLoading || !storyId} className="btn-ghost text-xs disabled:opacity-50">
                  {parentVersionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircleHeart className="w-3 h-3" />}
                  Family version
                </button>
                <button onClick={handleFamilyConnectionPack} disabled={familyPackLoading || !storyId} className="btn-ghost text-xs disabled:opacity-50">
                  {familyPackLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : hasFeatureAccess(accountPlan, "familyConnectionPack") ? <Sparkles className="w-3 h-3" /> : <LockKeyhole className="w-3 h-3" />}
                  Family pack
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-clay-500 mb-4" />
              <p className="font-display text-lg font-bold text-ink-900 mb-1">Writing your learning story…</p>
              <p className="min-h-[20px] text-sm font-semibold text-clay-700 transition-all">{GENERATION_STEPS[loadingStep]}</p>
              <p className="mt-2 text-xs text-ink-500">Shaping your notes into a polished, evidence-led story — this can take up to a minute, usually less. Worth the wait.</p>
            </div>
          ) : clarification ? (
            <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-cream-50 p-5 shadow-soft">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="section-title mb-1">Context needed before writing</p>
                  <h2 className="font-display text-2xl font-bold text-ink-900">Please answer these questions first.</h2>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600">
                    {clarification.reason} This has not used a story credit, and your original observation is unchanged.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-soft">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Question {boundedClarificationStep + 1}/{clarificationQuestionCount}
                  </span>
                  <span className="text-[11px] font-semibold text-ink-500">Answer only what you observed.</span>
                </div>
                <label className="block text-sm font-bold leading-relaxed text-ink-900" htmlFor="clarification-answer">
                  {currentClarificationQuestion}
                </label>
                <textarea
                  id="clarification-answer"
                  value={currentClarificationAnswer}
                  onChange={(event) => updateClarificationAnswer(boundedClarificationStep, event.target.value)}
                  rows={5}
                  autoFocus
                  className="input mt-3 resize-none text-sm leading-relaxed"
                  placeholder="Type the answer here. Keep it factual and brief."
                />
              </div>

              {clarificationQuestionCount > 1 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {clarification.questions.map((question, index) => {
                    const answered = Boolean((clarificationAnswers[index] ?? "").trim());
                    const questionButtonClass = [
                      "rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all",
                      boundedClarificationStep === index
                        ? "border-amber-600 bg-amber-600 text-white"
                        : answered
                          ? "border-sage-200 bg-sage-50 text-sage-700"
                          : "border-clay-200 bg-white text-ink-500",
                    ].join(" ");
                    return (
                      <button
                        key={question}
                        type="button"
                        onClick={() => setClarificationStep(index)}
                        className={questionButtonClass}
                      >
                        {index + 1}/{clarificationQuestionCount}{answered ? " done" : ""}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => setClarificationStep((step) => Math.max(0, step - 1))}
                  disabled={boundedClarificationStep === 0}
                  className="btn-secondary justify-center px-4 py-2 text-xs disabled:opacity-40"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleClarificationContinue}
                  disabled={!currentClarificationAnswer.trim()}
                  className="btn-primary justify-center px-5 py-2.5 text-sm disabled:opacity-50"
                >
                  {isFinalClarificationQuestion ? "Generate story with answers" : "Next question"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : story ? (
            <div className="story-safe flex min-w-0 max-w-full flex-1 flex-col">
              {editingStory ? (
                <div className="flex-1 flex flex-col gap-3">
                  <textarea
                    value={storyDraft}
                    onChange={(event) => setStoryDraft(event.target.value)}
                    className="input story-safe min-h-[320px] flex-1 resize-y leading-relaxed font-display text-base"
                    aria-label="Edit generated learning story"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs text-ink-500">
                      Adjust wording, add teacher voice, then save. Your history copy updates too.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
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
                <div className="flex-1">
                  <QuillAssistant
                    story={story}
                    storyId={storyId || undefined}
                    childId={selectedChildId || undefined}
                    framework={location}
                    childName={childName || undefined}
                    plan={accountPlan}
                    onApply={handleQuillApply}
                  />
                </div>
              )}
              {storySaveMessage && !editingStory && (
                <p className="mt-3 text-xs font-semibold text-sage-700 bg-sage-50 border border-sage-100 rounded-lg px-3 py-2">
                  {storySaveMessage}
                </p>
              )}

              <StoryIntelligence
                evidenceAnchors={evidenceAnchors}
                educatorChecks={educatorChecks}
                pedagogyLinks={pedagogyLinks}
                frameworkEvidence={frameworkEvidence}
                storyQuality={storyQuality ?? undefined}
                privacyGuardian={privacyGuardian ?? undefined}
                plan={accountPlan}
                familyQuestion={familyQuestion}
                followUpPrompt={followUpPrompt}
              />

              <ExportPackPanel
                plan={accountPlan}
                childName={childName}
                ageGroup={ageGroup}
                story={story}
                storyTitle={storyTitle}
                observations={observations}
                learningSummary={learningSummary}
                curriculumLinks={curriculumLinks}
                outcomes={outcomes}
                nextSteps={nextSteps}
                familyQuestion={familyQuestion}
                framework={location}
              />

              {parentFriendlyVersion && (
                <div className="story-safe mt-5 max-w-full overflow-hidden rounded-3xl border border-clay-200 bg-white p-5 shadow-soft">
                  <p className="mb-2 flex items-center gap-2 text-xs font-bold text-ink-900">
                    <MessageCircleHeart className="h-4 w-4 text-clay-700" /> Parent-friendly version
                  </p>
                  <p className="story-safe whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{parentFriendlyVersion}</p>
                  <button
                    onClick={() => navigator.clipboard.writeText(parentFriendlyVersion)}
                    className="btn-secondary mt-4 px-3 py-2 text-xs"
                  >
                    <Copy className="h-3 w-3" /> Copy family version
                  </button>
                </div>
              )}

              {familyPack && (
                <div className="story-safe mt-5 max-w-full overflow-hidden rounded-3xl border border-sage-200 bg-gradient-to-br from-sage-50 via-white to-cream-50 p-5 shadow-soft">
                  <p className="mb-2 flex items-center gap-2 text-xs font-bold text-ink-900">
                    <Sparkles className="h-4 w-4 text-clay-700" /> Family Connection Pack
                  </p>
                  <div className="grid gap-3 text-sm text-ink-700">
                    {[
                      ["Family message", familyPack.familyMessage],
                      ["Question to ask", familyPack.familyQuestion],
                      ["Home connection", familyPack.homeConnection],
                      ["Photo caption", familyPack.photoCaption],
                      ["Pickup handover", familyPack.handoverNote],
                      ["Teacher check", familyPack.teacherCheck],
                    ].filter(([, value]) => value).map(([label, value]) => (
                      <div key={label} className="min-w-0 rounded-2xl border border-clay-100 bg-white p-3">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-clay-600">{label}</p>
                        <p className="leading-relaxed">{value}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(
                      [
                        `Family message:\n${familyPack.familyMessage}`,
                        `Question to ask:\n${familyPack.familyQuestion}`,
                        `Home connection:\n${familyPack.homeConnection}`,
                        `Photo caption:\n${familyPack.photoCaption}`,
                        `Pickup handover:\n${familyPack.handoverNote}`,
                        `Teacher check:\n${familyPack.teacherCheck}`,
                      ].filter(Boolean).join("\n\n")
                    )}
                    className="btn-secondary mt-4 px-3 py-2 text-xs"
                  >
                    <Copy className="h-3 w-3" /> Copy family pack
                  </button>
                </div>
              )}

              <FamilyTranslationPanel storyId={storyId} plan={accountPlan} />

              {(learningSummary ||
                outcomes.length > 0 ||
                curriculumLinks.length > 0 ||
                frameworkEvidence.length > 0 ||
                childVoice ||
                learningDispositions.length > 0 ||
                socialEmotionalLinks.length > 0 ||
                culturalConnections.length > 0 ||
                assumptions.length > 0 ||
                nextSteps.length > 0 ||
                whanauConnection ||
                remaining !== "") && (
                <div className="story-safe mt-5 space-y-4 border-t border-clay-200 pt-5">
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
                          <span key={outcome} className="max-w-full break-words rounded-md border border-clay-200 bg-white px-2 py-1 font-mono text-xs text-clay-700">
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

                  {frameworkEvidence.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">Why these links fit</p>
                      <ul className="space-y-1 text-sm text-ink-700">
                        {frameworkEvidence.map((item) => (
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
                          <span key={item} className="max-w-full break-words rounded-md border border-clay-200 bg-cream-50 px-2 py-1 font-mono text-xs text-clay-700">
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
                          <span key={item} className="max-w-full break-words rounded-md border border-sage-100 bg-sage-50 px-2 py-1 font-mono text-xs text-sage-700">
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
                      <p className="text-[10px] font-bold text-clay-600 uppercase tracking-wider mb-1.5">
                        {location === "NZ" ? "Family or whānau link" : "Family link"}
                      </p>
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
            <div className="flex-1 px-0 py-1 sm:p-2">
              <div className="w-full rounded-2xl border border-clay-100 bg-white/75 p-4 text-left shadow-soft sm:ml-auto sm:max-w-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cream-100 text-clay-700">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-base font-bold text-ink-900">Ready when you are</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-500">
                      Add real observation notes, then generate. If more context is genuinely needed, questions will appear here without changing your notes.
                    </p>
                  </div>
                </div>
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
                href="/billing?offer=activation"
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
