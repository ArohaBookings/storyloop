import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

import { applyUnsubscribe } from "@/lib/email/unsubscribe-apply";

export const metadata = {
  title: "Unsubscribe | StoryLoop",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const result = await applyUnsubscribe(params?.token);
  const Icon = result.ok ? CheckCircle2 : XCircle;

  return (
    <main className="min-h-screen bg-paper px-4 py-12">
      <div className="mx-auto max-w-lg rounded-3xl border border-clay-100 bg-white p-8 text-center shadow-soft">
        <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${result.ok ? "bg-sage-100 text-sage-700" : "bg-red-50 text-red-700"}`}>
          <Icon className="h-6 w-6" />
        </div>
        <p className="section-title mb-2">StoryLoop email preferences</p>
        <h1 className="font-display text-3xl font-bold text-ink-900">
          {result.ok ? "Unsubscribed" : "We could not update that link"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">{result.message}</p>
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          You may still receive account, billing, support, and security emails that are needed to run StoryLoop.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/" className="btn-secondary justify-center">Back to StoryLoop</Link>
          <Link href="/support" className="btn-primary justify-center">Contact support</Link>
        </div>
      </div>
    </main>
  );
}
