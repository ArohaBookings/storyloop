import type { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import LeaderCheckPage from "@/components/marketing/LeaderCheckPage";

/**
 * Where a leader checks one story an educator sent them (lib/story-check.ts).
 * The page itself is the same for everyone and holds nothing: the story is
 * fetched in the browser with the key that sits after the # in the link.
 * Kept out of search engines; there is nothing here for them.
 */
export const metadata: Metadata = {
  title: "Check a learning story",
  description: "An educator has asked you to check a learning story before it goes to families.",
  robots: { index: false, follow: false },
};

export default function CheckPage() {
  return (
    <>
      <Navbar />
      <main className="bg-cream-50/60 pb-16 pt-24 sm:pt-28">
        <LeaderCheckPage />
      </main>
      <Footer />
    </>
  );
}
