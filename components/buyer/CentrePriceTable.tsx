import { getPlanByKey } from "@/lib/plans";
import CentreStart from "@/components/buyer/CentreStart";

/**
 * StoryLoop's two centre prices as a plain table, on the first screen of the
 * page a director (or an AI assistant) reads for "what does it cost a
 * centre", with the one button to start under it. Built from lib/plans.ts, so
 * it can never show a price checkout does not charge. StoryLoop's own prices
 * only: no other pricing model shown (correction C10 of the 18 Nov 2026 check).
 */
export default function CentrePriceTable() {
  const rows = (["centre_starter", "centre_growth"] as const).map((key) => getPlanByKey(key));
  return (
    <div className="mt-5 max-w-xl" data-testid="centre-price-table">
      <table className="w-full overflow-hidden rounded-2xl border border-clay-200 bg-white text-left text-sm shadow-soft">
        <caption className="sr-only">StoryLoop centre plans and prices</caption>
        <thead className="bg-cream-50 text-xs font-bold uppercase tracking-wider text-ink-500">
          <tr>
            <th scope="col" className="px-3 py-2.5 sm:px-4">Plan</th>
            <th scope="col" className="px-3 py-2.5 sm:px-4">A month</th>
            <th scope="col" className="px-3 py-2.5 sm:px-4">Educators</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-clay-100 text-ink-800">
          {rows.map((plan) => (
            <tr key={plan.key}>
              <th scope="row" className="px-3 py-3 font-semibold text-ink-900 sm:px-4">{plan.name}</th>
              <td className="px-3 py-3 sm:px-4">
                NZ${plan.price.NZD} <span className="text-ink-500">or</span> A${plan.price.AUD}
              </td>
              <td className="px-3 py-3 sm:px-4">Up to {plan.seats}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-sm font-semibold text-ink-700">Unlimited children, no per-child fee. GST inclusive.</p>
      <div className="mt-4">
        <CentreStart />
      </div>
    </div>
  );
}
