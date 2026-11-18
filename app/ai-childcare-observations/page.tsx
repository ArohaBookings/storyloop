import BuyerPage, { buyerMetadata } from "@/components/buyer/BuyerPage";

// A page for the people who buy (lib/buyer-pages.ts has who it is for and why).
export const metadata = buyerMetadata("ai-childcare-observations");

export default function Page() {
  return <BuyerPage slug="ai-childcare-observations" />;
}
