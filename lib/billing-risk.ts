/**
 * Billing risk: which paying customers might stop paying, and why, in words an
 * owner can act on. Pure, so every rule is tested; the admin supplies facts
 * read from Stripe.
 *
 * HIGH means money is being lost or disputed now. MEDIUM means it will be,
 * soon, unless someone acts. LOW is worth knowing (a first charge coming up, a
 * discount ending) but needs nothing today.
 */

export type RiskLevel = "high" | "medium" | "low";
export type Risk = { level: RiskLevel; code: string; text: string };

export type SubscriptionFacts = {
  status: string;
  cancelAtPeriodEnd: boolean;
  cancelAt: number | null;
  periodEnd: number | null;
  trialEnd: number | null;
  /** The trial cancels itself if no card is added (a centre's no-card month). */
  trialCancelsWithoutCard: boolean;
  hasCard: boolean;
  card: { expMonth: number; expYear: number } | null;
  latestInvoice: { status: string | null; attemptCount: number; nextAttempt: number | null; amountDue: number } | null;
  /** When an ongoing discount stops, and the monthly amount before and after. */
  discountEnds: { at: number; from: number; to: number } | null;
  openDisputes: number;
  cancellationFeedback: string | null;
  monthly: number;
  currencySymbol: string;
};

const DAY = 86_400;

function when(seconds: number) {
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", timeZone: "Pacific/Auckland" }).format(new Date(seconds * 1000));
}

function money(symbol: string, amount: number) {
  return `${symbol}${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

/** The last second a card with this expiry can be charged. Pure. */
export function cardExpiresAt(card: { expMonth: number; expYear: number }) {
  // Cards are valid to the end of their expiry month.
  return Math.floor(Date.UTC(card.expYear, card.expMonth, 1) / 1000) - 1;
}

export function assessBillingRisk(facts: SubscriptionFacts, now = Math.floor(Date.now() / 1000)): Risk[] {
  const risks: Risk[] = [];
  const nextCharge = facts.status === "trialing" ? facts.trialEnd : facts.periodEnd;

  if (facts.openDisputes > 0) {
    risks.push({ level: "high", code: "dispute", text: `${facts.openDisputes} open card dispute${facts.openDisputes === 1 ? "" : "s"}. Respond in Stripe before the deadline.` });
  }
  if (facts.status === "past_due" || facts.status === "unpaid") {
    const invoice = facts.latestInvoice;
    const retry = invoice?.nextAttempt ? ` Next retry ${when(invoice.nextAttempt)}.` : " No more automatic retries.";
    risks.push({
      level: "high",
      code: "payment_failing",
      text: `Payment failing${invoice ? `: ${money(facts.currencySymbol, invoice.amountDue)} tried ${invoice.attemptCount} time${invoice.attemptCount === 1 ? "" : "s"}` : ""}.${retry}`,
    });
  } else if (facts.latestInvoice && facts.latestInvoice.status === "open" && facts.latestInvoice.attemptCount > 0) {
    risks.push({ level: "high", code: "invoice_unpaid", text: `Latest invoice unpaid after ${facts.latestInvoice.attemptCount} attempt${facts.latestInvoice.attemptCount === 1 ? "" : "s"}.` });
  }
  if (facts.status === "incomplete") {
    risks.push({ level: "high", code: "incomplete", text: "First payment never completed. Access should not be running." });
  }

  if (facts.cancelAtPeriodEnd || facts.cancelAt) {
    const at = facts.cancelAt ?? facts.periodEnd;
    const reason = facts.cancellationFeedback ? ` Reason given: ${facts.cancellationFeedback.replace(/_/g, " ")}.` : "";
    risks.push({ level: "medium", code: "cancelling", text: `Cancels${at ? ` ${when(at)}` : " at period end"}: ${money(facts.currencySymbol, facts.monthly)} a month ends.${reason}` });
  }

  if (facts.status === "trialing" && facts.trialEnd) {
    const daysLeft = Math.ceil((facts.trialEnd - now) / DAY);
    if (facts.trialCancelsWithoutCard && !facts.hasCard) {
      risks.push({
        level: daysLeft <= 7 ? "medium" : "low",
        code: "trial_no_card",
        text: `Free month ends ${when(facts.trialEnd)} (${Math.max(0, daysLeft)} days) and no card yet. It ends unless one is added.`,
      });
    } else if (!facts.hasCard) {
      risks.push({ level: "medium", code: "trial_card_missing", text: `Trial ends ${when(facts.trialEnd)} with no card on file: the first charge will fail.` });
    } else if (daysLeft <= 3) {
      risks.push({ level: "low", code: "first_charge", text: `First charge ${when(facts.trialEnd)}: ${money(facts.currencySymbol, facts.monthly)}.` });
    }
  }

  if (facts.card && nextCharge && !facts.cancelAtPeriodEnd) {
    const expires = cardExpiresAt(facts.card);
    if (expires < nextCharge) {
      risks.push({
        level: expires < now ? "high" : "medium",
        code: "card_expiring",
        text: `Card ${expires < now ? "expired" : "expires"} ${String(facts.card.expMonth).padStart(2, "0")}/${String(facts.card.expYear).slice(-2)}, before the next charge on ${when(nextCharge)}.`,
      });
    }
  } else if (!facts.card && !facts.hasCard && facts.status === "active" && !facts.cancelAtPeriodEnd) {
    risks.push({ level: "medium", code: "no_card", text: `No card on file for the next charge${nextCharge ? ` on ${when(nextCharge)}` : ""}.` });
  }

  if (facts.discountEnds && facts.discountEnds.at > now && facts.discountEnds.at - now < 45 * DAY) {
    risks.push({
      level: "low",
      code: "discount_ending",
      text: `Discount ends ${when(facts.discountEnds.at)}: ${money(facts.currencySymbol, facts.discountEnds.from)} rises to ${money(facts.currencySymbol, facts.discountEnds.to)} a month.`,
    });
  }

  const order: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
  return risks.sort((a, b) => order[a.level] - order[b.level]);
}

export function worstRisk(risks: Risk[]): RiskLevel | null {
  if (risks.some((risk) => risk.level === "high")) return "high";
  if (risks.some((risk) => risk.level === "medium")) return "medium";
  if (risks.some((risk) => risk.level === "low")) return "low";
  return null;
}
