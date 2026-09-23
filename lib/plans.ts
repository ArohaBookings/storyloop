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
  | "relieverBrief"
  // The documentation a review visit asks for, assembled from saved stories.
  | "evidencePack"
  // A printed code beside a display, so a family can read the learning behind it.
  | "wallCards"
  // The child's own words about their own work, kept verbatim.
  | "childVoice"
  // A portable, family-held record that outlives the service and us.
  | "learningPassport"
  // The specific true thing to say at the door, per child, before pickup.
  | "pickupBrief"
  // What an educator came back to and kept: the closed half of the cycle.
  | "practiceSignals";

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
  /**
   * Five lines for the homepage card, where the full list (seventeen items on
   * Educator) turned the pricing block into the longest section on the page.
   * Every line restates something in `features`; it never promises more. The
   * full list stays on /pricing.
   */
  highlights?: string[];
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
    highlights: [
      "3 learning stories a month",
      "Te Whāriki or EYLF links",
      "Basic privacy and evidence check",
      "Edit, save and copy every draft",
      "No credit card",
    ],
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
    highlights: [
      "Unlimited learning stories",
      "Voice notes and uploads",
      "Wall cards, children's own words, learning passport and pickup brief",
      "Export packs for Storypark, Educa, Kinderloop, Brightwheel",
      `Quill writing assistant (${EDUCATOR_ASSISTANT_MONTHLY} refines a month)`,
    ],
    features: [
      "Unlimited learning stories",
      "Today Loop, unlimited captured moments",
      `Quill writing assistant (${EDUCATOR_ASSISTANT_MONTHLY} refines/month)`,
      "Voice notes and uploads",
      "Observation Coach prompts",
      "Family Connection Pack",
      "Wall cards: a code beside your display that shows families the learning behind it",
      "Children's own words: a big button a three-year-old can use, kept exactly as they said it",
      "Learning passport: a portable record a family keeps, that works without StoryLoop",
      "Pickup brief: the specific true thing to say about each child before the door opens",
      "What you came back to: the next steps you revisited and kept, gathered from your own stories",
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
    highlights: [
      "Everything in Educator",
      "Family Reply Loop",
      "Parent-friendly translation and readability",
      "Child continuity profiles",
      "Quill writing assistant, unlimited",
    ],
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
    // Centres get a 30-day free month with no card (lib/centre-offer.ts).
    cta: "Start 30 days free",
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
      "Evidence pack: your own stories assembled the way a review visit asks for them",
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
    cta: "Start 30 days free",
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
  // An assessment visit is a centre event, and the person who loses their
  // weekends to it is the person who signs off the centre plan.
  evidencePack: "centre_starter",
  // Deliberately NOT a centre feature, although centres are who it sells. One
  // educator on an individual plan puts a code beside their own display, and
  // every family, colleague and director who walks past sees it working. Gate
  // it to centres and it can only be seen by services that already bought.
  wallCards: "educator",
  // On the individual plan because the person who will actually use this is
  // the educator kneeling next to the child, not the person who signs off the
  // software budget.
  childVoice: "educator",
  // Transition season is when an individual educator decides to pay, and this
  // is the artifact that leaves the building in a family's hands.
  learningPassport: "educator",
  // Daily, in front of a parent. That is the whole argument for putting it on
  // the individual plan: it is used every afternoon, and it is seen by adults
  // who do not have an account.
  pickupBrief: "educator",
  // Reading your own closed loops needs nobody else's data, so it works from
  // the first week rather than at scale.
  practiceSignals: "educator",
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
  "evidence-pack": "evidencePack",
  "wall-cards": "wallCards",
  "child-voice": "childVoice",
  "learning-passport": "learningPassport",
  "pickup-brief": "pickupBrief",
  "practice-signals": "practiceSignals",
  "passport": "learningPassport",
  "wall-card": "wallCards",
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
