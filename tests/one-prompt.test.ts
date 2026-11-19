import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PROMPT_ORDER,
  STORY_CARDS,
  claimPrompt,
  mayShowPrompt,
  promptOnScreen,
  reviewCopyCounts,
  type PromptSlot,
  type PromptsWanted,
  type StoryPrompt,
} from "../lib/one-prompt";

/**
 * One prompt at a time, one card per story (release decision, 19 Nov 2026), in
 * one place (lib/one-prompt.ts): the wall above all; her first story gets the
 * next-story card; then the upgrade prompts; her second or later story gets
 * "Send this to my leader" (once ever); otherwise the review ask at Copy; the
 * price reminder line never beside anything. Written as what she sees.
 */

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const on = (wanted: PromptsWanted, storyId = A, slot: PromptSlot = null) => ({ wanted, storyId, slot });

test("the order: the wall, the next story, upgrade, her leader, the review ask, the price line", () => {
  assert.deepEqual([...PROMPT_ORDER], ["wall", "next_story", "upgrade", "leader_card", "review_ask", "price_reminder"]);
  assert.deepEqual([...STORY_CARDS], ["next_story", "leader_card", "review_ask"]);
  assert.equal(promptOnScreen(on({})), null, "nothing wants it: nothing shows");
  assert.equal(promptOnScreen(on({ review_ask: true })), "review_ask");
  assert.equal(promptOnScreen(on({ wall: true, review_ask: true })), "wall", "the wall comes first");
  assert.equal(promptOnScreen(on({ next_story: true, upgrade: true })), "next_story", "the next-story card before an upgrade prompt");
  assert.equal(promptOnScreen(on({ upgrade: true, review_ask: true })), "upgrade", "the review ask waits for the upgrade prompt");
  assert.equal(promptOnScreen(on({ upgrade: true, leader_card: true })), "upgrade", "the leader card waits for the upgrade prompt");
  assert.equal(promptOnScreen(on({ next_story: true, leader_card: true, review_ask: true })), "next_story");
  assert.equal(promptOnScreen(on({ leader_card: true, review_ask: true })), "leader_card");
  assert.equal(promptOnScreen(on({ wall: false, upgrade: false, review_ask: true })), "review_ask", "a prompt that does not want the screen holds nothing back");
});

test("of any two prompts that want the screen, exactly one may show", () => {
  for (const a of PROMPT_ORDER) {
    for (const b of PROMPT_ORDER) {
      if (a === b) continue;
      const screen = on({ [a]: true, [b]: true });
      const showing = PROMPT_ORDER.filter((prompt) => screen.wanted[prompt] && mayShowPrompt(prompt, screen));
      assert.equal(showing.length, 1, `${a} and ${b}: one at a time`);
      assert.equal(showing[0], PROMPT_ORDER.indexOf(a) < PROMPT_ORDER.indexOf(b) ? a : b);
    }
  }
  const everything = on(Object.fromEntries(PROMPT_ORDER.map((prompt) => [prompt, true])) as Record<StoryPrompt, boolean>);
  assert.deepEqual(PROMPT_ORDER.filter((prompt) => mayShowPrompt(prompt, everything)), ["wall"], "all at once: the wall alone");
});

test("the review ask waits while another prompt is up, and may show once it has gone", () => {
  assert.equal(mayShowPrompt("review_ask", on({ upgrade: true })), false, "not beside '1 free story left this month'");
  assert.equal(mayShowPrompt("review_ask", on({ next_story: true })), false, "not beside the next-story card");
  assert.equal(mayShowPrompt("review_ask", on({ wall: true })), false, "not beside the wall");
  assert.equal(mayShowPrompt("review_ask", on({ wall: false, next_story: false, upgrade: false })), true, "once they are closed, it may");
  assert.equal(mayShowPrompt("price_reminder", on({ review_ask: true })), false, "the price line never shows beside another prompt");
  assert.equal(mayShowPrompt("wall", on({ next_story: true, upgrade: true, review_ask: true })), true, "the wall is never held back");
});

test("her second story, copied: the leader card, and the review ask waits for another story", () => {
  let slot: PromptSlot = null;
  assert.equal(promptOnScreen(on({ leader_card: true, review_ask: true }, A, slot)), "leader_card");
  slot = claimPrompt(slot, A, "leader_card");
  assert.equal(mayShowPrompt("review_ask", on({}, A, slot)), false, "never two prompts on one screen");
  assert.equal(mayShowPrompt("leader_card", on({}, A, slot)), true, "the card that holds the slot stays");
  // She closes the card: the slot is still taken for this story (one card per story).
  assert.equal(promptOnScreen(on({ review_ask: true }, A, slot)), null);
  // The next story on screen has a slot of its own.
  assert.equal(mayShowPrompt("review_ask", on({}, B, slot)), true);
  assert.equal(promptOnScreen(on({ review_ask: true }, B, slot)), "review_ask");
});

test("the first card to take a story's slot keeps it", () => {
  const held = claimPrompt(null, A, "review_ask");
  assert.deepEqual(held, { storyId: A, prompt: "review_ask" });
  assert.deepEqual(claimPrompt(held, A, "leader_card"), held, "a card that arrives later does not take it over");
  assert.equal(mayShowPrompt("leader_card", on({}, A, held)), false, "and does not even ask");
  assert.deepEqual(claimPrompt(held, B, "leader_card"), { storyId: B, prompt: "leader_card" }, "a new story starts free");
  assert.equal(claimPrompt(null, A, "upgrade"), null, "only story cards take a slot");
  assert.equal(claimPrompt(null, A, "wall"), null);
});

test("the wall and the upgrade prompts are never held back by a story's slot", () => {
  const held = claimPrompt(null, A, "leader_card");
  assert.equal(mayShowPrompt("wall", on({}, A, held)), true);
  assert.equal(mayShowPrompt("upgrade", on({}, A, held)), true);
});

test("no story, no story card", () => {
  assert.equal(promptOnScreen(on({ leader_card: true }, "")), null);
  assert.equal(mayShowPrompt("leader_card", on({}, "")), false);
  assert.equal(mayShowPrompt("review_ask", on({}, "")), false);
  assert.equal(claimPrompt(null, "", "leader_card"), null);
});

test("the price reminder line never shows beside a card", () => {
  assert.equal(mayShowPrompt("price_reminder", on({}, "")), true, "the empty note screen, nothing else showing");
  assert.equal(mayShowPrompt("price_reminder", on({}, A)), true);
  assert.equal(mayShowPrompt("price_reminder", on({}, A, { storyId: A, prompt: "leader_card" })), false);
  assert.equal(mayShowPrompt("price_reminder", on({}, A, { storyId: A, prompt: "review_ask" })), false);
  assert.equal(mayShowPrompt("price_reminder", on({}, "", { storyId: A, prompt: "leader_card" })), true, "the card's story is gone from the screen");
  assert.equal(mayShowPrompt("price_reminder", on({}, B, { storyId: A, prompt: "leader_card" })), true);
  assert.equal(mayShowPrompt("price_reminder", on({ upgrade: true }, "")), false);
  assert.equal(mayShowPrompt("price_reminder", on({ wall: true }, "")), false);
});

test("at a copy, the leader card is asked first; the review ask follows only a story it declined", () => {
  assert.equal(reviewCopyCounts(on({}), "unknown"), "wait");
  assert.equal(reviewCopyCounts(on({}), "declined"), "count");
  assert.equal(reviewCopyCounts(on({}), "shown"), "skip");
  assert.equal(reviewCopyCounts(on({ upgrade: true }), "declined"), "skip", "a copy made while another prompt is up does not bring the ask");
  assert.equal(reviewCopyCounts(on({}, A, { storyId: A, prompt: "leader_card" }), "declined"), "skip");
  assert.equal(reviewCopyCounts(on({}, ""), "declined"), "skip");
});

test("the story page and Story history ask this one place before they show any of them", () => {
  const page = readFileSync(new URL("../app/(app)/generate/page.tsx", import.meta.url), "utf8");
  for (const prompt of ["next_story", "upgrade", "leader_card", "review_ask", "price_reminder"]) {
    assert.ok(page.includes(`mayShowPrompt("${prompt}", promptScreen)`), `${prompt} goes through lib/one-prompt.ts on /generate`);
  }
  assert.match(page, /const promptScreen = \{ wanted: promptsWanted, storyId, slot: promptSlot \};/);
  assert.match(page, /reviewCopyCounts\(promptScreen, leaderAnswers\.current\.get\(storyId\) \?\? "unknown"\)/, "a copy counts toward the ask only through the rule");
  assert.match(page, /onCopied=\{noteReviewCopy\}/, "copy pack copies too");
  assert.equal(/priceReminderMayShow|promptsWanted\)/.test(page), false, "no prompt decides for itself");

  const history = readFileSync(new URL("../components/app/StoryHistoryItem.tsx", import.meta.url), "utf8");
  for (const prompt of ["leader_card", "review_ask"]) {
    assert.ok(history.includes(`mayShowPrompt("${prompt}", promptScreen)`), `${prompt} goes through lib/one-prompt.ts in Story history`);
  }
  assert.match(history, /onCopied=\{noteReviewCopy\}/);
  assert.equal(/setReviewCopies\(\(n\) => n \+ 1\)\}/.test(history), false, "no copy counts outside the rule");
});

test("R2-01: the What's new and referral card never opens on a checkout return, a welcome or a kept story", async () => {
  const { layoutCardMayOpen } = await import("../lib/one-prompt");
  assert.equal(layoutCardMayOpen("https://storyloop.space/generate?upgraded=true&plan=educator&session_id=cs_1"), false);
  assert.equal(layoutCardMayOpen("https://storyloop.space/statement?checkout=cancelled&plan=educator"), false);
  assert.equal(layoutCardMayOpen("https://storyloop.space/dashboard?upgraded=true&plan=centre_starter"), false);
  assert.equal(layoutCardMayOpen("https://storyloop.space/generate?welcome=1"), false);
  assert.equal(layoutCardMayOpen("https://storyloop.space/generate", true), false, "a kept story is arriving");
  assert.equal(layoutCardMayOpen("https://storyloop.space/history"), true, "an ordinary visit");
  const modal = readFileSync(new URL("../components/app/WhatsNewModal.tsx", import.meta.url), "utf8");
  const effect = modal.slice(modal.indexOf("useEffect(() => {"), modal.indexOf('fetch("/api/whats-new")'));
  assert.match(effect, /if \(!layoutCardMayOpen\(navigation\?\.name \|\| window\.location\.href, Boolean\(readKeptStory\(\{ includeUnconfirmed: true \}\)\)\)\) return;/, "checked before it asks the server or marks anything seen");
});

test("R2-00 and R2-10: a return from checkout never carries the last story's child into the next one; no wizard over a kept story", () => {
  const page = readFileSync(new URL("../app/(app)/generate/page.tsx", import.meta.url), "utf8");
  const effect = page.slice(page.indexOf("const work = takeWallWork(\"/generate\");"), page.indexOf("const keepWorkForCheckout"));
  assert.ok(effect.length > 100);
  assert.doesNotMatch(effect, /setChildName|setSelectedChildId|setAgeGroup/, "the restored story is shown, never its child");
  assert.match(page, /setShowFirstStoryWizard\(!keptStoryAtLoad\.current && /);
});

test("R2-09: on the dashboard the centre card is the only card while it is up; the quiet-payer card needs a past story", () => {
  const page = readFileSync(new URL("../app/(app)/dashboard/page.tsx", import.meta.url), "utf8");
  assert.match(page, /const quietSince = payingNow && daysSinceStory !== null && daysSinceStory >= 14;/);
  assert.match(page, /const centreCardUp = startedCentre \|\| Boolean\(centreSetup\);\n\s+const showQuietNudge = quietSince && !centreCardUp;/);
  assert.match(page, /\{centreCardUp \? null : \(totalStories \?\? 0\) === 0 \? \(/);
});
