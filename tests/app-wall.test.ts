import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  WALL_STOP_CHOICES,
  checkoutReturnPath,
  cleanWallMemory,
  cleanWallWork,
  nextWallMemory,
  shouldShowPriceReminder,
} from "../lib/app-wall";
import { EVENTS, STOP_REASONS, sanitizeEventMetadata } from "../lib/analytics/events";
import { educatorOffer } from "../lib/offer-wording";
import { STATEMENT_FREE_LIMIT, STATEMENT_FREE_WINDOW_SECONDS } from "../lib/child-statement";

// The free-limit walls in the app (18 Nov 2026, fault P01, proposal B) and the
// free statement allowance (fault P02).

const STORY = "3f2b8c1e-9a4d-4c7b-8e21-6d5a0b9c1f42";
const NOW = Date.UTC(2026, 10, 18, 3, 0, 0);

test("a wall's checkout only ever comes back to a page that holds a wall", () => {
  assert.equal(checkoutReturnPath("/generate"), "/generate");
  assert.equal(checkoutReturnPath("/statement"), "/statement");
  assert.equal(checkoutReturnPath(`/children/${STORY}/transition`), `/children/${STORY}/transition`);
  for (const bad of ["https://evil.example/generate", "//evil.example", "/generate?x=1", "/dashboard", "/children/abc/transition", "/statement#x", "", null, 42, undefined]) {
    assert.equal(checkoutReturnPath(bad), null, String(bad));
  }
});

test("the stop question offers five fixed answers, each one the event list accepts", () => {
  assert.equal(WALL_STOP_CHOICES.length, 5);
  const allowed = new Set<string>(STOP_REASONS);
  for (const choice of WALL_STOP_CHOICES) {
    assert.ok(allowed.has(choice.key), choice.key);
    assert.deepEqual(sanitizeEventMetadata("wall_reason", { wall: "story", reason: choice.key }), { wall: "story", reason: choice.key });
  }
  // Nothing typed can travel with it.
  assert.deepEqual(sanitizeEventMetadata("wall_reason", { wall: "story", reason: "price", note: "too dear for me" }), { wall: "story", reason: "price" });
  assert.deepEqual(sanitizeEventMetadata("wall_reason", { wall: "story", reason: "Mia's mum" }), { wall: "story" });
  // No answer names another product.
  for (const choice of WALL_STOP_CHOICES) assert.doesNotMatch(choice.label, /AI tool|ChatGPT|Storypark|Educa|other app/i);
});

test("the wall states exactly the plain Educator terms checkout gives, in her currency", () => {
  const nz = educatorOffer("NZD");
  const au = educatorOffer("AUD");
  assert.equal(nz.offerLine, "7 days free, then NZ$21 a month.");
  assert.equal(au.offerLine, "7 days free, then A$19 a month.");
  const source = readFileSync("components/app/AppLimitWall.tsx", "utf8");
  assert.match(source, /educatorOffer\(currency\)/);
  assert.match(source, /\/api\/stripe\/checkout/);
  // Pause and cancel live on Billing only.
  for (const file of ["components/app/AppLimitWall.tsx", "components/app/PriceReminder.tsx", "components/app/CheckoutReturn.tsx"]) {
    assert.doesNotMatch(readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""), /\b(pause|cancel)\b/i, file);
  }
});

test("wall events carry listed values and numbers only", () => {
  const shown = sanitizeEventMetadata("wall_shown", { wall: "statement", plan: "educator", currency: "NZD", price: 21, trial_days: 7, shown_before: 2, email: "a@b.c" });
  assert.deepEqual(shown, { wall: "statement", plan: "educator", currency: "NZD", price: 21, trial_days: 7, shown_before: 2 });
  assert.ok(EVENTS.price_reminder_shown && EVENTS.price_reminder_tap && EVENTS.wall_checkout_tap && EVENTS.wall_dismissed);
});

test("the price reminder waits for a later visit and goes once dismissed", () => {
  const first = nextWallMemory(null, "story", NOW);
  assert.deepEqual(first, { wall: "story", count: 1, at: NOW, dismissedAt: null });
  assert.equal(shouldShowPriceReminder({ free: true, memory: first, wallThisVisit: true }), false, "not in the same visit as the wall");
  assert.equal(shouldShowPriceReminder({ free: true, memory: first, wallThisVisit: false }), true);
  assert.equal(shouldShowPriceReminder({ free: false, memory: first, wallThisVisit: false }), false, "never to a paying account");
  assert.equal(shouldShowPriceReminder({ free: true, memory: null, wallThisVisit: false }), false, "never before a wall");
  const dismissed = { ...first, dismissedAt: NOW + 1000 };
  assert.equal(shouldShowPriceReminder({ free: true, memory: dismissed, wallThisVisit: false }), false);
  const again = nextWallMemory(dismissed, "statement", NOW + 5000);
  assert.equal(again.count, 2);
  assert.equal(shouldShowPriceReminder({ free: true, memory: again, wallThisVisit: false }), true, "a new wall brings it back");
});

test("stored wall memory is only trusted when it has the right shape", () => {
  assert.equal(cleanWallMemory(null), null);
  assert.equal(cleanWallMemory({ wall: "demo", count: 1, at: NOW }), null);
  assert.equal(cleanWallMemory({ wall: "story", count: 0, at: NOW }), null);
  assert.deepEqual(cleanWallMemory({ wall: "story", count: 3.7, at: NOW, dismissedAt: "x" }), { wall: "story", count: 3, at: NOW, dismissedAt: null });
});

test("her work kept for the trip to Stripe comes back only on the same page and only for two hours", () => {
  const kept = { page: "/generate", note: "Mia poured water.", storyId: STORY, draft: null, framework: null, mode: null, at: NOW };
  assert.deepEqual(cleanWallWork(kept, "/generate", NOW + 60_000), { ...kept });
  assert.equal(cleanWallWork(kept, "/statement", NOW), null);
  assert.equal(cleanWallWork(kept, "/generate", NOW + 3 * 60 * 60 * 1000), null);
  assert.equal(cleanWallWork({ ...kept, storyId: "not-an-id", note: "" }, "/generate", NOW), null);
  assert.equal(cleanWallWork({ ...kept, note: "x".repeat(20_000) }, "/generate", NOW)?.note.length, 8000);
});

test("a free account's statement allowance is the signed-out visitor's: 3 an hour", () => {
  const visitor = readFileSync("app/api/transition-draft/route.ts", "utf8");
  assert.match(visitor, /scope: "public-transition-demo", key: clientIp\(request\), limit: 3, windowSeconds: 60 \* 60/);
  assert.equal(STATEMENT_FREE_LIMIT, 3);
  assert.equal(STATEMENT_FREE_WINDOW_SECONDS, 3600);
  for (const route of ["app/api/statement-from-notes/route.ts", "app/api/children/[id]/statement/route.ts"]) {
    const source = readFileSync(route, "utf8");
    assert.match(source, /limit: STATEMENT_FREE_LIMIT, windowSeconds: STATEMENT_FREE_WINDOW_SECONDS/, route);
    assert.doesNotMatch(source, /of these a month/, route);
  }
});

test("checkout goes back to the wall's page only through the short list", () => {
  const source = readFileSync("app/api/stripe/checkout/route.ts", "utf8");
  assert.match(source, /const returnPath = checkoutReturnPath\(body\.returnTo\);/);
  assert.match(source, /success_url: `\$\{origin\}\$\{returnPath \?\? "\/dashboard"\}\?upgraded=true/);
  // The plan still comes only from Stripe's webhook: nothing in the return path sets it.
  for (const file of ["components/app/CheckoutReturn.tsx", "components/app/AppLimitWall.tsx", "components/app/PriceReminder.tsx"]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /from\("profiles"\)|\/api\/me\/plan|method: "PATCH"/, file);
  }
});

test("the wall keeps the early-educator discount the old wall's Billing link carried", () => {
  // The old wall linked to /billing?offer=activation; the one tap must not quietly drop that offer.
  for (const file of ["components/app/AppLimitWall.tsx", "components/app/PriceReminder.tsx"]) {
    assert.match(readFileSync(file, "utf8"), /activationOffer: true/, file);
  }
  // The wall, the price line and the "1 free story left" prompt state that discount as money (lib/wall-offer.ts).
  for (const file of ["components/app/AppLimitWall.tsx", "components/app/PriceReminder.tsx", "app/(app)/generate/page.tsx"]) {
    assert.match(readFileSync(file, "utf8"), /useEducatorCheckoutLine\(/, file);
  }
  // Checkout still only applies it to a free account, and never with another offer.
  assert.match(readFileSync("app/api/stripe/checkout/route.ts", "utf8"), /activationOffer === true && profile\.plan === "free"/);
});
