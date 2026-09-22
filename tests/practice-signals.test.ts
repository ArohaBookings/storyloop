import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOwnSignals,
  buildSharedSignals,
  describeSignal,
  MIN_SERVICES_PER_SIGNAL,
  MIN_TIMES_PER_SIGNAL,
  normalisePractice,
  type PracticeRecord,
} from "../lib/practice-signals";

const record = (serviceId: string, text: string, outcome: PracticeRecord["outcome"], theme = "exploration"): PracticeRecord =>
  ({ serviceId, theme, text, outcome });

test("a phrase carrying a child's name is dropped", () => {
  // The second line of defence. The first is that a phrase like this occurs in
  // exactly one service and can never reach the shared threshold.
  assert.equal(normalisePractice("Offer Ruby the longer pipes"), null);
  assert.equal(normalisePractice("Set up the trough for Tāne again"), null);
  // A name typed in lowercase cannot be told from an ordinary word, which is
  // exactly why the service threshold, not this filter, is the real defence.
  assert.equal(normalisePractice("ask ana what she wants to build"), "ask ana what she wants to build");
});

test("an ordinary next step normalises to something comparable", () => {
  assert.equal(normalisePractice("Offer longer pipes outside"), "offer longer pipes outside");
  assert.equal(normalisePractice("  offer   longer pipes   outside  "), "offer longer pipes outside");
  assert.equal(normalisePractice("Offer longer pipes outside."), "offer longer pipes outside");
  assert.equal(normalisePractice("Revisit the water trough"), "revisit the water trough");
});

test("anything that could narrow down a service is dropped", () => {
  assert.equal(normalisePractice("Offer pipes on 14 March"), null, "a date");
  assert.equal(normalisePractice("Set up room 3 for water play"), null, "a room number");
  assert.equal(normalisePractice("Try again"), null, "two words is a shrug, not a practice");
  assert.equal(normalisePractice("x".repeat(5)), null);
  assert.equal(
    normalisePractice("offer a much longer set of pipes and then also the buckets and the funnels and some more water"),
    null,
    "too long to be a comparable phrase",
  );
  assert.equal(normalisePractice(""), null);
  assert.equal(normalisePractice(null), null);
  assert.equal(normalisePractice(42), null);
});

test("a plan that was never revisited is not an outcome", () => {
  const signals = buildOwnSignals({
    records: [
      record("s1", "Offer longer pipes outside", "planned"),
      record("s1", "Offer longer pipes outside", "planned"),
      record("s1", "Offer longer pipes outside", "planned"),
    ],
  });
  assert.deepEqual(signals, [], "intending something three times says nothing about whether it worked");
});

test("an educator's own closed loops surface immediately, with no threshold to wait for", () => {
  const signals = buildOwnSignals({
    records: [
      record("s1", "Offer longer pipes outside", "tried"),
      record("s1", "Offer longer pipes outside", "continue"),
      record("s1", "Read the eel book at mat time", "tried"),
    ],
  });
  const pipes = signals.find((s) => s.phrase === "offer longer pipes outside")!;
  assert.equal(pipes.revisited, 2);
  assert.equal(pipes.worthContinuing, 1);
  // Once is not a pattern, even for yourself.
  assert.ok(!signals.some((s) => s.phrase === "read the eel book at mat time"));
});

test("THE structural defence: a phrase from one service can never be shared", () => {
  // One service, an enormous number of times, including a child's name in a
  // form the filter would miss if it were lowercase.
  const records = Array.from({ length: 200 }, () => record("s1", "offer ana the longer pipes", "continue"));
  const { signals, suppressed } = buildSharedSignals({ records });
  assert.deepEqual(signals, [], "volume from one service is one service's programme");
  assert.equal(suppressed, 1);
});

test("a shared signal needs several services AND several occasions", () => {
  const enoughServices = Array.from({ length: MIN_SERVICES_PER_SIGNAL }, (_, i) =>
    record(`s${i}`, "offer longer pipes outside", "continue"));
  const thin = buildSharedSignals({ records: enoughServices });
  assert.deepEqual(thin.signals, [], `${MIN_SERVICES_PER_SIGNAL} occasions is below the floor of ${MIN_TIMES_PER_SIGNAL}`);

  const enough = [
    ...enoughServices,
    ...Array.from({ length: MIN_TIMES_PER_SIGNAL }, (_, i) =>
      record(`s${i % MIN_SERVICES_PER_SIGNAL}`, "offer longer pipes outside", i % 2 ? "continue" : "tried")),
  ];
  const result = buildSharedSignals({ records: enough });
  assert.equal(result.signals.length, 1);
  assert.ok(result.signals[0].services >= MIN_SERVICES_PER_SIGNAL);
  assert.ok(result.signals[0].revisited >= MIN_TIMES_PER_SIGNAL);
});

test("signals are kept separate by theme, so advice never crosses contexts", () => {
  const records = [
    ...Array.from({ length: 8 }, (_, i) => record(`s${i % 4}`, "offer longer pipes outside", "continue", "exploration")),
    ...Array.from({ length: 8 }, (_, i) => record(`s${i % 4}`, "offer longer pipes outside", "continue", "wellbeing")),
  ];
  const all = buildSharedSignals({ records });
  assert.equal(all.signals.length, 2, "the same phrase under two themes is two signals");
  const oneTheme = buildSharedSignals({ records, theme: "Exploration" });
  assert.equal(oneTheme.signals.length, 1);
  assert.equal(oneTheme.signals[0].theme, "exploration");
});

test("nothing anywhere claims that something works", () => {
  const signal = { theme: "exploration", phrase: "offer longer pipes outside", revisited: 9, worthContinuing: 7, services: 5 };
  const own = describeSignal({ ...signal, services: 1 }, "own");
  const shared = describeSignal(signal, "shared");
  for (const text of [own, shared]) {
    assert.ok(!/\bworks\b|\beffective\b|\bproven\b|\bbest\b|\brecommend|\bshould\b|\bcauses?\b/i.test(text), text);
  }
  assert.match(own, /You came back to this 9 times and kept it going 7/);
  assert.match(shared, /5 services tried this; it was marked worth continuing 7 of 9 times/);
});

test("a signal never carries a service, a child or a count of children", () => {
  const records = Array.from({ length: 12 }, (_, i) =>
    record(`sunny-days-preschool-${i % 5}`, "offer longer pipes outside", "continue"));
  const { signals } = buildSharedSignals({ records });
  const text = JSON.stringify(signals);
  assert.ok(!/sunny-days|serviceId/i.test(text), text);
  assert.deepEqual(Object.keys(signals[0]).sort(), ["phrase", "revisited", "services", "theme", "worthContinuing"]);
});
