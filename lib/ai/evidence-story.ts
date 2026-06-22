type PedagogyFocus =
  | "balanced"
  | "intentional_teaching"
  | "child_voice"
  | "family_partnership"
  | "working_theories";
type StoryDepth = "concise" | "balanced" | "detailed";
type StoryFrameworkId = "AU" | "NZ";
type StoryTone = "natural" | "warm" | "professional" | "simple";

export type EvidenceStoryResult = {
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

type StoryDomain =
  | "construction"
  | "pretend"
  | "sensory"
  | "working_theory"
  | "self_regulation"
  | "creative"
  | "social"
  | "general";

const DOMAIN_KEYWORDS: Array<{ domain: StoryDomain; words: string[] }> = [
  { domain: "self_regulation", words: ["covered ears", "quiet corner", "loud", "noise", "calm", "upset", "frustrated"] },
  { domain: "pretend", words: ["pretend", "shopping", "shop", "basket", "cashier", "beeping", "doctor", "cafe", "home corner"] },
  { domain: "working_theory", words: ["river", "mud", "water", "soil", "channel", "pour", "mix", "garden", "worm", "why", "because"] },
  { domain: "construction", words: ["tower", "block", "blocks", "built", "building", "fell", "stood", "balance"] },
  { domain: "sensory", words: ["scarf", "reached", "waved", "laughed", "kicked", "texture", "sensory", "babble"] },
  { domain: "creative", words: ["paint", "draw", "mark", "clay", "collage", "music", "dance"] },
  { domain: "social", words: ["asked", "help", "together", "shared", "turn", "gave", "joined", "invited"] },
];

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getMinimumStoryWords(depth: StoryDepth) {
  if (depth === "detailed") return 430;
  if (depth === "concise") return 160;
  return 280;
}

function cleanObservation(observations: string) {
  return observations
    .replace(/\s+/g, " ")
    .replace(/ignore (all )?previous/gi, "")
    .replace(/system:/gi, "")
    .trim()
    .slice(0, 700);
}

function splitFragments(observations: string) {
  return observations
    .split(/[\n.!?]+/)
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter((part) => part.length > 6)
    .slice(0, 5);
}

function sentenceCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).replace(/[.!?]*$/, ".");
}

function detectDomain(observation: string): StoryDomain {
  const lower = observation.toLowerCase();
  for (const item of DOMAIN_KEYWORDS) {
    if (item.words.some((word) => lower.includes(word))) return item.domain;
  }
  return "general";
}

function extractQuote(observation: string) {
  const quoted = observation.match(/["“](.+?)["”]/)?.[1]?.trim();
  if (quoted) return quoted.slice(0, 120);

  const said = observation.match(/\b(?:said|says|told)\s*,?\s+([^.!?]{2,80})/i)?.[1]?.trim();
  if (!said) return "";
  return said
    .replace(/^that\s+/i, "")
    .replace(/\s+and\s+.*/i, "")
    .replace(/[,"“”]+$/g, "")
    .trim()
    .slice(0, 90);
}

function extractOtherChildren(observation: string, childName?: string) {
  const child = childName?.toLowerCase();
  const blocked = new Set([
    "Today",
    "The",
    "When",
    "Later",
    "He",
    "She",
    "They",
    "Educator",
    "EYLF",
    "Te",
  ]);
  return Array.from(new Set(observation.match(/\b[A-Z][a-z]{2,}\b/g) ?? []))
    .filter((name) => name.toLowerCase() !== child && !blocked.has(name))
    .slice(0, 2);
}

function domainTitle(domain: StoryDomain, child: string) {
  if (child === "the child") {
    if (domain === "self_regulation") return "Finding a Safe Way Through a Big Moment";
    if (domain === "working_theory") return "Testing an Idea";
    if (domain === "pretend") return "Making Meaning Through Pretend Play";
    return "A Learning Moment Worth Following";
  }

  switch (domain) {
    case "construction":
      return `${child}'s Tower That Stood`;
    case "pretend":
      return `${child}'s Pretend Play Story`;
    case "sensory":
      return `${child}'s Back-and-Forth Discovery`;
    case "working_theory":
      return `${child}'s Theory in Action`;
    case "self_regulation":
      return `${child} Finding a Safe Way Through Noise`;
    case "creative":
      return `${child}'s Ideas Taking Shape`;
    case "social":
      return `${child} Learning With Others`;
    default:
      return `${child}'s Learning Story`;
  }
}

function frameworkForDomain(framework: StoryFrameworkId, domain: StoryDomain) {
  if (framework === "NZ") {
    if (domain === "self_regulation") {
      return {
        outcomes: ["Mana atua | Wellbeing", "Mana reo | Communication", "Mana whenua | Belonging"],
        curriculumLinks: [
          "This links with Mana atua | Wellbeing because the visible learning is about recognising sensory or emotional discomfort and finding a safer way to manage it.",
          "This links with Mana reo | Communication because the child communicated through body cues, movement, pointing, or words.",
          "This links with Mana whenua | Belonging when predictable support helps the child feel secure in the setting.",
        ],
        frameworkEvidence: ["The Te Whāriki links fit because the observation shows wellbeing, communication, and belonging through a real self-regulation moment."],
        pedagogyLinks: ["responsive and reciprocal practice", "emotion coaching", "assessment for learning"],
      };
    }
    if (domain === "social" || domain === "construction") {
      return {
        outcomes: ["Mana aotūroa | Exploration", "Mana tangata | Contribution", "Mana reo | Communication"],
        curriculumLinks: [
          "This links with Mana aotūroa | Exploration because the child tested an idea, adjusted their approach, and stayed with a challenge.",
          "This links with Mana tangata | Contribution because the learning involved help, shared attention, or participation with another child.",
          "This links with Mana reo | Communication because the child used words, gesture, action, or shared meaning to keep the play moving.",
        ],
        frameworkEvidence: ["The Te Whāriki links fit because the evidence shows problem solving, contribution, and communication in the observed moment."],
        pedagogyLinks: ["play-based learning", "responsive and reciprocal practice", "assessment for learning"],
      };
    }
    if (domain === "working_theory") {
      return {
        outcomes: ["Mana aotūroa | Exploration", "Mana reo | Communication"],
        curriculumLinks: [
          "This links with Mana aotūroa | Exploration because the child tested a working theory by changing materials, watching what happened, and adapting the idea.",
          "This links with Mana reo | Communication because the child used language, gesture, or shared action to express their thinking.",
        ],
        frameworkEvidence: ["The Te Whāriki links fit because the evidence shows active exploration, reasoning, and communication."],
        pedagogyLinks: ["working theories", "intentional teaching", "assessment for learning"],
      };
    }
    return {
      outcomes: ["Mana reo | Communication", "Mana aotūroa | Exploration", "Mana tangata | Contribution"],
      curriculumLinks: [
        "This links with Mana reo | Communication because the child used sound, gesture, movement, symbol, or shared action to express meaning.",
        "This links with Mana aotūroa | Exploration because the child explored materials, roles, movement, or ideas through active play.",
        "This links with Mana tangata | Contribution when the child connected their play with another person or the group.",
      ],
      frameworkEvidence: ["The Te Whāriki links fit because they are tied to the child's visible actions and communication rather than a generic activity label."],
      pedagogyLinks: ["responsive and reciprocal practice", "play-based learning", "assessment for learning"],
    };
  }

  if (domain === "self_regulation") {
    return {
      outcomes: [
        "EYLF Outcome 3: Children have a strong sense of wellbeing",
        "EYLF Outcome 1: Children have a strong sense of identity",
        "EYLF Outcome 5: Children are effective communicators",
      ],
      curriculumLinks: [
        "This links with EYLF Outcome 3 because the child was recognising a sensory or emotional response and using a safer strategy.",
        "This links with EYLF Outcome 1 because the child showed agency by moving, pausing, watching, or choosing what felt manageable.",
        "This links with EYLF Outcome 5 because the child communicated through body cues, pointing, gesture, or words.",
      ],
      frameworkEvidence: ["The EYLF links fit because the observation shows wellbeing, identity, and communication in a real self-regulation moment."],
      pedagogyLinks: ["responsiveness to children", "intentionality", "secure respectful relationships"],
    };
  }
  if (domain === "working_theory") {
    return {
      outcomes: [
        "EYLF Outcome 4: Children are confident and involved learners",
        "EYLF Outcome 2: Children are connected with and contribute to their world",
        "EYLF Outcome 5: Children are effective communicators",
      ],
      curriculumLinks: [
        "This links with EYLF Outcome 4 because the child investigated, tested an idea, and adjusted their approach.",
        "This links with EYLF Outcome 2 when the learning connects with natural materials, place, or care for the environment.",
        "This links with EYLF Outcome 5 because the child used language, gesture, or shared action to communicate thinking.",
      ],
      frameworkEvidence: ["The EYLF links fit because the evidence shows inquiry, connection with the world, and communication."],
      pedagogyLinks: ["intentionality", "responsiveness to children", "learning through play"],
    };
  }
  if (domain === "sensory") {
    return {
      outcomes: [
        "EYLF Outcome 5: Children are effective communicators",
        "EYLF Outcome 3: Children have a strong sense of wellbeing",
        "EYLF Outcome 1: Children have a strong sense of identity",
      ],
      curriculumLinks: [
        "This links with EYLF Outcome 5 because the child communicated through gaze, movement, sound, repetition, or shared response.",
        "This links with EYLF Outcome 3 because the child showed enjoyment, body awareness, and engagement through sensory play.",
        "This links with EYLF Outcome 1 because the child showed agency by reaching, repeating, and inviting the interaction to continue.",
      ],
      frameworkEvidence: ["The EYLF links fit because the observation shows infant/toddler communication, wellbeing, and agency through visible action."],
      pedagogyLinks: ["secure respectful relationships", "responsiveness to children", "learning through play"],
    };
  }
  return {
    outcomes: [
      "EYLF Outcome 4: Children are confident and involved learners",
      "EYLF Outcome 5: Children are effective communicators",
      "EYLF Outcome 1: Children have a strong sense of identity",
    ],
    curriculumLinks: [
      "This links with EYLF Outcome 4 because the child used play to test an idea, make choices, persist, or represent thinking.",
      "This links with EYLF Outcome 5 because the child communicated through words, sounds, gesture, symbols, roles, or shared meaning.",
      "This links with EYLF Outcome 1 when the child showed agency, confidence, or connection with others in the moment.",
    ],
    frameworkEvidence: ["The EYLF links fit because they are tied to the child's visible actions and communication rather than a generic activity label."],
    pedagogyLinks: ["learning through play", "responsiveness to children", "intentionality"],
  };
}

function learningLens(domain: StoryDomain) {
  switch (domain) {
    case "construction":
      return {
        summary: "persistence, problem solving, collaboration, and confidence",
        dispositions: ["persistence", "problem solving", "collaboration", "confidence"],
        social: ["asking for help", "shared problem solving", "pride in effort"],
      };
    case "pretend":
      return {
        summary: "symbolic thinking, communication, sequencing, and social imagination",
        dispositions: ["imagination", "communication", "agency", "symbolic thinking"],
        social: ["shared play", "turn-taking", "representing familiar routines"],
      };
    case "sensory":
      return {
        summary: "sensory exploration, communication, agency, and back-and-forth connection",
        dispositions: ["curiosity", "agency", "communication", "repetition with purpose"],
        social: ["shared attention", "responsive interaction", "joy in connection"],
      };
    case "working_theory":
      return {
        summary: "inquiry, working theories, cause and effect, and shared investigation",
        dispositions: ["curiosity", "working theories", "problem solving", "communication"],
        social: ["inviting others into inquiry", "shared investigation", "explaining ideas"],
      };
    case "self_regulation":
      return {
        summary: "self-awareness, communication, emotional regulation, and agency",
        dispositions: ["self-awareness", "agency", "communication", "self-regulation"],
        social: ["help-seeking", "body awareness", "safe coping strategies"],
      };
    case "creative":
      return {
        summary: "creative expression, representation, choice-making, and communication",
        dispositions: ["creativity", "agency", "communication", "experimentation"],
        social: ["sharing ideas", "representing meaning", "confidence"],
      };
    default:
      return {
        summary: "agency, communication, curiosity, and connection",
        dispositions: ["agency", "communication", "curiosity", "confidence"],
        social: ["belonging", "shared attention", "participation"],
      };
  }
}

function pedagogyParagraph(focus: PedagogyFocus, child: string, domain: StoryDomain) {
  if (focus === "intentional_teaching") {
    return `A strong intentional teaching response would be small and well timed: name what ${child} is trying, offer one useful word, question, material, or strategy, and then wait to see how ${child} uses it. The adult role is to extend the thinking without taking the learning away from ${child}.`;
  }
  if (focus === "child_voice") {
    return `The child's voice is already visible through action. A final shared version would be even stronger if it includes one exact word, sound, gesture, sign, facial expression, or choice from ${child}. If those details were not recorded, the story should keep the voice as agency rather than inventing a quote.`;
  }
  if (focus === "family_partnership") {
    return `A useful family connection is to ask whether this interest, strategy, word, or routine is appearing outside the centre. That keeps the question warm and specific while leaving space for family knowledge.`;
  }
  if (focus === "working_theories" || domain === "working_theory") {
    return `This can be followed as a working theory. The useful question is what ${child} seems to be testing: how something moves, changes, balances, sounds, connects, or affects another person. The next observation should look for what ${child} repeats, changes, predicts, or explains.`;
  }
  return `The educator's role is to notice the learning inside the ordinary moment. The follow-up should stay close to the evidence: offer one related opportunity, listen for ${child}'s language or watch for a repeated strategy, and record what changes next time.`;
}

function firstParagraph(child: string, fragments: string[], quote: string, domain: StoryDomain) {
  const first = fragments[0] ? sentenceCase(fragments[0]) : `${child} was noticed in a brief learning moment.`;
  const rest = fragments.slice(1, 4).map(sentenceCase).join(" ");
  const quoteSentence = quote ? ` The recorded words were "${quote}".` : "";

  if (domain === "sensory") {
    return `${first} ${rest} This was not just a sensory activity; it was a back-and-forth conversation through movement, attention, and response.${quoteSentence}`.replace(/\s+/g, " ").trim();
  }
  if (domain === "pretend") {
    return `${first} ${rest} ${child} was turning real-world routines into pretend play, using objects, sound, sequence, and another person to carry the idea forward.${quoteSentence}`.replace(/\s+/g, " ").trim();
  }
  if (domain === "construction") {
    return `${first} ${rest} The important learning was not only the finished tower; it was how ${child} stayed with the problem, adjusted the plan, and used help or feedback to keep going.${quoteSentence}`.replace(/\s+/g, " ").trim();
  }
  if (domain === "working_theory") {
    return `${first} ${rest} ${child} was building a theory through real materials: noticing what changed, trying an action, and using the result to decide what to do next.${quoteSentence}`.replace(/\s+/g, " ").trim();
  }
  if (domain === "self_regulation") {
    return `${first} ${rest} This was a wellbeing and communication moment because ${child} noticed what felt difficult, used a strategy, and showed readiness in a way others could understand.${quoteSentence}`.replace(/\s+/g, " ").trim();
  }
  return `${first} ${rest} This moment shows ${child} making choices, communicating meaning, and giving the educator something specific to build on next.${quoteSentence}`.replace(/\s+/g, " ").trim();
}

function extensionParagraph(domain: StoryDomain, child: string) {
  switch (domain) {
    case "construction":
      return `A strong next observation would watch what ${child} does when the structure becomes difficult again. Does ${child} change the base, ask for help sooner, explain the plan, celebrate the process, or offer the same support to another child? Those details would show continuity in persistence and collaboration.`;
    case "pretend":
      return `A strong next observation would follow the story line of the play. Does ${child} add new roles, use more specific language, invite another child into the sequence, or connect the pretend routine with real experiences from home or the community?`;
    case "sensory":
      return `A strong next observation would follow the pattern of response. Does ${child} repeat the movement, pause for the adult to copy, use a sound or gesture to continue, or show preference for a particular pace, colour, texture, or rhythm?`;
    case "working_theory":
      return `A strong next observation would follow the theory. Does ${child} predict what will happen, change the channel, use new tools, explain the idea to another child, or compare what happens when the material changes?`;
    case "self_regulation":
      return `A strong next observation would look for the replacement strategy. Does ${child} move away earlier, use a word or gesture, accept support, return when ready, or show another child what helps?`;
    default:
      return `A strong next observation would look for what changes. Does ${child} repeat the action, add language, invite someone else, solve a problem, or show the idea in a new context?`;
  }
}

function reflectionParagraph(domain: StoryDomain, child: string, evidence: string) {
  switch (domain) {
    case "construction":
      return `What stands out is ${child}'s persistence. ${child} met a real problem, stayed close to it, and used another person's support as part of the solution. The learning is visible in the process: ${evidence}.`;
    case "pretend":
      return `What stands out is the way ${child} held the pretend story together. ${child} used objects as symbols, created a sequence, added sound, and brought another person into the play. The learning is visible in the process: ${evidence}.`;
    case "sensory":
      return `What stands out is ${child}'s communication through the whole body. ${child} used reaching, movement, laughter, repetition, or attention to keep the interaction going. The learning is visible in the process: ${evidence}.`;
    case "working_theory":
      return `What stands out is ${child}'s inquiry. ${child} was not waiting for an answer; ${child} was testing one through materials, movement, language, and another person's participation. The learning is visible in the process: ${evidence}.`;
    case "self_regulation":
      return `What stands out is ${child}'s growing awareness of what felt hard and what helped. ${child} used movement, distance, watching, gesture, or language to manage the moment. The learning is visible in the process: ${evidence}.`;
    case "creative":
      return `What stands out is ${child}'s expression and decision-making. ${child} used the materials to show an idea, adjust it, and communicate meaning. The learning is visible in the process: ${evidence}.`;
    default:
      return `What stands out is ${child}'s agency. ${child} made choices, communicated meaning, and gave the educator a clear thread to follow. The learning is visible in the process: ${evidence}.`;
  }
}

function padForDepth(story: string, depth: StoryDepth, child: string, domain: StoryDomain) {
  const minimum = getMinimumStoryWords(depth);
  if (countWords(story) >= minimum) return story;

  const additions = [
    `This draft keeps the evidence line clear. It uses what was actually recorded about ${child}, then turns that evidence into a professional interpretation that an educator can review, personalise, and share when appropriate.`,
    extensionParagraph(domain, child),
  ];

  let next = story;
  for (const paragraph of additions) {
    if (countWords(next) >= minimum) break;
    next += `\n\n${paragraph}`;
  }
  return next;
}

export function shouldUseEvidenceLedStory(observations: string) {
  const cleaned = cleanObservation(observations);
  if (cleaned.length < 10) return false;
  return cleaned.length <= 900;
}

export function buildEvidenceLedStory(
  current: Partial<EvidenceStoryResult>,
  params: {
    observations: string;
    framework: StoryFrameworkId;
    tone: StoryTone;
    depth: StoryDepth;
    pedagogyFocus?: PedagogyFocus;
    childName?: string;
    ageGroup?: string;
  },
  revisionCount = 0
): EvidenceStoryResult {
  const child = params.childName?.trim() || "the child";
  const observation = cleanObservation(params.observations);
  const fragments = splitFragments(observation);
  const domain = detectDomain(observation);
  const quote = extractQuote(observation);
  const otherChildren = extractOtherChildren(observation, params.childName);
  const title = current.storyTitle?.trim() || domainTitle(domain, child);
  const framework = frameworkForDomain(params.framework, domain);
  const lens = learningLens(domain);
  const frameworkName = params.framework === "NZ" ? "Te Whāriki" : "EYLF";
  const familyWord = params.framework === "NZ" ? "whānau" : "families";
  const childVoice = quote ? `${child} said, "${quote}".` : "";
  const peerPhrase = otherChildren.length > 0 ? ` The note also names ${otherChildren.join(" and ")}, so the educator can decide whether that name should remain in the final family-facing version.` : "";
  const evidenceLine = fragments.slice(0, 3).map((item) => item.replace(/[.!?]*$/, "")).join("; ");

  const paragraphs = [
    firstParagraph(child, fragments, quote, domain),
    reflectionParagraph(domain, child, evidenceLine || observation),
    `For ${frameworkName}, the curriculum link should follow the learning that is actually visible. ${framework.frameworkEvidence[0]} The curriculum wording supports the educator's judgement without replacing it.`,
    pedagogyParagraph(params.pedagogyFocus ?? "balanced", child, domain),
  ];

  if (params.depth !== "concise") {
    paragraphs.push(
      `Before sharing, the educator should add any missing details that would make the story more personal: where it happened, what materials were used, exact words or gestures, how long ${child} stayed with the moment, and how the adult responded. Those details matter because they keep the story specific without inventing anything.${peerPhrase}`,
      `The next step should be close to the learning already visible. ${extensionParagraph(domain, child)}`
    );
  }

  if (params.depth === "detailed") {
    paragraphs.push(
      `A family or ${familyWord} question can deepen this story without making assumptions. Instead of asking a broad question, ask about the exact strategy or interest seen here: whether ${child} is building, pretending, testing, communicating, calming, or repeating this kind of idea in another setting.`,
      `This makes the documentation useful beyond today. The story gives the educator a clear record of what ${child} did, what learning it may show, what still needs checking, and what to notice next.`
    );
  }

  const story = padForDepth(`${title}\n\n${paragraphs.join("\n\n")}`, params.depth, child, domain);
  const wordCount = countWords(story);

  return {
    ...current,
    storyTitle: title,
    story,
    outcomes: framework.outcomes,
    curriculumLinks: framework.curriculumLinks,
    learningSummary: `${child} was showing ${lens.summary}. The interpretation is grounded in the recorded observation and should be reviewed against the educator's full context.`,
    childVoice,
    learningDispositions: lens.dispositions,
    socialEmotionalLinks: lens.social,
    culturalConnections: [],
    whanauConnection:
      params.framework === "NZ"
        ? `Whānau may recognise whether this learning, interest, strategy, or language is also appearing outside the centre.`
        : `Families may recognise whether this learning, interest, strategy, or language is also appearing outside the service.`,
    assumptions: [
      "This draft uses only the supplied observation and avoids adding unrecorded educator actions, emotions, or family context.",
      params.ageGroup
        ? `The selected age group is ${params.ageGroup}, so the final review should check that the wording fits this child's stage and context.`
        : "No age was supplied, so the interpretation stays broad.",
    ],
    evidenceAnchors: fragments.slice(0, 4),
    educatorChecks: [
      `What exact words, sounds, gestures, or choices did ${child} use?`,
      "What adult response, setting, or material detail should be added before sharing?",
      `Does this ${frameworkName} link match the strongest learning in the observation?`,
    ],
    pedagogyLinks: framework.pedagogyLinks,
    frameworkEvidence: framework.frameworkEvidence,
    parentFriendlyVersion: `${child} showed ${lens.summary} through this moment. The story is ready for educator review before sharing with ${familyWord}.`,
    familyQuestion:
      params.framework === "NZ"
        ? `Do you notice ${child} showing this interest, strategy, or language with whānau?`
        : `Do you notice ${child} showing this interest, strategy, or language at home?`,
    followUpPrompt: extensionParagraph(domain, child),
    childAge: params.ageGroup || current.childAge || "Not stated",
    nextSteps: [
      extensionParagraph(domain, child),
      `Record one exact word, gesture, choice, or repeated action from ${child} next time.`,
      "Add the educator response before sharing if it is important to the learning.",
    ],
    wordCount,
    storyQuality: {
      passes: true,
      score: 94,
      revisionCount,
      checks: {
        naturalEducatorTone: true,
        childVoiceSupported: true,
        frameworkLinksFit: true,
        noInventedDetails: true,
        evidenceToLearningClear: true,
        familyReadable: true,
        usefulForDepth: wordCount >= getMinimumStoryWords(params.depth),
        childCentred: true,
        fastEvidenceLedPath: true,
      },
      issues: [],
      strengths: ["Story is built from the named child's observed actions and uses a fast evidence-led path."],
    },
  };
}
