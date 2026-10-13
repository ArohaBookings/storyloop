import type { PedagogyFocus, StoryDepth, StoryFrameworkId, StoryPreferences, StoryTone } from "../../lib/story-options";

/** A spread of real-world inputs for the AU and NZ prompt snapshot. Never edit existing cases; add new ones only with a fresh snapshot. */
export function auNzPromptCases() {
  const notes = {
    sparse: "billy playdough",
    moderate: "Mia (3) built a tower with the big blocks, it fell, she built it again wider at the bottom.",
    rich: "Grace spent nearly 40 minutes on the marble run this morning. She started with two ramps and a funnel, but the marble kept falling off at the join. She tried taping it, which did not work, then moved the second ramp lower so it sat under the first. When it worked she called out \"Look, it goes all the way now!\" Then Harvey came over and they took turns.",
    conflict: "Sam pushed Josh at the sandpit and Josh cried. We talked about safe hands.",
  };
  const tones: StoryTone[] = ["natural", "warm", "professional", "simple"];
  const depths: StoryDepth[] = ["concise", "balanced", "detailed"];
  const focuses: PedagogyFocus[] = ["balanced", "intentional_teaching", "child_voice", "family_partnership", "working_theories"];
  const frameworks: StoryFrameworkId[] = ["AU", "NZ"];
  const cases: Array<{
    id: string; framework: StoryFrameworkId; observations: string; ageGroup?: string; childName?: string; tone: StoryTone;
    preferences: StoryPreferences; childContext?: string; educatorNames?: string[];
  }> = [];
  let i = 0;
  for (const framework of frameworks) {
    for (const [noteKey, observations] of Object.entries(notes)) {
      for (const tone of tones) {
        const depth = depths[i % depths.length];
        const focus = focuses[i % focuses.length];
        const rich = i % 2 === 0;
        cases.push({
          id: `${framework}-${noteKey}-${tone}-${depth}-${focus}-${rich ? "rich" : "plain"}`,
          framework,
          observations,
          ageGroup: ["0-1 years", "1-2 years", "3-4 years", undefined][i % 4],
          childName: rich ? "Mia" : undefined,
          tone,
          preferences: rich
            ? {
                defaultFramework: framework,
                preferredTone: tone,
                depthPreference: depth,
                includeTeReoLevel: (["low", "medium", "high"] as const)[i % 3],
                includeKowhitiWhakapae: i % 3 === 0,
                includeTapasa: i % 4 === 0,
                pedagogyFocus: focus,
                centrePhilosophy: "We follow children's interests and value outdoor play.",
                likedPhrases: ["we noticed"],
                avoidedPhrases: ["amazing"],
                privacyRules: ["No surnames"],
                emphasis: ["child voice"],
                notes: "Keep it short",
              }
            : { depthPreference: depth, pedagogyFocus: focus },
          childContext: rich ? "Interests: blocks, water play. Family aspiration: confidence with peers." : undefined,
          educatorNames: rich ? ["Sarah", "Moana"] : undefined,
        });
        i += 1;
      }
    }
  }
  return cases;
}
