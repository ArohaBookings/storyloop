import BuyerPage, { buyerMetadata } from "@/components/buyer/BuyerPage";

// A page for the people who buy (lib/buyer-pages.ts has who it is for and why).
// Metadata and page both answer 404 while the page is held out of a release (HELD_BUYER_PAGES_ON).
export function generateMetadata() {
  return buyerMetadata("documentation-workload-early-childhood");
}

export default function Page() {
  return <BuyerPage slug="documentation-workload-early-childhood" />;
}
