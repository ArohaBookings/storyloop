import { getPlanByKey, type CurrencyCode, type PlanKey } from "@/lib/plans";

/**
 * Documentation time calculator, for directors and owners.
 *
 * Every number comes from what the person types in. The defaults are a
 * plausible example, labelled as one, and every assumption is editable,
 * including how long a story takes once there is a first draft to edit. It
 * never promises a saving, it shows the arithmetic of the centre's own figures.
 */

export type TimeInputs = {
  currency: CurrencyCode;
  educators: number;
  children: number;
  storiesPerChildPerMonth: number;
  minutesPerStoryNow: number;
  minutesPerStoryWithDraft: number;
  hourlyCost: number;
};

export const EXAMPLE_INPUTS: TimeInputs = {
  currency: "NZD",
  educators: 8,
  children: 40,
  storiesPerChildPerMonth: 2,
  minutesPerStoryNow: 30,
  minutesPerStoryWithDraft: 10,
  hourlyCost: 32,
};

export const INPUT_LIMITS: Record<Exclude<keyof TimeInputs, "currency">, { min: number; max: number }> = {
  educators: { min: 1, max: 500 },
  children: { min: 1, max: 5000 },
  storiesPerChildPerMonth: { min: 0, max: 30 },
  minutesPerStoryNow: { min: 1, max: 240 },
  minutesPerStoryWithDraft: { min: 1, max: 240 },
  hourlyCost: { min: 0, max: 500 },
};

function clamp(value: unknown, { min, max }: { min: number; max: number }, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function normalizeTimeInputs(raw: Partial<Record<keyof TimeInputs, unknown>>): TimeInputs {
  const currency: CurrencyCode = raw.currency === "AUD" ? "AUD" : "NZD";
  const out = { currency } as TimeInputs;
  for (const key of Object.keys(INPUT_LIMITS) as Array<Exclude<keyof TimeInputs, "currency">>) {
    out[key] = clamp(raw[key], INPUT_LIMITS[key], EXAMPLE_INPUTS[key]);
  }
  // Whole people.
  out.educators = Math.round(out.educators);
  out.children = Math.round(out.children);
  return out;
}

export type PlanOption = { plan: PlanKey; label: string; monthly: number; covers: boolean; note: string };

export type TimeResult = {
  storiesPerMonth: number;
  hoursNow: number;
  hoursWithDraft: number;
  hoursSaved: number;
  valueSaved: number;
  options: PlanOption[];
  recommended: PlanOption;
  /** Hours saved a month that pay for the recommended plan. */
  breakEvenHours: number;
  netMonthly: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateDocumentationTime(inputs: TimeInputs): TimeResult {
  const storiesPerMonth = Math.round(inputs.children * inputs.storiesPerChildPerMonth);
  const hoursNow = (storiesPerMonth * inputs.minutesPerStoryNow) / 60;
  const hoursWithDraft = (storiesPerMonth * Math.min(inputs.minutesPerStoryWithDraft, inputs.minutesPerStoryNow)) / 60;
  const hoursSaved = Math.max(0, hoursNow - hoursWithDraft);
  const valueSaved = hoursSaved * inputs.hourlyCost;

  const price = (plan: PlanKey) => getPlanByKey(plan).price[inputs.currency];
  const starterSeats = getPlanByKey("centre_starter").seats ?? 10;
  const growthSeats = getPlanByKey("centre_growth").seats ?? 25;

  const options: PlanOption[] = [
    {
      plan: "educator",
      label: `Educator for each educator (${inputs.educators} × ${price("educator")})`,
      monthly: inputs.educators * price("educator"),
      covers: true,
      note: "Each educator pays separately. No shared centre tools.",
    },
    {
      plan: "centre_starter",
      label: `Centre Starter, up to ${starterSeats} educators`,
      monthly: price("centre_starter"),
      covers: inputs.educators <= starterSeats,
      note: "Everything in Educator Pro for the whole team, plus planning board and documentation radar.",
    },
    {
      plan: "centre_growth",
      label: `Centre Growth, up to ${growthSeats} educators`,
      monthly: price("centre_growth"),
      covers: inputs.educators <= growthSeats,
      note: "Everything in Centre Starter, plus the director ROI dashboard.",
    },
  ];

  // The cheapest option that covers the whole team. Beyond 25 educators, more
  // than one centre plan, which is shown honestly rather than guessed.
  const covering = options.filter((option) => option.covers);
  const recommended = covering.reduce((best, option) => (option.monthly < best.monthly ? option : best), covering[0]);

  return {
    storiesPerMonth,
    hoursNow: round1(hoursNow),
    hoursWithDraft: round1(hoursWithDraft),
    hoursSaved: round1(hoursSaved),
    valueSaved: round2(valueSaved),
    options,
    recommended,
    breakEvenHours: inputs.hourlyCost > 0 ? round1(recommended.monthly / inputs.hourlyCost) : 0,
    netMonthly: round2(valueSaved - recommended.monthly),
  };
}
