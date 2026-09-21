export type PlanKey = "free" | "educator" | "educator_pro" | "centre_starter" | "centre_growth";
export type CurrencyCode = "AUD" | "NZD";

export type FeatureKey =
  | "coreStories"
  | "todayLoop"
  | "unlimitedTodayLoop"
  | "voiceTrial"
  | "unlimitedStories"
  | "observationCoach"
  | "storyQualityGuard"
  | "advancedQualityScore"
  | "privacyEvidenceGuardian"
  | "exportPacks"
  | "learningThreads"
  | "childContinuityProfiles"
  | "familyConnectionPack"
  | "familyReplyLoop"
  | "translationReadability"
  | "backlogRescue"
  | "centreVoiceMemory"
  | "centreQualityCalibration"
  | "roomPlanningBrief"
  | "planningBoard"
  | "documentationRadar"
  | "adminOversight"
  | "prioritySupport"
  | "directorRoiDashboard"
  | "multiRoomAnalytics"
  | "advancedExportSettings"
  | "storyAssistant"
  // Term-aware features, built on lib/terms.ts. New keys only: no existing
  // feature changed tier, so nobody loses anything they already have.
  | "quietChildRadar"
  | "termWeather"
  | "transitionPack"
  // A one-page brief so a reliever walking in cold can still see the children.
  | "relieverBrief";

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  description: string;
  price: Record<CurrencyCode, number>;
  priceNote?: string;
  /**
   * Educator seats included. Real now that centre_members exists and the seat
   * limit is enforced when an invite is accepted. Its other job is arithmetic:
   * a centre plan divided by its seats costs roughly half the individual price,
   * which was always true and was never said anywhere.
   */
  seats?: number;
  stories: string;
  cta: string;
  popular?: boolean;
  buyer: string;
  features: string[];
  painSolved: string[];
};

export const PLAN_ORDER: PlanKey[] = ["free", "educator", "educator_pro", "centre_starter", "centre_growth"];

// Educator's monthly Quill allowance (a generous taste). Educator Pro and
// centre plans are unlimited. Kept in one place so the API and the plan copy
// never drift.
export const EDUCATOR_ASSISTANT_MONTHLY = 15;

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    key: "free",
    name: "Free",
    description: "For trying the educator-led workflow on real observations without pressure.",
    price: { AUD: 0, NZD: 0 },
    stories: "3 stories/month",
    cta: "Start free",
    buyer: "Curious educators validating the writing style before changing habits.",
    features: [
      "3 learning stories per month",
      "Today Loop (10 captured moments/month)",
      "Basic story quality guard",
      "Basic privacy and evidence check",
      "EYLF or Te Whāriki links",
      "Editable history",
      "Basic text export",
      "Limited voice-note trial",
      "No credit card required",
    ],
    painSolved: [
      "Try the workflow before changing centre routines",
      "Turn one rough note into something editable",
      "Check whether the tone feels usable",
    ],
  },
  {
    key: "educator",
    name: "Educator",
    description: "For individual teachers who want documentation to stop stealing evenings.",
    price: { AUD: 19, NZD: 21 },
    stories: "Unlimited stories",
    cta: "Start 7-day trial",
    popular: true,
    buyer: "Individual educators who need fast drafts, family-ready outputs, and export formats.",
    features: [
      "Unlimited learning stories",
      "Today Loop, unlimited captured moments",
      `Quill writing assistant (${EDUCATOR_ASSISTANT_MONTHLY} refines/month)`,
      "Voice notes and uploads",
      "Observation Coach prompts",
      "Family Connection Pack",
      "Export packs for Storypark, Educa, Kinderloop, Brightwheel",
      "Backlog Rescue",
      "Learning threads",
      "Basic privacy guard",
      "Personal centre voice memory",
      "Transition pack for children starting school",
    ],
    painSolved: [
      "Clear a documentation backlog without writing every note from scratch",
      "Send families a clearer version without rewriting the whole story",
      "Keep story quality consistent when tired or rushed",
    ],
  },
  {
    key: "educator_pro",
    name: "Educator Pro",
    description: "For serious individual educators who want the family and continuity loop.",
    price: { AUD: 29, NZD: 33 },
    stories: "Unlimited stories + advanced loop tools",
    cta: "Start 7-day trial",
    buyer: "Educators who want stronger family partnership, translation support, and deeper review.",
    features: [
      "Everything in Educator",
      "Quill writing assistant, unlimited",
      "Family Reply Loop",
      "Parent-friendly translation and readability",
      "Advanced quality score details",
      "Child continuity profiles",
      "Quiet child radar that knows school holidays",
      "Printable term report for each child, no scores",
      "Whānau voice carried into future stories",
      "Priority educator support",
    ],
    painSolved: [
      "Turn family replies into useful context for the next story",
      "Support multilingual families without rewriting everything",
      "Improve story quality without making the teacher sound replaced",
    ],
  },
  {
    key: "centre_starter",
    name: "Centre Starter",
    description: "For small centres that want a consistent, visible documentation rhythm.",
    price: { AUD: 99, NZD: 109 },
    priceNote: "per centre/month · unlimited children",
    seats: 10,
    stories: "10 educator seats",
    cta: "Start centre trial",
    buyer: "Directors and room leaders rolling StoryLoop into a small team.",
    features: [
      "Everything in Educator Pro, for all 10 educators",
      "Unlimited children, no per-child fee",
      "Invite your team and manage seats",
      "Educators keep their drafts private unless they choose to share",
      "Centre Quality Calibration",
      "Shared centre voice guidance",
      "Planning Board from stories",
      "Documentation Radar",
      "Admin oversight signals",
      "Reliever brief: your room on one page for a relief teacher",
      "Priority support",
    ],
    painSolved: [
      "Spot emerging interests across several stories",
      "Turn documentation into a weekly planning conversation",
      "Support consistency without heavy approval workflows",
    ],
  },
  {
    key: "centre_growth",
    name: "Centre Growth",
    description: "For larger or scaling services that need director-level visibility and ROI proof.",
    price: { AUD: 199, NZD: 219 },
    priceNote: "per centre/month · unlimited children",
    seats: 25,
    stories: "25 educator seats",
    cta: "Start growth trial",
    buyer: "Owners, directors, and larger services needing rollout visibility.",
    features: [
      "Everything in Centre Starter, for all 25 educators",
      "Unlimited children, no per-child fee",
      "Director ROI Dashboard",
      "Rollout health signals",
      "Onboarding support",
      "Priority roadmap feedback",
    ],
    painSolved: [
      "Show time saved and backlog cleared to justify the subscription",
      "See what teams use without intrusive surveillance",
      "Scale documentation consistency across rooms",
    ],
  },
];

const FEATURE_REQUIREMENTS: Record<FeatureKey, PlanKey> = {
  coreStories: "free",
  todayLoop: "free",
  unlimitedTodayLoop: "educator",
  voiceTrial: "free",
  storyQualityGuard: "free",
  privacyEvidenceGuardian: "free",
  unlimitedStories: "educator",
  observationCoach: "educator",
  exportPacks: "educator",
  learningThreads: "educator",
  familyConnectionPack: "educator",
  backlogRescue: "educator",
  centreVoiceMemory: "educator",
  familyReplyLoop: "educator_pro",
  translationReadability: "educator_pro",
  advancedQualityScore: "educator_pro",
  childContinuityProfiles: "educator_pro",
  centreQualityCalibration: "centre_starter",
  roomPlanningBrief: "centre_starter",
  planningBoard: "centre_starter",
  documentationRadar: "centre_starter",
  adminOversight: "centre_starter",
  prioritySupport: "centre_starter",
  directorRoiDashboard: "centre_growth",
  multiRoomAnalytics: "centre_growth",
  advancedExportSettings: "centre_growth",
  // Quill (inline refine): Educator gets a monthly taste, Educator Pro
  // unlimited (the monthly cap for Educator is enforced in the API).
  storyAssistant: "educator",
  // Continuity across a whole group of children belongs with child continuity
  // profiles on Educator Pro, and gives an Educator a concrete reason to move up.
  quietChildRadar: "educator_pro",
  // A per-child narrative of dispositions across a term, printable for team
  // meetings and review. Same continuity family as the radar.
  termWeather: "educator_pro",
  // A printable handover for a child moving on to school or a new service. It
  // sits on the entry paid plan on purpose: it is needed by a date (end of the
  // year), which is exactly when a free educator decides to pay.
  transitionPack: "educator",
  // Relievers are a centre problem: the centre pays for them and the centre
  // feels the documentation gap they leave behind.
  relieverBrief: "centre_starter",
};

export function normalizePlanKey(plan: unknown): PlanKey {
  if (plan === "educator" || plan === "educator_pro" || plan === "centre_starter" || plan === "centre_growth") {
    return plan;
  }
  if (plan === "centre") return "centre_starter";
  return "free";
}

export function planRank(plan: unknown) {
  return PLAN_ORDER.indexOf(normalizePlanKey(plan));
}

export function hasFeatureAccess(plan: unknown, feature: FeatureKey) {
  return planRank(plan) >= planRank(FEATURE_REQUIREMENTS[feature]);
}

// Upgrade links around the app name features both ways ("storyAssistant" and
// "family-reply-loop"). Some also use a shorter name than the key.
const FEATURE_PARAM_ALIASES: Record<string, FeatureKey> = {
  "child-continuity": "childContinuityProfiles",
  "term-report": "termWeather",
  "reliever-brief": "relieverBrief",
};

/** The feature an upgrade link is asking about, or null if it names none. */
export function resolveFeatureParam(value: string | null | undefined): FeatureKey | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  const has = (key: string) => Object.prototype.hasOwnProperty.call(FEATURE_REQUIREMENTS, key);
  if (has(raw)) return raw as FeatureKey;
  if (Object.prototype.hasOwnProperty.call(FEATURE_PARAM_ALIASES, raw)) return FEATURE_PARAM_ALIASES[raw];
  const camel = raw.toLowerCase().replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
  return has(camel) ? (camel as FeatureKey) : null;
}

export function requiredPlanForFeature(feature: FeatureKey) {
  return FEATURE_REQUIREMENTS[feature];
}

export function getPlanDefinitions(currency: CurrencyCode) {
  return PLAN_DEFINITIONS.map((plan) => ({
    ...plan,
    displayPrice: plan.price[currency],
  }));
}

export function getPlanByKey(plan: unknown) {
  const key = normalizePlanKey(plan);
  return PLAN_DEFINITIONS.find((definition) => definition.key === key) ?? PLAN_DEFINITIONS[0];
}

export function getNextPlan(plan: unknown): PlanKey | null {
  const current = normalizePlanKey(plan);
  if (current === "free") return "educator";
  if (current === "educator") return "educator_pro";
  if (current === "educator_pro") return "centre_starter";
  if (current === "centre_starter") return "centre_growth";
  return null;
}
