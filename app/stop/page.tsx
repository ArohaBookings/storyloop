import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import PageTracker from "@/components/analytics/PageTracker";
import { verifyStopToken } from "@/lib/leader-email";

export const metadata = {
  title: "Stop these emails",
  robots: { index: false, follow: false },
};

/**
 * "Stop these emails" from a leader email (25 Nov 2026, A2). Opening this page
 * changes nothing: link scanners open every link in an email, so only the
 * button (a POST) stops the emails. Once stopped, StoryLoop never emails that
 * address for anyone again.
 */
export default async function StopPage({ searchParams }: { searchParams?: Promise<{ t?: string; done?: string }> }) {
  const params = await searchParams;
  const token = typeof params?.t === "string" ? params.t : "";
  const valid = Boolean(verifyStopToken(token));
  const done = params?.done === "1";
  return (
    <main className="min-h-screen bg-paper px-4 py-12">
      <PageTracker mode="private" />
      <div className="mx-auto max-w-lg rounded-3xl border border-clay-100 bg-white p-8 text-center shadow-soft" data-testid="leader-stop">
        {done ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-100 text-sage-700"><CheckCircle2 className="h-6 w-6" /></div>
            <h1 className="font-display text-3xl font-bold text-ink-900">Done. No more of these emails.</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">StoryLoop will not email this address for anyone again. Any link you already have still opens until it ends.</p>
          </>
        ) : valid ? (
          <>
            <h1 className="font-display text-3xl font-bold text-ink-900">Stop these emails?</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">An educator asked StoryLoop to send you something to check. Press the button and StoryLoop will never email this address again, for anyone.</p>
            <form method="post" action="/api/email/leader-stop" className="mt-6">
              <input type="hidden" name="t" value={token} />
              <button type="submit" className="btn-primary min-h-[48px] w-full justify-center" data-testid="leader-stop-button">Stop these emails</button>
            </form>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-bold text-ink-900">This link does not work</h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-600">Email ariacareapp@gmail.com and we will stop the emails by hand.</p>
          </>
        )}
        <div className="mt-6">
          <Link href="/" className="btn-secondary justify-center">Back to StoryLoop</Link>
        </div>
      </div>
    </main>
  );
}
