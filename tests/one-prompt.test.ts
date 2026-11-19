import assert from "node:assert/strict";
import test from "node:test";
import { PROMPT_ORDER, claimPrompt, mayShowPrompt, priceReminderMayShow, promptFor, type PromptSlot } from "../lib/one-prompt";

/**
 * One prompt per story (release decision, 19 Nov 2026), in one place
 * (lib/one-prompt.ts): her first story gets the next-story card; her second or
 * later gets "Send this to my leader" (once ever); otherwise the review ask at
 * Copy. Never two prompts on one screen, and the price reminder line never
 * beside a card. Written as what she sees.
 */

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

test("the order: the next story first, then her leader, then the review ask", () => {
  assert.deepEqual([...PROMPT_ORDER], ["second_story", "leader_card", "review_ask"]);
  assert.equal(promptFor(A, { second_story: true, leader_card: true, review_ask: true }, null), "second_story");
  assert.equal(promptFor(A, { leader_card: true, review_ask: true }, null), "leader_card");
  assert.equal(promptFor(A, { review_ask: true }, null), "review_ask");
  assert.equal(promptFor(A, {}, null), null);
  assert.equal(promptFor(A, { leader_card: false, review_ask: false }, null), null);
});

test("her second story, copied: the leader card, and the review ask waits for another story", () => {
  let slot: PromptSlot = null;
  assert.equal(promptFor(A, { leader_card: true, review_ask: true }, slot), "leader_card");
  slot = claimPrompt(slot, A, "leader_card");
  assert.equal(mayShowPrompt("review_ask", A, slot), false, "never two prompts on one screen");
  assert.equal(mayShowPrompt("leader_card", A, slot), true, "the card that holds the slot stays");
  // She closes the card: the slot is still taken for this story (one prompt per story).
  assert.equal(promptFor(A, { review_ask: true }, slot), "leader_card");
  // The next story on screen has a slot of its own.
  assert.equal(mayShowPrompt("review_ask", B, slot), true);
  assert.equal(promptFor(B, { review_ask: true }, slot), "review_ask");
});

test("the first card to take a story's slot keeps it", () => {
  const held = claimPrompt(null, A, "review_ask");
  assert.deepEqual(held, { storyId: A, prompt: "review_ask" });
  assert.deepEqual(claimPrompt(held, A, "leader_card"), held, "a card that arrives later does not take it over");
  assert.equal(mayShowPrompt("leader_card", A, held), false, "and does not even ask");
  assert.deepEqual(claimPrompt(held, B, "leader_card"), { storyId: B, prompt: "leader_card" }, "a new story starts free");
});

test("no story, no prompt", () => {
  assert.equal(promptFor("", { leader_card: true }, null), null);
  assert.equal(mayShowPrompt("leader_card", "", null), false);
  assert.equal(claimPrompt(null, "", "leader_card"), null);
});

test("the price reminder line never shows beside a card", () => {
  assert.equal(priceReminderMayShow(null, ""), true, "the empty note screen, nothing else showing");
  assert.equal(priceReminderMayShow(null, A), true);
  assert.equal(priceReminderMayShow({ storyId: A, prompt: "leader_card" }, A), false);
  assert.equal(priceReminderMayShow({ storyId: A, prompt: "review_ask" }, A), false);
  assert.equal(priceReminderMayShow({ storyId: A, prompt: "leader_card" }, ""), true, "the card's story is gone from the screen");
  assert.equal(priceReminderMayShow({ storyId: A, prompt: "leader_card" }, B), true);
});
