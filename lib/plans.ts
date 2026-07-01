export type PlanKey = "free" | "educator" | "educator_pro" | "centre_starter" | "centre_growth";
export type CurrencyCode = "AUD" | "NZD";

export type FeatureKey =
  | "coreStories"
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
  | "storyAssistant";

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  description: string;
  price: Record<CurrencyCode, number>;
  priceNote?: string;
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
      `Quill writing assistant (${EDUCATOR_ASSISTANT_MONTHLY} refines/month)`,
      "Voice notes and uploads",
      "Observation Coach prompts",
      "Family Connection Pack",
      "Export packs for Storypark, Educa, Kinderloop, Brightwheel",
      "Backlog Rescue",
      "Learning threads",
      "Basic privacy guard",
      "Personal centre voice memory",
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
    priceNote: "per centre/month",
    stories: "Centre rollout tools",
    cta: "Start centre trial",
    buyer: "Directors and room leaders rolling StoryLoop into a small team.",
    features: [
      "Everything in Educator Pro",
      "Centre Quality Calibration",
      "Shared centre voice guidance",
      "Planning Board from stories",
      "Documentation Radar",
      "Admin oversight signals",
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
    priceNote: "per centre/month",
    stories: "Growth analytics + centre rollout",
    cta: "Start growth trial",
    buyer: "Owners, directors, and multi-room services needing rollout visibility.",
    features: [
      "Everything in Centre Starter",
      "Director ROI Dashboard",
      "Multi-room planning analytics",
      "Advanced export settings",
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
