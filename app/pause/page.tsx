import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Billing",
  robots: { index: false, follow: false },
};

/**
 * Pause and cancel live on Billing only (Leo, 10 Nov 2026; proposal M, 18 Nov
 * 2026), so pause is never offered from an email. The "want to pause?" email
 * and the token page it opened are gone; an old link from one lands on
 * Billing, where Pause sits before Cancel. Signed out, Billing asks her to sign
 * in first and brings her back.
 */
export default function PausePage() {
  redirect("/billing");
}
