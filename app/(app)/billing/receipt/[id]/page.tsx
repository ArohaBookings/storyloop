import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type Stripe from "stripe";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { createStripe } from "@/lib/stripe-client";
import { STATEMENT_LINE } from "@/lib/stripe-branding";
import PrintButton from "@/components/app/PrintButton";

export const metadata = { title: "Receipt" };
export const dynamic = "force-dynamic";

/**
 * A StoryLoop receipt, rendered by StoryLoop. Stripe's hosted invoice pages and
 * PDFs carry the shared account's name, so StoryLoop customers are never sent
 * to them. Only the account's own invoices are shown.
 */

function money(cents: number, currency: string) {
  const symbol = currency.toLowerCase() === "nzd" ? "NZ$" : currency.toLowerCase() === "aud" ? "A$" : `${currency.toUpperCase()} `;
  const sign = cents < 0 ? "-" : "";
  return `${sign}${symbol}${(Math.abs(cents) / 100).toFixed(2)}`;
}

function day(seconds: number | null | undefined) {
  if (!seconds) return null;
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "long", year: "numeric", timeZone: "Pacific/Auckland" }).format(new Date(seconds * 1000));
}

function discountName(amount: Stripe.Invoice.TotalDiscountAmount) {
  const discount = amount.discount;
  if (!discount || typeof discount === "string") return "Discount";
  const source = (discount as { source?: { coupon?: string | Stripe.Coupon | null } }).source;
  const coupon = source?.coupon ?? (discount as { coupon?: string | Stripe.Coupon | null }).coupon;
  return typeof coupon === "object" && coupon?.name ? coupon.name : "Discount";
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^in_[A-Za-z0-9]+$/.test(id)) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/billing/receipt/${id}`)}`);
  const profile = await getOrCreateProfile(user);
  if (!profile?.stripe_customer_id) notFound();

  let invoice: Stripe.Invoice;
  try {
    invoice = await createStripe().invoices.retrieve(id, { expand: ["total_discount_amounts.discount.source.coupon"] });
  } catch {
    notFound();
  }
  const customer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (customer !== profile.stripe_customer_id) notFound();
  if (invoice.status !== "paid" && invoice.status !== "open") notFound();

  const paid = invoice.status === "paid";
  const paidOn = day(invoice.status_transitions?.paid_at);
  const credit = (invoice.starting_balance ?? 0) < 0 ? Math.min(invoice.total, -(invoice.starting_balance ?? 0)) : 0;

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6 md:p-8 print:p-0">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link href="/billing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-clay-700 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Billing
        </Link>
        <PrintButton label="Print or save as PDF" />
      </div>

      <article className="card p-6 sm:p-8" data-testid="storyloop-receipt">
        <header className="flex items-start justify-between gap-4 border-b border-clay-100 pb-5">
          <div>
            <Image src="/brand/storyloop-logo.png" alt="StoryLoop" width={150} height={40} className="h-9 w-auto" />
            <p className="mt-2 text-xs text-ink-500">storyloop.space</p>
          </div>
          <div className="text-right">
            <h1 className="font-display text-2xl font-bold text-ink-900">{paid ? "Receipt" : "Payment due"}</h1>
            {invoice.number && <p className="mt-1 text-xs text-ink-500">No. {invoice.number}</p>}
            <p className="mt-1 text-xs text-ink-500">{paid ? `Paid ${paidOn ?? ""}` : `Issued ${day(invoice.created) ?? ""}`}</p>
          </div>
        </header>

        <section className="mt-5 text-sm text-ink-700">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-500">Billed to</p>
          <p className="mt-1">{invoice.customer_name || profile.full_name || invoice.customer_email || user.email}</p>
          {invoice.customer_email && <p className="text-ink-500">{invoice.customer_email}</p>}
        </section>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-b border-clay-100 text-left text-xs uppercase tracking-wider text-ink-500">
              <th className="py-2 font-semibold">Description</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.data.map((line) => (
              <tr key={line.id} className="border-b border-clay-50 align-top">
                <td className="py-3 pr-4 text-ink-800">
                  {line.description}
                  {line.period?.start && line.period?.end && (
                    <span className="block text-xs text-ink-500">{day(line.period.start)} to {day(line.period.end)}</span>
                  )}
                </td>
                <td className="py-3 text-right tabular-nums text-ink-800">{money(line.amount, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-ink-600"><dt>Subtotal</dt><dd className="tabular-nums">{money(invoice.subtotal, invoice.currency)}</dd></div>
          {(invoice.total_discount_amounts ?? []).filter((amount) => amount.amount > 0).map((amount, index) => (
            <div key={index} className="flex justify-between text-ink-600"><dt>{discountName(amount)}</dt><dd className="tabular-nums">{money(-amount.amount, invoice.currency)}</dd></div>
          ))}
          <div className="flex justify-between text-ink-600"><dt>Total</dt><dd className="tabular-nums">{money(invoice.total, invoice.currency)}</dd></div>
          {credit > 0 && (
            <div className="flex justify-between text-ink-600"><dt>StoryLoop credit applied</dt><dd className="tabular-nums">{money(-credit, invoice.currency)}</dd></div>
          )}
          <div className="flex justify-between border-t border-clay-100 pt-2 text-base font-bold text-ink-900">
            <dt>{paid ? "Amount paid" : "Amount due"}</dt>
            <dd className="tabular-nums">{money(paid ? invoice.amount_paid : invoice.amount_due, invoice.currency)}</dd>
          </div>
        </dl>

        <footer className="mt-8 border-t border-clay-100 pt-4 text-xs leading-relaxed text-ink-500">
          <p>{STATEMENT_LINE} Questions about this receipt? Reply to any StoryLoop email or use Support in StoryLoop.</p>
        </footer>
      </article>
    </div>
  );
}
