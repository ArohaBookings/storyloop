import { NextResponse } from "next/server";
import { createStripe } from "@/lib/stripe-client";
import {
  CENTRE_TRIAL_DAYS,
  FOUNDING_CENTRE_SPOTS,
  FOUNDING_DISCOUNT_MONTHS,
  FOUNDING_DISCOUNT_PERCENT,
  foundingSpotsLeft,
} from "@/lib/centre-offer";

export const dynamic = "force-dynamic";

/**
 * The centre offer as it stands right now, for the pricing and centre pages.
 * Public on purpose: it carries no account data, only the offer and how many
 * founding spots Stripe says are left (null when Stripe could not be asked, in
 * which case pages show the offer without a number rather than a guess).
 */
export async function GET() {
  let spotsLeft: number | null = null;
  try {
    spotsLeft = await foundingSpotsLeft(createStripe());
  } catch {
    spotsLeft = null;
  }
  return NextResponse.json(
    {
      trialDays: CENTRE_TRIAL_DAYS,
      noCardNeeded: true,
      founding: {
        totalSpots: FOUNDING_CENTRE_SPOTS,
        spotsLeft,
        discountPercent: FOUNDING_DISCOUNT_PERCENT,
        discountMonths: FOUNDING_DISCOUNT_MONTHS,
      },
    },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
