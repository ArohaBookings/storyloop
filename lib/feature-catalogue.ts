import type { FeatureKey } from "./plans";

/**
 * Every StoryLoop feature, in plain words, grouped the way an educator thinks
 * about their day. The features page and its plan table are built from this
 * and from lib/plans.ts, so a plan can never be shown with something it does
 * not include. tests/feature-catalogue.test.ts fails if a feature is missing.
 */

export type CatalogueItem = {
  /** A lib/plans.ts feature. Omitted for things every plan has that have no key. */
  key?: FeatureKey;
  name: string;
  body: string;
};

export type CatalogueGroup = {
  id: string;
  title: string;
  lead: string;
  image: string;
  imageAlt: string;
  items: CatalogueItem[];
};

/**
 * Plan keys that exist in lib/plans.ts but have no built feature behind them
 * yet. They are never advertised; list them here only until they are built.
 */
export const NOT_YET_BUILT: FeatureKey[] = ["multiRoomAnalytics", "advancedExportSettings"];

export const FEATURE_CATALOGUE: CatalogueGroup[] = [
  {
    id: "writing",
    title: "Writing the story",
    lead: "From what you saw to a story you would sign, in the order you actually work.",
    image: "/images/scenes/kitchen.jpg",
    imageAlt: "An educator at her kitchen table in the evening reading a StoryLoop learning story draft on her laptop",
    items: [
      { key: "coreStories", name: "Learning stories from a quick note", body: "Three or four quick points become a story with the learning, curriculum links and where to next." },
      { key: "unlimitedStories", name: "Unlimited stories", body: "Write as many stories as your week needs. The free plan includes three a month." },
      { key: "voiceTrial", name: "Voice memos", body: "Say it instead of typing it. The recording becomes text and is not kept. A trial on Free, unlimited from Educator." },
      { name: "One moment, many children", body: "One note about a group becomes a story for each child, using only the sentences about them." },
      { key: "todayLoop", name: "Today Loop", body: "A daily inbox of up to three prompts from your own unfinished moments and open next steps." },
      { key: "unlimitedTodayLoop", name: "Unlimited Today Loop", body: "Capture as many moments as you like and decide later which become stories." },
      { key: "observationCoach", name: "Observation Coach", body: "Gentle prompts for the detail that makes a story specific, before you write it." },
      { key: "storyAssistant", name: "Quill", body: "Highlight a line and ask for it warmer, shorter or closer to your voice. A monthly allowance on Educator, unlimited on Pro." },
      { key: "backlogRescue", name: "Backlog Rescue", body: "Paste a week of rough notes and see which deserve a full story and which can be a short update." },
      { key: "centreVoiceMemory", name: "Your centre's voice", body: "Save your philosophy and the words you like and avoid, so every draft sounds like your service." },
    ],
  },
  {
    id: "trust",
    title: "Getting it right",
    lead: "The checks that run on every draft, so you can trust what you are about to share.",
    image: "/images/scenes/office.jpg",
    imageAlt: "A centre manager at her desk reading StoryLoop's public accuracy report on a laptop",
    items: [
      { key: "storyQualityGuard", name: "Quality guard", body: "Every draft is checked for missing sections, the wrong curriculum and children's words that are not in your note." },
      { key: "privacyEvidenceGuardian", name: "Privacy and evidence check", body: "Flags diagnosis language, sensitive family details, identifiers and anything the note cannot support." },
      { key: "childVoice", name: "Children's own words", body: "A big button a three-year-old can press to talk about their own work, kept exactly as they said it. The recording is never kept." },
      { key: "advancedQualityScore", name: "Detailed quality score", body: "See exactly what each draft did well and what to check, line by line." },
    ],
  },
  {
    id: "children",
    title: "Following each child",
    lead: "Learning that builds from story to story, not a pile of separate documents.",
    image: "/images/scenes/classroom.jpg",
    imageAlt: "An educator holds an iPad with a StoryLoop draft while two toddlers, seen from behind, build a block tower",
    items: [
      { key: "learningThreads", name: "Learning threads", body: "Interests and dispositions that keep showing up across a child's stories, gathered for you." },
      { key: "practiceSignals", name: "What you came back to", body: "The next steps you revisited and kept, so the planning cycle closes itself." },
      { key: "transitionPack", name: "Transition pack", body: "Up to six chosen moments on one printable page for a child starting school." },
      { key: "learningPassport", name: "Learning passport", body: "A portable record a family keeps, that works without StoryLoop." },
      { key: "childContinuityProfiles", name: "Child profiles that remember", body: "Interests, family aspirations, home languages and recent learning carried into every new story." },
      { key: "quietChildRadar", name: "Quiet child radar", body: "Notices which children have not been written about lately, and knows about school holidays." },
      { key: "termWeather", name: "Term report", body: "A printable narrative of each child's term, with no scores." },
    ],
  },
  {
    id: "families",
    title: "Families",
    lead: "The learning, in words families can use and in the language they read.",
    image: "/images/scenes/family.jpg",
    imageAlt: "A parent smiling at a StoryLoop wall card on her phone, her toddler seen from behind",
    items: [
      { key: "familyConnectionPack", name: "Family Connection Pack", body: "A family message, a question to ask at home, a photo caption and a pickup line, from the saved story." },
      { key: "wallCards", name: "Wall cards", body: "A code beside a display that families scan at pickup to read the learning, in English or ten other languages. No names, photos or dates." },
      { key: "pickupBrief", name: "Pickup brief", body: "The specific true thing to say about each child before the door opens, from what you wrote down." },
      { key: "exportPacks", name: "Export packs", body: "The same story arranged for Storypark, Educa, Kinderloop or Brightwheel, ready to paste." },
      { key: "translationReadability", name: "Family translation", body: "A plain-words family version translated for families who read another language." },
      { key: "familyReplyLoop", name: "Family Reply Loop", body: "What families say back becomes context for the next story." },
    ],
  },
  {
    id: "centres",
    title: "Running a centre",
    lead: "One price for the team, and a documentation rhythm leaders can see without reading anyone's diary.",
    image: "/images/scenes/team.jpg",
    imageAlt: "Three educators planning together around a low table with a laptop showing StoryLoop",
    items: [
      { key: "adminOversight", name: "Team seats and oversight", body: "Invite your team, manage seats, and see who is documenting. Drafts stay private unless an educator shares them." },
      { key: "centreQualityCalibration", name: "Centre quality calibration", body: "Shared guidance so stories are consistent across rooms without an approval queue." },
      { key: "planningBoard", name: "Planning board", body: "Emerging interests from recent stories, turned into a weekly planning conversation." },
      { key: "roomPlanningBrief", name: "Room planning brief", body: "What to notice, set up, ask families and discuss next, from the room's recent stories." },
      { key: "documentationRadar", name: "Documentation radar", body: "Gaps across recent stories, framed as support for the team, not a ranking." },
      { key: "relieverBrief", name: "Reliever brief", body: "Your room on one page, so a relief teacher can see the children from the first minute." },
      { key: "evidencePack", name: "Evidence pack", body: "Your own stories assembled the way an ERO or assessment and rating visit asks for them." },
      { key: "prioritySupport", name: "Priority support", body: "Faster answers from the person who builds StoryLoop." },
      { key: "directorRoiDashboard", name: "Director ROI dashboard", body: "Time given back and backlog cleared, to justify the subscription, without ranking educators." },
    ],
  },
];
