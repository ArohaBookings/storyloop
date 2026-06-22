export type OutreachReplyTemplate = {
  id: string;
  title: string;
  useWhen: string;
  subject: string;
  body: string;
};

export const OUTREACH_REPLY_TEMPLATES: OutreachReplyTemplate[] = [
  {
    id: "story_quality_concern",
    title: "Story quality concern",
    useWhen: "A user says a draft sounded generic, too formal, or not like them.",
    subject: "Thanks for the StoryLoop feedback",
    body:
      "Thanks for telling me. If you can send the rough observation and the part of the draft that felt off, I will use that exact example to tighten StoryLoop's story quality. The goal is not polished AI writing; it is a useful educator draft you can edit quickly.",
  },
  {
    id: "reset_password_help",
    title: "Reset-password help",
    useWhen: "A user cannot get back into their account.",
    subject: "StoryLoop password reset help",
    body:
      "I can send a fresh reset link now. Please open the newest StoryLoop email only, because older reset links expire once a new one is requested. The link should take you back to storyloop.space to choose a new password.",
  },
  {
    id: "upgrade_objection",
    title: "Soft upgrade objection",
    useWhen: "A free user likes StoryLoop but is unsure about paying.",
    subject: "Re: StoryLoop plan",
    body:
      "No pressure to upgrade before it makes sense. The paid plan is best when StoryLoop is saving you enough documentation time to justify unlimited stories, Family Connection Packs, Backlog Rescue, and learning threads. If you are still testing, use your free stories on real observations and tell me what would make it worth keeping.",
  },
  {
    id: "centre_rollout",
    title: "Centre rollout",
    useWhen: "A director or room leader asks whether StoryLoop works across a team.",
    subject: "StoryLoop centre rollout",
    body:
      "For a centre rollout, I would start with one room and one weekly rhythm: capture rough notes, draft the strongest stories, then use the Room Planning Brief to turn those stories into next-week planning. That gives the team value before asking every educator to change their process.",
  },
  {
    id: "pricing_question",
    title: "Pricing question",
    useWhen: "A user asks what plan they need.",
    subject: "StoryLoop plan options",
    body:
      "Free is for testing with 3 stories per month. Educator is for one teacher who wants unlimited stories, voice notes, Family Connection Packs, Backlog Rescue, and learning threads. Centre is for a service that wants room planning briefs, rollout support, and admin oversight.",
  },
  {
    id: "feature_request",
    title: "Feature request",
    useWhen: "A user suggests a feature or workflow change.",
    subject: "Thanks for the StoryLoop feature idea",
    body:
      "Thanks, this is useful. I am tracking requests by the pain they solve, not just the feature name. Can you send one sentence on what currently costs you the most time, and what a perfect version would let you stop doing?",
  },
];
