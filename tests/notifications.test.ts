import assert from "node:assert/strict";
import test from "node:test";
import {
  buildNotifications,
  fortnightKey,
  mergeSeen,
  unseenCount,
  MAX_NOTIFICATIONS,
  type NotificationFacts,
} from "../lib/notifications";

const NOW = new Date("2026-09-23T02:00:00Z");

function facts(overrides: Partial<NotificationFacts> = {}): NotificationFacts {
  return {
    now: NOW,
    plan: "educator",
    subscriptionStatus: "active",
    trialEndsAt: null,
    storiesThisMonth: 0,
    usageResetAt: "2026-09-01T00:05:00Z",
    monthlyLimit: null,
    referrals: [],
    quiet: null,
    wall: null,
    term: null,
    invites: [],
    ...overrides,
  };
}

test("a quiet account gets no notifications at all", () => {
  assert.deepEqual(buildNotifications(facts()), []);
});

test("no notification ever carries a child's name", () => {
  const all = buildNotifications(
    facts({
      plan: "educator_pro",
      quiet: { count: 2, onHoliday: false },
      term: { number: 3, end: "2026-09-26", childrenWithNoMomentThisTerm: 1 },
      wall: { scans: 30, lastScannedAt: "2026-09-22T03:00:00Z" },
    }),
  );
  const text = JSON.stringify(all);
  // The facts carry only counts, so there is no name to leak, and this pins it.
  assert.ok(all.length >= 3);
  assert.doesNotMatch(text, /Noah|Amelia|Aroha/);
});

test("payment trouble comes first and is marked urgent", () => {
  const list = buildNotifications(
    facts({ subscriptionStatus: "past_due", wall: { scans: 12, lastScannedAt: "2026-09-23T01:00:00Z" } }),
  );
  assert.equal(list[0].kind, "billing");
  assert.equal(list[0].urgent, true);
  assert.equal(list[0].href, "/billing");
});

test("the trial note appears only in the last three days, and says it can be cancelled", () => {
  const four = buildNotifications(facts({ subscriptionStatus: "trialing", trialEndsAt: "2026-09-27T03:00:00Z" }));
  assert.equal(four.length, 0, "four days out is too early");
  const two = buildNotifications(facts({ subscriptionStatus: "trialing", trialEndsAt: "2026-09-25T03:00:00Z" }));
  assert.equal(two.length, 1);
  assert.match(two[0].title, /ends Friday 25 September$/);
  assert.match(two[0].body, /cancel/i);
  const past = buildNotifications(facts({ subscriptionStatus: "trialing", trialEndsAt: "2026-09-22T03:00:00Z" }));
  assert.equal(past.length, 0, "a trial that already ended is not 'ending'");
});

test("the quiet-children note is for plans that include the radar, and never on holiday", () => {
  const quiet = { count: 3, onHoliday: false };
  assert.equal(buildNotifications(facts({ plan: "educator", quiet })).length, 0, "Educator does not have the radar to follow it to");
  const pro = buildNotifications(facts({ plan: "educator_pro", quiet }));
  assert.equal(pro.length, 1);
  assert.match(pro[0].title, /^3 children have had no moments/);
  assert.equal(buildNotifications(facts({ plan: "educator_pro", quiet: { count: 3, onHoliday: true } })).length, 0);
  assert.equal(buildNotifications(facts({ plan: "educator_pro", quiet: { count: 1, onHoliday: false } }))[0].title.startsWith("1 child has"), true);
});

test("the quiet-children note can repeat at most once a fortnight", () => {
  const a = buildNotifications(facts({ plan: "centre_starter", quiet: { count: 2, onHoliday: false } }))[0].id;
  const sameFortnight = new Date(NOW.getTime() + 3 * 86_400_000);
  const b = buildNotifications(facts({ now: sameFortnight, plan: "centre_starter", quiet: { count: 2, onHoliday: false } }))[0].id;
  assert.equal(a, b, "a few days later it is the same notification, already seen");
  // Four weeks hold two or three fortnight keys, never one a week.
  const keys = new Set(Array.from({ length: 28 }, (_, day) => fortnightKey(new Date(NOW.getTime() + day * 86_400_000))));
  assert.ok(keys.size <= 3 && keys.size >= 2, `${keys.size} keys in four weeks`);
});

test("wall cards notify on milestones only, so a busy wall is not a busy bell", () => {
  const ids = [1, 2, 9, 10, 11, 24, 25, 26, 99].map(
    (scans) => buildNotifications(facts({ wall: { scans, lastScannedAt: null } }))[0].id,
  );
  assert.deepEqual([...new Set(ids)], ["wall:1", "wall:10", "wall:25", "wall:50"]);
  const first = buildNotifications(facts({ wall: { scans: 1, lastScannedAt: null } }))[0];
  assert.match(first.title, /A family opened one of your wall cards/);
  assert.match(first.body, /Only a count is kept/);
});

test("the allowance note is monthly, and never uses last month's count", () => {
  const used = buildNotifications(facts({ plan: "free", monthlyLimit: 3, storiesThisMonth: 3 }));
  assert.equal(used.length, 1);
  assert.equal(used[0].id, "allowance:2026-09");
  assert.match(used[0].body, /Thursday 1 October/);
  assert.equal(buildNotifications(facts({ plan: "free", monthlyLimit: 3, storiesThisMonth: 2 })).length, 0);
  // 1 October, before the monthly reset has run: the 3 belongs to September.
  const stale = buildNotifications(
    facts({ now: new Date("2026-10-01T00:30:00Z"), plan: "free", monthlyLimit: 3, storiesThisMonth: 3, usageResetAt: "2026-09-01T00:05:00Z" }),
  );
  assert.equal(stale.length, 0);
  assert.equal(buildNotifications(facts({ monthlyLimit: null, storiesThisMonth: 400 })).length, 0, "unlimited plans never see it");
});

test("the term note appears in the last ten days of term, with a count only when there is one", () => {
  const early = buildNotifications(facts({ term: { number: 3, end: "2026-10-20", childrenWithNoMomentThisTerm: 2 } }));
  assert.equal(early.length, 0);
  const late = buildNotifications(facts({ term: { number: 3, end: "2026-09-26", childrenWithNoMomentThisTerm: 2 } }));
  assert.equal(late.length, 1);
  assert.match(late[0].title, /Term 3 ends Saturday 26 September/);
  assert.match(late[0].body, /2 children have no moment recorded this term/);
  const noCount = buildNotifications(facts({ term: { number: 3, end: "2026-09-26", childrenWithNoMomentThisTerm: null } }));
  assert.match(noCount[0].body, /good week/);
  assert.equal(noCount[0].href, "/today");
});

test("referrals notify once each, credited or held", () => {
  const list = buildNotifications(
    facts({
      referrals: [
        { id: "r1", status: "credited", qualifiedAt: "2026-09-20T00:00:00Z", creditedAt: "2026-09-20T00:00:00Z" },
        { id: "r2", status: "earned", qualifiedAt: "2026-09-21T00:00:00Z", creditedAt: null },
        { id: "r3", status: "pending", qualifiedAt: null, creditedAt: null },
      ],
    }),
  );
  assert.deepEqual(list.map((item) => item.id).sort(), ["referral:r1:credited", "referral:r2:earned"]);
  assert.match(list.find((item) => item.id.endsWith("earned"))!.body, /held for you/);
});

test("an invite links to the join page with its token", () => {
  const [invite] = buildNotifications(
    facts({ invites: [{ id: "i1", centreName: "Kowhai Kindergarten", token: "abc/123", createdAt: "2026-09-22T00:00:00Z" }] }),
  );
  assert.equal(invite.href, "/join?token=abc%2F123");
  assert.match(invite.body, /never what you wrote/);
});

test("the bell is capped, newest first after anything urgent", () => {
  const referrals = Array.from({ length: 12 }, (_, i) => ({
    id: `r${i}`,
    status: "credited",
    qualifiedAt: null,
    creditedAt: `2026-09-${String(10 + i).padStart(2, "0")}T00:00:00Z`,
  }));
  const list = buildNotifications(facts({ subscriptionStatus: "past_due", referrals }));
  assert.equal(list.length, MAX_NOTIFICATIONS);
  assert.equal(list[0].kind, "billing");
  assert.equal(list[1].id, "referral:r11:credited");
});

test("read state: seen ids are remembered, bounded, and counted", () => {
  const items = buildNotifications(facts({ subscriptionStatus: "past_due", wall: { scans: 10, lastScannedAt: null } }));
  assert.equal(unseenCount(items, []), 2);
  const seen = mergeSeen(["old"], items.map((item) => item.id));
  assert.equal(unseenCount(items, seen), 0);
  assert.equal(mergeSeen([], Array.from({ length: 150 }, (_, i) => `n${i}`)).length, 100);
  assert.deepEqual(mergeSeen("not an array", ["a"]), ["a"]);
  assert.deepEqual(mergeSeen(["a", "b"], ["a"]), ["b", "a"], "re-seeing moves an id to the end rather than duplicating it");
});
