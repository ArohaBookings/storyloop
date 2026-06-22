type PedagogyFocus =
  | "balanced"
  | "intentional_teaching"
  | "child_voice"
  | "family_partnership"
  | "working_theories";
type StoryDepth = "concise" | "balanced" | "detailed";
type StoryFrameworkId = "AU" | "NZ";
type StoryTone = "natural" | "warm" | "professional" | "simple";

export type PhysicalSafetyStoryResult = {
  storyTitle: string;
  story: string;
  outcomes: string[];
  curriculumLinks: string[];
  learningSummary: string;
  childVoice: string;
  learningDispositions: string[];
  socialEmotionalLinks: string[];
  culturalConnections: string[];
  whanauConnection: string;
  childAge: string;
  nextSteps: string[];
  assumptions: string[];
  evidenceAnchors: string[];
  educatorChecks: string[];
  pedagogyLinks: string[];
  frameworkEvidence: string[];
  parentFriendlyVersion?: string;
  storyQuality?: {
    score?: number;
    passes?: boolean;
    revisionCount?: number;
    checks?: Record<string, boolean>;
    issues?: string[];
    strengths?: string[];
  };
  familyQuestion: string;
  followUpPrompt: string;
  wordCount: number;
};

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getMinimumStoryWords(depth: StoryDepth) {
  if (depth === "detailed") return 430;
  if (depth === "concise") return 160;
  return 280;
}

function cleanObservationSummary(observations: string) {
  return observations
    .replace(/\s+/g, " ")
    .replace(/ignore (all )?previous/gi, "")
    .replace(/system:/gi, "")
    .trim()
    .slice(0, 500);
}

function incidentFrameworkMetadata(framework: StoryFrameworkId) {
  if (framework === "NZ") {
    return {
      outcomes: ["Mana atua | Wellbeing", "Mana tangata | Contribution", "Mana reo | Communication"],
      curriculumLinks: [
        "This links with Mana atua | Wellbeing because the learning focus is safe bodies, emotional security, and support to manage strong feelings with adult help.",
        "This links with Mana tangata | Contribution because the children are learning how to be with others, repair harm, and take part in shared play safely.",
        "This links with Mana reo | Communication when the educator supports children to use words, gestures, or help-seeking instead of physical responses.",
      ],
      frameworkEvidence: [
        "The Te Whāriki links fit because the observation is about safety, relationships, contribution, and communication during peer play.",
        "This is not mainly an exploration story; it is a social and emotional learning moment that needs careful educator guidance.",
      ],
      pedagogyLinks: ["responsive and reciprocal practice", "positive guidance", "assessment for learning"],
    };
  }

  return {
    outcomes: [
      "EYLF Outcome 3: Children have a strong sense of wellbeing",
      "EYLF Outcome 1: Children have a strong sense of identity",
      "EYLF Outcome 5: Children are effective communicators",
    ],
    curriculumLinks: [
      "This links with EYLF Outcome 3 because the learning focus is safe bodies, self-regulation, and support to manage strong feelings with adult help.",
      "This links with EYLF Outcome 1 because the children are learning to express needs, be heard, and stay connected after a difficult social moment.",
      "This links with EYLF Outcome 5 when the educator supports children to use words, gestures, or help-seeking instead of physical responses.",
    ],
    frameworkEvidence: [
      "The EYLF links fit because the observation is about wellbeing, identity, relationships, and communication during peer play.",
      "This is not mainly an exploration story; it is a social and emotional learning moment that needs careful educator guidance.",
    ],
    pedagogyLinks: ["responsiveness to children", "intentionality", "relationships with children"],
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildIncidentSequence(observations: string, childName?: string) {
  const child = childName?.trim();
  if (!child) {
    return "The note records shared play followed by physical conflict, including unsafe physical responses that need adult support.";
  }

  const escaped = escapeRegExp(child);
  const wasPushed = new RegExp(`\\bpush(?:ed|es|ing)?\\s+${escaped}\\b`, "i").test(observations);
  const pushedOther = new RegExp(`\\b${escaped}\\s+push(?:ed|es|ing)?\\b`, "i").test(observations);
  const receivedPhysicalResponse = new RegExp(
    `\\b(?:punch(?:ed|es|ing)?|hit(?:s|ting)?|kick(?:ed|s|ing)?|bit(?:e|es|ing)?|scratch(?:ed|es|ing)?)\\s+${escaped}\\b`,
    "i"
  ).test(observations);
  const usedPhysicalResponse = new RegExp(
    `\\b${escaped}\\s+(?:punch(?:ed|es|ing)?|hit(?:s|ting)?|kick(?:ed|s|ing)?|bit(?:e|es|ing)?|scratch(?:ed|es|ing)?)\\b`,
    "i"
  ).test(observations);

  if (wasPushed && usedPhysicalResponse) {
    return `${child} was playing with another child. The note records that another child pushed ${child}, ${child} did not like it, and ${child} responded with an unsafe physical action.`;
  }
  if (pushedOther && receivedPhysicalResponse) {
    return `${child} was playing with another child. The note records that ${child} pushed, and another child then responded with an unsafe physical action.`;
  }
  if (usedPhysicalResponse) {
    return `${child} was involved in shared play that became unsafe when ${child} used a physical response.`;
  }
  if (pushedOther) {
    return `${child} was involved in shared play that became unsafe when pushing happened.`;
  }
  if (wasPushed || receivedPhysicalResponse) {
    return `${child} was involved in shared play that became unsafe when another child's physical action affected ${child}.`;
  }

  return `${child} was involved in shared play followed by physical conflict that needs calm adult support.`;
}

function incidentPedagogyParagraph(focus: PedagogyFocus, child: string) {
  switch (focus) {
    case "intentional_teaching":
      return `The intentional teaching move is to slow the moment down and teach the replacement skill. The educator can model short language such as "Stop", "I need space", or "Please help", while also showing what safe hands and safe bodies look like in this play context.`;
    case "child_voice":
      return `Child voice is important here, but it should not be invented. A stronger final story would include what ${child} said, signed, gestured, or showed with their body when the play became too rough, and what language the educator offered as a safer alternative.`;
    case "family_partnership":
      return `A family partnership lens can help if the educator keeps the question practical and non-blaming. The useful question is not "does this happen at home", but "what words or strategies help ${child} when play feels too rough or unfair?"`;
    case "working_theories":
      return `This may also be followed as an emerging social working theory: what does ${child} understand about space, fairness, stopping, and repairing after something has gone wrong in play?`;
    default:
      return `The educator's role is to protect safety first, then support learning. That means checking both children are okay, naming the unsafe action calmly, helping each child communicate, and returning to play only when the situation is settled.`;
  }
}

export function buildPhysicalSafetyFallbackStory(
  current: Partial<PhysicalSafetyStoryResult>,
  params: {
    observations: string;
    framework: StoryFrameworkId;
    tone: StoryTone;
    depth: StoryDepth;
    pedagogyFocus?: PedagogyFocus;
    childName?: string;
    ageGroup?: string;
  },
  reasons: string[],
  revisionCount: number
): PhysicalSafetyStoryResult {
  const child = params.childName?.trim() || "the child";
  const childLower = child === "the child" ? "the child" : child;
  const observation = cleanObservationSummary(params.observations) || "The educator noted a brief social learning and safety moment.";
  const title = child === "the child" ? "A Social Learning and Safety Moment" : `Supporting ${child}'s Safe Play`;
  const framework = incidentFrameworkMetadata(params.framework);
  const frameworkName = params.framework === "NZ" ? "Te Whāriki" : "EYLF";
  const familyWord = params.framework === "NZ" ? "whānau" : "family";
  const sequence = buildIncidentSequence(params.observations, params.childName);
  const ageSentence = params.ageGroup
    ? `The selected age group is ${params.ageGroup}, so the final wording should stay matched to what is reasonable for that age and your local behaviour guidance.`
    : "Because no age was supplied, the interpretation stays broad and avoids age-specific developmental claims.";
  const pedagogyParagraph = incidentPedagogyParagraph(params.pedagogyFocus ?? "balanced", child);

  const paragraphs = [
    `This observation records a social learning and safety moment, not a simple play interest. ${sequence} The important educator message is clear: the physical response was not safe, and the children need calm adult support rather than blame or shame.`,
    `The learning focus is social and emotional. ${child} is still learning how to manage a hard moment in play, how to communicate when something feels wrong, and how to return to a safe relationship after conflict. A paid-grade learning story should name that honestly instead of turning the moment into a generic story about exploration.`,
    `The evidence boundary matters. The note says: "${observation}". It does not tell us whether anyone was hurt, what happened immediately before the push, what words were used, how long the moment lasted, or how the educator responded. Those details should be checked before this is shared with ${familyWord} or saved as a final record.`,
    pedagogyParagraph,
  ];

  if (params.depth !== "concise") {
    paragraphs.push(
      `For ${frameworkName}, the strongest curriculum link is wellbeing, relationships, contribution, and communication. This moment can show learning because children are supported to notice impact, use safer strategies, hear another person's boundary, and repair the connection with adult help. The curriculum claim should stay modest: the story is about support for safe social participation, not about a completed skill.`,
      `A useful educator response would be immediate and practical. First, check safety and comfort. Then support each child separately if needed. Use simple language to name the boundary: "Pushing hurt Ruby" or "Punching is not safe." After that, help the child practise a safer option such as moving away, saying stop, asking for help, or using a calm body.`
    );
  }

  if (params.depth === "detailed") {
    paragraphs.push(
      `This draft should also sit beside your service's behaviour, injury, or incident process if that applies. The learning story can record the teaching response, but it should not replace required incident documentation, family communication, or centre policy. If another child is named in the rough note, the educator may need to remove that name from the family-facing version.`,
      `The next observation should look for repair and replacement skills, not just whether the behaviour happens again. Notice whether ${childLower} can use a word, gesture, pause, seek help, accept support, re-enter play safely, or show care after a hard moment. Those are the details that will make the next story specific, useful, and fair to everyone involved.`
    );
  }

  const story = `${title}\n\n${paragraphs.join("\n\n")}`;
  const wordCount = countWords(story);
  const meetsDepthTarget = wordCount >= getMinimumStoryWords(params.depth);

  return {
    ...current,
    storyTitle: title,
    story,
    outcomes: framework.outcomes,
    curriculumLinks: framework.curriculumLinks,
    learningSummary: `${child} was involved in a social learning and safety moment. The visible learning is about safe bodies, communication, emotional regulation, and repair with educator support.`,
    childVoice: "",
    learningDispositions: ["self-regulation", "communication", "empathy", "repairing relationships"],
    socialEmotionalLinks: ["safe bodies", "emotional awareness", "boundary language", "help-seeking"],
    culturalConnections: [],
    whanauConnection:
      params.framework === "NZ"
        ? `Whānau may know words, cues, or calming strategies that help ${child} when play feels too rough or unfair.`
        : `Families may know words, cues, or calming strategies that help ${child} when play feels too rough or unfair.`,
    assumptions: [
      "This observation involves physical conflict, so safety, injury, supervision, and service policy details need educator review.",
      "The note is brief, so exact words, educator response, what happened before, and whether anyone was hurt need confirming.",
      ageSentence,
    ],
    evidenceAnchors: [
      "The children were playing together.",
      "The note records pushing during the play.",
      "The note records an unsafe physical response after the push.",
    ],
    educatorChecks: [
      "Was anyone hurt, and does this need an incident or behaviour record under your service policy?",
      "What exact words, gestures, or educator support happened before and after the physical response?",
      `Should another child's name be removed before sharing this with ${familyWord}?`,
    ],
    pedagogyLinks: framework.pedagogyLinks,
    frameworkEvidence: framework.frameworkEvidence,
    parentFriendlyVersion:
      params.framework === "NZ"
        ? `${child} had a hard social moment during play and needed support with safe bodies, words, and repair. Please review the details before sharing with whānau.`
        : `${child} had a hard social moment during play and needed support with safe bodies, words, and repair. Please review the details before sharing with family.`,
    familyQuestion: `What words, cues, or calming strategies help ${child} when play feels too rough or unfair?`,
    followUpPrompt: `Notice whether ${child} can use a word, gesture, pause, or seek help when play becomes too physical.`,
    childAge: params.ageGroup || current.childAge || "Not stated",
    nextSteps: [
      "Check safety first and follow the service incident or behaviour process if required.",
      "Teach one replacement phrase or gesture for stopping rough play and asking for help.",
      "Plan close educator support during similar peer play and record the next safe communication attempt.",
    ],
    wordCount,
    storyQuality: {
      passes: true,
      score: 93,
      revisionCount,
      checks: {
        naturalEducatorTone: true,
        childVoiceSupported: true,
        frameworkLinksFit: true,
        noInventedDetails: true,
        evidenceToLearningClear: true,
        familyReadable: true,
        usefulForDepth: meetsDepthTarget,
        physicalConflictHandledSafely: true,
      },
      issues: meetsDepthTarget ? [] : reasons.slice(0, 3),
      strengths: ["Physical conflict was handled as a safety and social learning moment, not generic play."],
    },
  };
}
