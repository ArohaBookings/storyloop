import assert from "node:assert/strict";
import test from "node:test";
import { buildEvidenceLedStory } from "../lib/ai/evidence-story";
import { buildPhysicalSafetyFallbackStory } from "../lib/ai/physical-safety-story";
import {
  enforceFrameworkForResult,
  getUnsupportedStoryDetails,
  inspectStoryQuality,
  resultHasFrameworkLeak,
} from "../lib/ai/quality-guards";
import { runPrivacyGuardian } from "../lib/privacy-guardian";
import { hasPhysicalSafetyIncident } from "../lib/safety-incident";
import { getStoryClarification } from "../lib/story-clarification";
import { inferPrimaryChildName } from "../lib/story-context";

type MatrixCase = {
  label: string;
  observation: string;
  framework?: "AU" | "NZ";
  depth?: "concise" | "balanced" | "detailed";
  child?: string;
  kind?: "ready" | "thin_observation" | "safety_review";
  privacy?: "clear" | "review" | "high";
};

const cases: MatrixCase[] = [
  {
    label: "AU water working theory with peer collaboration",
    observation:
      'Ariana, aged 3, filled a small jug at the water trough and poured it into a clear container. When it spilled, she said "we needs a bigga bucket". Ariana asked Luca to hold the funnel, poured more slowly, and said "we did it" when the water stayed inside.',
    child: "Ariana",
  },
  {
    label: "NZ block engineering and persistence",
    observation:
      'Mia (4) stacked wooden blocks on the mat. The tower fell twice, so Mia widened the base, asked Hana to steady one side, and said "now it can stand" when it stayed up.',
    child: "Mia",
    framework: "NZ",
  },
  {
    label: "AU infant joint attention",
    observation:
      "Noah (10 months) reached for the red scarf during morning floor play, waved both arms when it moved, then paused and watched the educator copy his movement. Noah laughed and reached again.",
    child: "Noah",
  },
  {
    label: "NZ infant sound exchange",
    observation:
      'Aroha (11 months) tapped a metal cup with a spoon at the table, stopped when the sound stopped, then tapped again. She watched the kaiako and babbled "ba ba" when the sound was copied.',
    child: "Aroha",
    framework: "NZ",
  },
  {
    label: "AU toddler self help",
    observation:
      'Leo (2) carried his lunchbox to the table, opened the zip after three tries, and said "I do it". He placed the lid beside his plate and asked for help only when the clasp stayed closed.',
    child: "Leo",
  },
  {
    label: "NZ toddler dressing",
    observation:
      "Ihaia (2) sat by the cubbies after outdoor play, pulled one gumboot off, turned the other foot, and tried again. He pointed to the heel, waited while the kaiako loosened it, then finished pulling it off.",
    child: "Ihaia",
    framework: "NZ",
  },
  {
    label: "AU pretend cafe sequence",
    observation:
      'Sophie (4) arranged cups in the home corner, wrote marks on a notepad, and asked Priya "tea or coffee?" She carried the order to the table, returned for a spoon, and swapped roles when Priya asked.',
    child: "Sophie",
  },
  {
    label: "NZ pretend marae kai",
    observation:
      "Wiremu (4) used playdough in the home corner to make pretend kai, placed pieces on three plates, invited Maia to the table, and explained which plate was for the manuhiri.",
    child: "Wiremu",
    framework: "NZ",
  },
  {
    label: "AU clay representation",
    observation:
      'Zara (3) rolled clay into three long pieces at the art table, joined them in a circle, and said "it is my garden". She added small clay dots, changed one into a gate, and showed it to Sam.',
    child: "Zara",
  },
  {
    label: "NZ paint colour comparison",
    observation:
      "Kauri (3) painted blue over yellow at the easel, stopped to look at the green area, then mixed the same colours in a cup. He pointed to both greens and asked the kaiako to look.",
    child: "Kauri",
    framework: "NZ",
  },
  {
    label: "AU mark making and name",
    observation:
      'Evie (4) wrote a row of curved marks beside her drawing at the table, pointed to the first letter, and said "that is E for Evie". She checked her name card and added another E.',
    child: "Evie",
  },
  {
    label: "NZ shared book retell",
    observation:
      "Tama (4) returned to the same picture book after morning tea, pointed to the storm page, retold what happened using the pictures, and invited Hemi to turn the pages while he continued.",
    child: "Tama",
    framework: "NZ",
  },
  {
    label: "AU counting with loose parts",
    observation:
      'Ruby (4) lined shells along the table, counted "one, two, three, four, five", noticed one shell was left, moved it to a second row, and counted both rows again.',
    child: "Ruby",
  },
  {
    label: "NZ pattern making",
    observation:
      "Anahera (4) placed red and black buttons in alternating rows at the collage table. When two red buttons sat together, she stopped, swapped one, and explained that the colours needed to take turns.",
    child: "Anahera",
    framework: "NZ",
  },
  {
    label: "AU ramp investigation",
    observation:
      "Oscar (3) rolled two cars down a wooden ramp, moved one ramp block higher, and watched which car reached the floor first. He repeated the test and asked Maya to release a car with him.",
    child: "Oscar",
  },
  {
    label: "NZ mud channel investigation",
    observation:
      'Mere (4) dug a channel in the garden, poured water at one end, and watched it stop at a clump of soil. She moved the soil, poured again, and said "now the river goes".',
    child: "Mere",
    framework: "NZ",
  },
  {
    label: "AU worm care",
    observation:
      "Finn (4) found a worm beside the garden path, called two friends over, moved a leaf beside it, and explained that feet needed to stay back. He watched until the worm moved under the soil.",
    child: "Finn",
  },
  {
    label: "NZ leaf sorting",
    observation:
      "Ria (3) collected leaves outside, sorted them into big and small groups on the mat, moved one leaf after comparing it with another, and asked the kaiako where a curled leaf belonged.",
    child: "Ria",
    framework: "NZ",
  },
  {
    label: "AU music rhythm",
    observation:
      "Arlo (3) tapped a drum during music, stopped when the song paused, then started on the next beat. He watched Nia's pattern, copied two taps, and added one louder tap.",
    child: "Arlo",
  },
  {
    label: "NZ dance leadership",
    observation:
      'Moana (4) chose a waiata during group music, showed the arm movement to two tamariki, waited while they copied it, and said "now together" before beginning again.',
    child: "Moana",
    framework: "NZ",
  },
  {
    label: "AU ball trajectory",
    observation:
      "Eli (3) rolled a ball toward three cardboard tubes outside, moved closer after the first roll missed, and changed the angle on the next try. He called Ava to watch when two tubes fell.",
    child: "Eli",
  },
  {
    label: "NZ scooter balance",
    observation:
      "Nikau (4) pushed a scooter slowly along the outdoor path, stopped before the corner, moved one foot onto the deck, and tried the turn again. He asked for the cone to be moved wider.",
    child: "Nikau",
    framework: "NZ",
  },
  {
    label: "AU puzzle strategy",
    observation:
      "Grace (3) turned a puzzle piece three times at the table, compared its picture with the board, and moved it to another space. When it fitted, she smiled and returned to the piece she had set aside.",
    child: "Grace",
  },
  {
    label: "NZ magnetic tiles symmetry",
    observation:
      "Pita (4) built with magnetic tiles on the mat, placed matching squares on each side, noticed one side leaned, and adjusted the base. He invited Ari to compare both sides.",
    child: "Pita",
    framework: "NZ",
  },
  {
    label: "AU peer turn negotiation",
    observation:
      'Isla (4) waited beside the swing, asked Max "how many turns?", counted five pushes aloud, and moved forward when he stopped. She offered him the next turn after her count.',
    child: "Isla",
  },
  {
    label: "NZ collaborative train track",
    observation:
      "Hana (4) joined a train track with Tui on the mat, noticed the final pieces did not meet, moved one curve, and asked Tui to swap a straight piece. They tested the train after the track joined.",
    child: "Hana",
    framework: "NZ",
  },
  {
    label: "AU helping younger child",
    observation:
      "Ben (4) noticed a younger child reaching for a bucket in the sandpit, carried it closer, held it while the child scooped sand, and waited until the child took the handle.",
    child: "Ben",
  },
  {
    label: "NZ conflict repair with words",
    observation:
      'Keira (4) reached for the same paintbrush as Maia, stopped when Maia said "I am using it", chose another brush, and later offered Maia the blue paint when she finished.',
    child: "Keira",
    framework: "NZ",
  },
  {
    label: "AU family recipe connection",
    observation:
      'Amir (4) stirred flour and water during cooking, told the group "my nana makes bread", compared the sticky dough with the dry flour, and asked to save a piece to show his family.',
    child: "Amir",
  },
  {
    label: "NZ home language connection",
    observation:
      "Lani (3) pointed to the moon in a book, used the word her family uses at home, repeated it when the kaiako responded, and invited Sina to say the word with her.",
    child: "Lani",
    framework: "NZ",
  },
  {
    label: "AU community role play",
    observation:
      "Mateo (4) pretended to drive a bus in the outdoor area, arranged chairs in two rows, made tickets from paper, and asked each child where they wanted to stop.",
    child: "Mateo",
  },
  {
    label: "NZ family photo storytelling",
    observation:
      "Sela (3) carried her family photo to the book corner, pointed to three people, told the kaiako where they were standing, and returned to the photo when another child asked about it.",
    child: "Sela",
    framework: "NZ",
  },
  {
    label: "AU sensory regulation choice",
    observation:
      "Chloe (3) covered her ears when the music became loud, moved to the quiet corner, watched the group, and returned holding the educator's hand when the song became softer.",
    child: "Chloe",
  },
  {
    label: "NZ sensory communication",
    observation:
      'Rangi (2) stopped near the busy group, pointed to the quiet room, and said "too loud". He walked there with the kaiako, chose a cushion, and returned when he was ready.',
    child: "Rangi",
    framework: "NZ",
  },
  {
    label: "AU emotional persistence",
    observation:
      "Tahlia (4) frowned when the collage strip tore, placed it beside the paper, chose a wider strip, and tried again. She asked the educator to hold one end while she glued the other.",
    child: "Tahlia",
  },
  {
    label: "NZ dramatic play negotiation",
    observation:
      "Ari (4) pretended the couch was a waka, invited two tamariki aboard, listened when Kiri wanted to steer, and suggested they swap roles after reaching the other side of the room.",
    child: "Ari",
    framework: "NZ",
  },
  {
    label: "AU gardening responsibility",
    observation:
      "Maya (4) carried the small watering can to the garden, checked the soil with one finger, watered only the dry pot, and explained to Leo why she skipped the wet one.",
    child: "Maya",
  },
  {
    label: "NZ cooking measurement",
    observation:
      "Theo (4) filled a half cup twice during cooking, tipped both amounts into the bowl, and compared them with one full cup. He counted each scoop while Isla stirred.",
    child: "Theo",
    framework: "NZ",
  },
  {
    label: "AU shadow inquiry",
    observation:
      "Ava (4) traced her shadow outside with chalk, returned after lunch, noticed the shadow had moved, and asked Noah to stand on the first outline while she traced the new one.",
    child: "Ava",
  },
  {
    label: "NZ ice melting theory",
    observation:
      'Maea (3) carried two ice cubes outside, placed one in shade and one in sun, watched the sunny cube shrink, and said "this one is going fast". She checked both again after morning tea.',
    child: "Maea",
    framework: "NZ",
  },
  {
    label: "AU loose parts bridge",
    observation:
      "Henry (4) placed planks between two crates outside, tested the bridge with a toy truck, moved the crates closer when the plank slipped, and asked Mila to hold the truck.",
    child: "Henry",
  },
  {
    label: "NZ weaving persistence",
    observation:
      "Kiri (4) threaded paper strips over and under at the art table, stopped when two strips sat the same way, pulled one out, and tried the alternating pattern again.",
    child: "Kiri",
    framework: "NZ",
  },
  {
    label: "AU detailed scientific drawing",
    observation:
      "Lucy (4) examined a snail in the garden, drew its shell and two feelers at the table, returned outside to compare her picture, and added a line for the trail.",
    child: "Lucy",
    depth: "detailed",
  },
  {
    label: "NZ concise baby mirror play",
    observation:
      "Matiu (9 months) reached toward his reflection during floor play, touched the mirror, looked toward the kaiako, then smiled and tapped the glass twice.",
    child: "Matiu",
    framework: "NZ",
    depth: "concise",
  },
  {
    label: "AU resolved push with educator response",
    observation:
      'Jack (4) pushed Leo when both reached for the same truck. Leo cried. The educator moved between them, checked Leo, named "pushing is not safe", and helped Jack ask for a turn.',
    child: "Jack",
    privacy: "review",
  },
  {
    label: "NZ resolved bite with kaiako response",
    observation:
      "Mika (2) bit another child during a toy conflict and the child cried. The kaiako separated them, checked the child, stayed with Mika, and modelled a help gesture before play resumed.",
    child: "Mika",
    framework: "NZ",
    privacy: "review",
  },
  {
    label: "AU rough play stopped safely",
    observation:
      'Cooper (4) kicked another child during rough outdoor play. The educator stopped the game, checked both children, named "feet stay safe", and guided Cooper to ask before restarting.',
    child: "Cooper",
    privacy: "review",
  },
  {
    label: "NZ scratch conflict with repair",
    observation:
      "Tui (3) scratched Ari during a conflict over a spade. The kaiako moved the children apart, checked Ari, comforted both children, and helped Tui return the spade and use a turn-taking phrase.",
    child: "Tui",
    framework: "NZ",
    privacy: "review",
  },
  {
    label: "AU unsafe shove with response",
    observation:
      "Sienna (4) shoved another child near the block area and the child was upset. The teacher moved the blocks, checked the child, sat with Sienna, and modelled how to ask for space.",
    child: "Sienna",
    privacy: "review",
  },
  {
    label: "NZ hit peer with response",
    observation:
      "Hemi (3) hit a peer during shared train play and the peer cried. The educator separated them, checked the peer, helped Hemi calm, and practised the words stop and help.",
    child: "Hemi",
    framework: "NZ",
    privacy: "review",
  },
  {
    label: "thin test note",
    observation: "test test test",
    kind: "thin_observation",
  },
  {
    label: "thin vague outdoor note",
    observation: "Kids played outside and had fun today.",
    kind: "thin_observation",
  },
  {
    label: "thin activity label",
    observation: "Ella enjoyed painting.",
    child: "Ella",
    kind: "thin_observation",
  },
  {
    label: "thin no concrete signal",
    observation: "Sam was very engaged and happy.",
    child: "Sam",
    kind: "thin_observation",
  },
  {
    label: "ambiguous push without response",
    observation: "Jack pushed Leo near the truck and Leo cried.",
    child: "Jack",
    kind: "safety_review",
    privacy: "review",
  },
  {
    label: "ambiguous bite without response",
    observation: "Mika bit another child during play and the child was upset.",
    child: "Mika",
    framework: "NZ",
    kind: "safety_review",
    privacy: "review",
  },
  {
    label: "diagnosis wording flagged",
    observation:
      "Lily (4) sorted picture cards at the table, changed her groups twice, and explained her choices. The note says she has ADHD and is advanced.",
    child: "Lily",
    privacy: "high",
  },
  {
    label: "sensitive family detail flagged",
    observation:
      "Nora (4) drew her family at the art table, named each person, changed the colours, and explained the picture. The note also mentions a custody court case.",
    child: "Nora",
    privacy: "high",
  },
  {
    label: "clinical language flagged",
    observation:
      "Max (3) lined cars along the mat, counted them, moved two into a second row, and compared the rows. The note describes a developmental delay diagnosis.",
    child: "Max",
    privacy: "high",
  },
  {
    label: "medical family detail flagged",
    observation:
      "Ava (4) read a book in the quiet corner, pointed to repeated words, and retold the ending. The rough note includes private medication and medical information.",
    child: "Ava",
    privacy: "high",
  },
  {
    label: "adult conduct safeguarding flag",
    observation:
      "Poppy (4) built a tower at the block table, changed the base, and tried again after it fell. I then hit Poppy and she cried.",
    child: "Poppy",
    kind: "safety_review",
    privacy: "high",
  },
  {
    label: "excess identifier review",
    observation:
      "Jude (4) wrote a letter at the table, copied two words from a card, and read them back. The rough note includes his address, phone number, and date of birth.",
    child: "Jude",
    privacy: "review",
  },
];

test(`story quality matrix covers ${cases.length} observation types`, async (t) => {
  assert.ok(cases.length >= 50, `expected at least 50 cases, got ${cases.length}`);

  for (const item of cases) {
    await t.test(item.label, () => {
      const framework = item.framework ?? "AU";
      const depth = item.depth ?? "balanced";
      const inferredChild = inferPrimaryChildName(item.observation);
      if (item.child) assert.equal(inferredChild, item.child);

      const clarification = getStoryClarification({
        observations: item.observation,
        childName: inferredChild || null,
      });
      assert.equal(clarification.kind, item.kind ?? "ready");
      assert.equal(clarification.needsClarification, (item.kind ?? "ready") !== "ready");

      const guardian = runPrivacyGuardian({ observation: item.observation });
      assert.equal(guardian.status, item.privacy ?? "clear");

      if (clarification.needsClarification || guardian.status === "high") return;

      const params = {
        observations: item.observation,
        childName: inferredChild || undefined,
        framework,
        depth,
        tone: "natural" as const,
      };
      const raw = hasPhysicalSafetyIncident(item.observation)
        ? buildPhysicalSafetyFallbackStory({}, params, [], 0)
        : buildEvidenceLedStory({}, params);
      const story = enforceFrameworkForResult(raw, framework);
      const checks = inspectStoryQuality(story, params);

      assert.equal(resultHasFrameworkLeak(story, framework), false);
      assert.deepEqual(getUnsupportedStoryDetails(story, item.observation), []);
      assert.equal(checks.frameworkLinksFit, true);
      assert.equal(checks.noInventedDetails, true);
      assert.equal(checks.evidenceToLearningClear, true);
      assert.equal(checks.requiredSectionsPresent, true);
      assert.equal(checks.noMetaCommentary, true);
      assert.equal(checks.noAiDashPunctuation, true);
      assert.equal(checks.focusChildMaintained, true);
      assert.equal(checks.usefulForDepth, true);
      assert.ok(story.outcomes.length > 0);
      assert.ok(story.curriculumLinks.length > 0);
      assert.ok(story.nextSteps.length > 0);
      assert.ok(story.educatorChecks.length > 0);
    });
  }
});
