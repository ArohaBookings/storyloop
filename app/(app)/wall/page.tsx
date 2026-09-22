import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import WallCards from "@/components/app/WallCards";

export const metadata = { title: "Wall cards" };

export default async function WallCardsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(user);
  const back = (
    <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 print:hidden">
      <ArrowLeft className="h-4 w-4" /> Dashboard
    </Link>
  );

  if (!hasFeatureAccess(profile.plan, "wallCards")) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
        {back}
        <div className="card mt-5 p-6">
          <p className="section-title mb-1">Paid plans</p>
          <h1 className="font-display text-2xl font-bold text-ink-900">The wall that explains itself</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            A parent stands in front of a painting at pickup and has no idea what it took to make it. Print a small code
            beside the display and they can read the learning behind it on their own phone, with no app and no sign-in.
            The page is about the experience, never about a child: every name, date and age is removed before you even
            see it, and nothing goes on a wall until you have read exactly what a stranger would see.
          </p>
          <Link href="/billing?feature=wall-cards" className="btn-primary mt-4 inline-flex text-sm">See plans</Link>
        </div>
      </div>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://storyloop.space";

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 md:p-8 print:max-w-none print:p-0">
      <div className="print:hidden">
        {back}
        <div className="mt-4 mb-6">
          <p className="section-title mb-2">Wall cards</p>
          <h1 className="font-display text-3xl font-bold leading-tight text-ink-900">
            Let the wall explain itself.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
            A code beside a display, so a family can read the learning behind what they are looking at while they wait.
            No app, no sign-in, and nothing on the page that could identify a child.
          </p>
        </div>
      </div>
      <WallCards appUrl={appUrl} />
    </div>
  );
}
