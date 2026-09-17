/**
 * Unit economics: what StoryLoop earns against what the AI costs to run.
 *
 * Pure functions only. No database, no network, no model calls. The admin page
 * gathers counts and hands them in; everything here is arithmetic that can be
 * tested exactly, because a margin figure that is quietly wrong is worse than no
 * figure at all.
 *
 * WHAT IS AND IS NOT COUNTABLE, stated honestly because it shapes every number:
 *
 *   counted    persisted stories        (stories table)
 *   counted    landing-page demos       (page_events 'demo_completed'; these hit
 *                                        the model but never create a story row)
 *   counted    Quill line edits         (assistant_edits table)
 *   NOT        regenerations            (update a story in place, never logged)
 *   NOT        voice transcriptions     (billed per audio minute, never logged)
 *
 * Token usage is not recorded anywhere either, and adding it would mean
 * touching the generation path, which is deliberately off limits. So the
 * default per-call costs are ESTIMATES. The reliable path is calibration:
 * enter last month's real OpenAI invoice and the calculator derives what each
 * call actually cost, absorbing the uncounted regenerations and transcriptions
 * into the rate rather than pretending they are zero.
 */

export type CallCounts = {
  /** Persisted story generations in the period. */
  stories: number;
  /** Landing-page demo generations in the period. */
  demos: number;
  /** Quill assistant edits in the period. */
  assistantEdits: number;
};

/** Relative cost weight of each call type, used when calibrating from an invoice. */
export type CallWeights = {
  story: number;
  demo: number;
  assistant: number;
};

/** Cost of a single call, in USD, which is what OpenAI bills in. */
export type CallCostsUsd = {
  story: number;
  demo: number;
  assistant: number;
};

/**
 * Starting assumptions, labelled as assumptions everywhere they appear.
 *
 * A demo runs the same story model as a real generation. A Quill edit rewrites
 * one line on a much smaller model, so it is weighted far lighter. These
 * weights only matter for SPLITTING a real invoice between call types; the
 * total always comes from the invoice when one is supplied.
 */
export const DEFAULT_WEIGHTS: CallWeights = { story: 1, demo: 1, assistant: 0.08 };
export const DEFAULT_COSTS_USD: CallCostsUsd = { story: 0.04, demo: 0.04, assistant: 0.003 };

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function nonNegative(value: number) {
  return Math.max(0, finite(value));
}

/** Weighted call volume: stories count as 1, a Quill edit as a fraction of one. */
export function weightedCalls(counts: CallCounts, weights: CallWeights = DEFAULT_WEIGHTS) {
  return (
    nonNegative(counts.stories) * nonNegative(weights.story) +
    nonNegative(counts.demos) * nonNegative(weights.demo) +
    nonNegative(counts.assistantEdits) * nonNegative(weights.assistant)
  );
}

/**
 * Derive real per-call costs from a real invoice.
 *
 * Splits the invoice across call types in proportion to weighted volume. The
 * three derived costs, multiplied back by their counts, sum to the invoice
 * exactly, which is the property the test pins.
 *
 * Returns null when there is nothing to divide by, rather than inventing a rate.
 */
export function calibrateFromInvoice(
  invoiceUsd: number,
  counts: CallCounts,
  weights: CallWeights = DEFAULT_WEIGHTS,
): CallCostsUsd | null {
  const invoice = nonNegative(invoiceUsd);
  const volume = weightedCalls(counts, weights);
  if (invoice <= 0 || volume <= 0) return null;
  const perUnit = invoice / volume;
  return {
    story: perUnit * nonNegative(weights.story),
    demo: perUnit * nonNegative(weights.demo),
    assistant: perUnit * nonNegative(weights.assistant),
  };
}

export function apiCostUsd(counts: CallCounts, costs: CallCostsUsd) {
  return (
    nonNegative(counts.stories) * nonNegative(costs.story) +
    nonNegative(counts.demos) * nonNegative(costs.demo) +
    nonNegative(counts.assistantEdits) * nonNegative(costs.assistant)
  );
}

export type EconomicsInput = {
  /** Monthly recurring revenue in NZD. */
  mrrNzd: number;
  /** Paying customers, for per-customer figures. */
  payingCustomers: number;
  counts: CallCounts;
  costsUsd: CallCostsUsd;
  /** NZD per 1 USD. Editable; OpenAI bills in USD, revenue lands in NZD. */
  nzdPerUsd: number;
  /** Fixed monthly running costs in NZD: hosting, email, domain, database. */
  fixedMonthlyNzd: number;
  /** Stripe's cut, as a fraction of revenue. */
  paymentFeeRate: number;
};

export type Economics = {
  mrrNzd: number;
  apiCostNzd: number;
  paymentFeesNzd: number;
  fixedNzd: number;
  totalCostNzd: number;
  grossProfitNzd: number;
  /** null when there is no revenue to take a margin of. */
  grossMarginPct: number | null;
  /** Share of revenue eaten by AI alone. null with no revenue. */
  apiShareOfRevenuePct: number | null;
  costPerStoryNzd: number;
  apiCostPerPayingCustomerNzd: number | null;
  revenuePerPayingCustomerNzd: number | null;
};

export function computeEconomics(input: EconomicsInput): Economics {
  const mrr = nonNegative(input.mrrNzd);
  const fx = finite(input.nzdPerUsd) > 0 ? input.nzdPerUsd : 1;
  const apiCostNzd = apiCostUsd(input.counts, input.costsUsd) * fx;
  const paymentFeesNzd = mrr * nonNegative(input.paymentFeeRate);
  const fixedNzd = nonNegative(input.fixedMonthlyNzd);
  const totalCostNzd = apiCostNzd + paymentFeesNzd + fixedNzd;
  const grossProfitNzd = mrr - totalCostNzd;
  const paying = nonNegative(input.payingCustomers);

  return {
    mrrNzd: mrr,
    apiCostNzd,
    paymentFeesNzd,
    fixedNzd,
    totalCostNzd,
    grossProfitNzd,
    grossMarginPct: mrr > 0 ? (grossProfitNzd / mrr) * 100 : null,
    apiShareOfRevenuePct: mrr > 0 ? (apiCostNzd / mrr) * 100 : null,
    costPerStoryNzd: nonNegative(input.costsUsd.story) * fx,
    apiCostPerPayingCustomerNzd: paying > 0 ? apiCostNzd / paying : null,
    revenuePerPayingCustomerNzd: paying > 0 ? mrr / paying : null,
  };
}

/**
 * The question behind "more users might start billing": at what scale does AI
 * cost actually bite?
 *
 * Scales revenue and usage together by a multiplier. Fixed costs do NOT scale,
 * which is why margin usually IMPROVES with growth for a product like this: the
 * per-call cost is tiny next to a per-seat price, and the fixed floor gets
 * spread thinner. The projection exists to prove or disprove that for the real
 * numbers rather than assert it.
 */
export function projectAtScale(input: EconomicsInput, multipliers: number[]) {
  return multipliers.map((multiplier) => {
    const m = nonNegative(multiplier);
    const scaled = computeEconomics({
      ...input,
      mrrNzd: input.mrrNzd * m,
      payingCustomers: input.payingCustomers * m,
      counts: {
        stories: input.counts.stories * m,
        demos: input.counts.demos * m,
        assistantEdits: input.counts.assistantEdits * m,
      },
    });
    return { multiplier: m, ...scaled };
  });
}

export type UserUsage = {
  userId: string;
  email: string | null;
  planPriceNzd: number;
  stories30d: number;
  assistantEdits30d: number;
};

/**
 * Per-customer contribution. The operator question this answers is not "are we
 * profitable" but "is anyone costing more than they pay", which is the thing
 * that quietly breaks unlimited plans. Sorted worst first.
 */
export function customerContribution(users: UserUsage[], costsUsd: CallCostsUsd, nzdPerUsd: number) {
  const fx = finite(nzdPerUsd) > 0 ? nzdPerUsd : 1;
  return users
    .map((user) => {
      const costNzd =
        (nonNegative(user.stories30d) * nonNegative(costsUsd.story) +
          nonNegative(user.assistantEdits30d) * nonNegative(costsUsd.assistant)) * fx;
      const revenue = nonNegative(user.planPriceNzd);
      return {
        ...user,
        costNzd,
        contributionNzd: revenue - costNzd,
        // A free user always costs more than they pay; that is expected, not a
        // leak, so only paying users can be flagged as unprofitable.
        unprofitable: revenue > 0 && costNzd > revenue,
      };
    })
    .sort((a, b) => a.contributionNzd - b.contributionNzd);
}

/**
 * How many stories a paying user would have to write in a month before they
 * cost more than they pay. The single most reassuring number on the page for
 * an unlimited plan, or the most alarming one.
 */
export function breakEvenStories(planPriceNzd: number, costPerStoryUsd: number, nzdPerUsd: number) {
  const fx = finite(nzdPerUsd) > 0 ? nzdPerUsd : 1;
  const perStoryNzd = nonNegative(costPerStoryUsd) * fx;
  if (perStoryNzd <= 0) return null;
  return Math.floor(nonNegative(planPriceNzd) / perStoryNzd);
}
