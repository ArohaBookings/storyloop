import assert from "node:assert/strict";
import test from "node:test";
import {
  ageBandFrom,
  buildIndex,
  contributionFromRecords,
  MIN_CONTRIBUTING_SERVICES,
  MIN_OBSERVATIONS_PER_CELL,
  MIN_SERVICES_PER_CELL,
  quarterOf,
  type ServiceContribution,
} from "../lib/learning-index";

const QUARTER = "2026-Q3";

/** n services, each contributing `count` observations of `theme`. */
const services = (n: number, theme: string, count: number, region = "Canterbury", from = 0): ServiceContribution[] =>
  Array.from({ length: n }, (_, i) => ({
    serviceId: `svc-${from + i}`,
    region,
    quarter: QUARTER,
    themes: [{ theme, ageBand: "3-5" as const, count }],
  }));

test("nothing is published until enough services have contributed", () => {
  const thin = buildIndex({ quarter: QUARTER, contributions: services(MIN_CONTRIBUTING_SERVICES - 1, "exploration", 50) });
  assert.equal(thin.publishable, false);
  if (thin.publishable === false) {
    assert.match(thin.reasons[0], /Only 7 services have contributed/);
    assert.equal(thin.contributingServices, 7);
  }
});

test("and the refusal cannot be talked round by volume", () => {
  // One enormous service is still one service. This is the failure mode where
  // "we have thousands of observations" gets mistaken for anonymity.
  const loud = buildIndex({ quarter: QUARTER, contributions: services(1, "exploration", 100_000) });
  assert.equal(loud.publishable, false);
});

test("a cell seen in too few services is suppressed, however many observations it has", () => {
  const contributions = [
    ...services(MIN_CONTRIBUTING_SERVICES, "exploration", 20),
    // One service, alone, with a huge count for its own speciality.
    { serviceId: "svc-0", region: "Canterbury", quarter: QUARTER, themes: [{ theme: "eels", ageBand: "3-5" as const, count: 500 }] },
  ];
  const result = buildIndex({ quarter: QUARTER, contributions });
  assert.equal(result.publishable, true);
  if (result.publishable) {
    assert.ok(!result.cells.some((cell) => cell.theme === "eels"), "one service's speciality must never be published");
    assert.ok(result.cells.some((cell) => cell.theme === "exploration"));
    assert.ok(result.suppressed >= 1);
  }
});

test("a cell with too few observations is suppressed even when many services report it", () => {
  const contributions = [
    ...services(MIN_CONTRIBUTING_SERVICES, "exploration", 20),
    ...services(MIN_SERVICES_PER_CELL, "rare-thing", 1, "Canterbury", 100),
  ];
  const result = buildIndex({ quarter: QUARTER, contributions });
  assert.equal(result.publishable, true);
  if (result.publishable) {
    assert.ok(!result.cells.some((cell) => cell.theme === "rare-thing"),
      `${MIN_SERVICES_PER_CELL} observations is below the floor of ${MIN_OBSERVATIONS_PER_CELL}`);
  }
});

test("a region with too few services is never named", () => {
  const contributions = [
    ...services(MIN_CONTRIBUTING_SERVICES, "exploration", 20, "Canterbury"),
    // Two services in a small region. Naming it points at them.
    ...services(2, "exploration", 40, "West Coast", 200),
  ];
  const result = buildIndex({ quarter: QUARTER, contributions });
  assert.equal(result.publishable, true);
  if (result.publishable) {
    assert.ok(!result.cells.some((cell) => cell.region === "west coast"), JSON.stringify(result.cells));
    assert.ok(result.cells.some((cell) => cell.region === "canterbury"));
  }
});

test("a published cell says how many services stand behind it", () => {
  const result = buildIndex({ quarter: QUARTER, contributions: services(MIN_CONTRIBUTING_SERVICES, "exploration", 20) });
  assert.equal(result.publishable, true);
  if (result.publishable) {
    const cell = result.cells.find((c) => c.theme === "exploration")!;
    assert.equal(cell.services, MIN_CONTRIBUTING_SERVICES);
    assert.equal(cell.observations, MIN_CONTRIBUTING_SERVICES * 20);
    assert.equal(cell.share, 1, "it is the only theme in its band and region");
  }
});

test("shares are computed within an age band and region, not across everything", () => {
  const contributions = [
    ...services(4, "exploration", 30, "Canterbury"),
    ...services(4, "wellbeing", 10, "Canterbury", 50),
  ].map((c, i) => ({ ...c, serviceId: `svc-${i}` }));
  // Every service reports both themes, so both clear the per-cell floor.
  const both = contributions.map((c) => ({
    ...c,
    themes: [
      { theme: "exploration", ageBand: "3-5" as const, count: 30 },
      { theme: "wellbeing", ageBand: "3-5" as const, count: 10 },
    ],
  }));
  const result = buildIndex({ quarter: QUARTER, contributions: both });
  assert.equal(result.publishable, true);
  if (result.publishable) {
    const exploration = result.cells.find((c) => c.theme === "exploration")!;
    const wellbeing = result.cells.find((c) => c.theme === "wellbeing")!;
    assert.equal(exploration.share, 0.75);
    assert.equal(wellbeing.share, 0.25);
  }
});

test("only a different quarter's data is ignored, not mixed in", () => {
  const contributions = [
    ...services(MIN_CONTRIBUTING_SERVICES, "exploration", 20),
    ...services(MIN_CONTRIBUTING_SERVICES, "exploration", 500, "Canterbury", 300).map((c) => ({ ...c, quarter: "2026-Q2" })),
  ];
  const result = buildIndex({ quarter: QUARTER, contributions });
  assert.equal(result.publishable, true);
  if (result.publishable) {
    assert.equal(result.contributingServices, MIN_CONTRIBUTING_SERVICES);
    assert.equal(result.cells.find((c) => c.theme === "exploration")!.observations, MIN_CONTRIBUTING_SERVICES * 20);
  }
});

test("nothing identifying can reach a publication", () => {
  const result = buildIndex({
    quarter: QUARTER,
    contributions: services(MIN_CONTRIBUTING_SERVICES, "exploration", 20).map((c) => ({
      ...c,
      serviceId: `service-for-ruby-at-sunnydays-${c.serviceId}`,
    })),
  });
  assert.equal(result.publishable, true);
  if (result.publishable) {
    const text = JSON.stringify(result);
    assert.ok(!/serviceId|sunnydays|ruby/i.test(text), "a service id must never appear in a publication");
    assert.ok(result.notes.some((note) => /No child, educator, service or story appears/.test(note)));
  }
});

test("a contribution counts a theme once per record, not once per mention", () => {
  const contribution = contributionFromRecords({
    serviceId: "svc-1",
    region: "Canterbury",
    quarter: QUARTER,
    records: [
      { ageBand: "3-5", outcomes: ["Exploration", "Exploration", "exploration "], dispositions: ["Perseverance"] },
      { ageBand: "3-5", outcomes: ["Exploration"], dispositions: [] },
      { ageBand: "under-2", outcomes: ["Wellbeing"], dispositions: [] },
    ],
  });
  const find = (theme: string, band: string) =>
    contribution.themes.find((t) => t.theme === theme && t.ageBand === band)?.count ?? 0;
  assert.equal(find("exploration", "3-5"), 2, "two records, not four mentions");
  assert.equal(find("perseverance", "3-5"), 1);
  assert.equal(find("wellbeing", "under-2"), 1);
  // Age bands are never merged.
  assert.equal(find("wellbeing", "3-5"), 0);
});

test("a contribution carries counts and nothing else", () => {
  const contribution = contributionFromRecords({
    serviceId: "svc-1", region: "Canterbury", quarter: QUARTER,
    records: [{ ageBand: "3-5", outcomes: ["Exploration"], dispositions: [] }],
  });
  const keys = new Set(contribution.themes.flatMap((t) => Object.keys(t)));
  assert.deepEqual([...keys].sort(), ["ageBand", "count", "theme"], "no free text, no dates, no ids inside a theme");
});

test("quarters are derived the same way every time", () => {
  assert.equal(quarterOf("2026-01-15"), "2026-Q1");
  assert.equal(quarterOf("2026-03-31"), "2026-Q1");
  assert.equal(quarterOf("2026-04-01"), "2026-Q2");
  assert.equal(quarterOf("2026-09-22"), "2026-Q3");
  assert.equal(quarterOf("2026-12-31"), "2026-Q4");
});

test("age bands are read forgivingly, and refuse to guess when they cannot tell", () => {
  assert.equal(ageBandFrom("under 2"), "under-2");
  assert.equal(ageBandFrom("0-2 years"), "under-2");
  assert.equal(ageBandFrom("Infants"), "under-2");
  assert.equal(ageBandFrom("2-3 years"), "2-3");
  assert.equal(ageBandFrom("Toddlers"), "2-3");
  assert.equal(ageBandFrom("3-4 years"), "3-5");
  assert.equal(ageBandFrom("4-5 years"), "3-5");
  assert.equal(ageBandFrom("Preschool"), "3-5");
  // A record in the wrong band is a wrong number published nationally, so
  // anything unreadable is left out rather than guessed.
  assert.equal(ageBandFrom("mixed age"), null);
  assert.equal(ageBandFrom("whanau group"), null);
  assert.equal(ageBandFrom(""), null);
  assert.equal(ageBandFrom(null), null);
  assert.equal(ageBandFrom("school age"), null);
});
