import type { Metadata } from "next";
import FamilyPage from "@/components/marketing/FamilyPage";

// A private page: never indexed, never followed, and the link's key is in the
// part of the address a browser does not send to any server (see FamilyPage).
export const metadata: Metadata = {
  title: "Your child's learning stories",
  description: "A private page for one child's family.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export default function Page() {
  return <FamilyPage />;
}
