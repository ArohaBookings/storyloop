import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import ChildVoices from "@/components/app/ChildVoices";

export const metadata = { title: "Children's own words" };

export default async function ChildVoicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(user);
  const back = (
    <Link href="/children" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
      <ArrowLeft className="h-4 w-4" /> Child profiles
    </Link>
  );

  if (!hasFeatureAccess(profile.plan, "childVoice")) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
        {back}
        <div className="card mt-5 p-6">
          <p className="section-title mb-1">Paid plans</p>
          <h1 className="font-display text-2xl font-bold text-ink-900">Not adults writing about children</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Every piece of documentation in this sector is an adult describing a child. Both curricula ask for the
            child&apos;s voice, and in practice it is a quote somebody half-remembered a week later. This is one big
            button a three-year-old can press to tell you about their own work, kept exactly as they said it. The
            recording never leaves the browser tab, and nothing is saved for a child whose family has not agreed.
          </p>
          <Link href="/billing?feature=child-voice" className="btn-primary mt-4 inline-flex text-sm">See plans</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
      {back}
      <div className="mt-4 mb-6">
        <p className="section-title mb-2">Children&apos;s own words</p>
        <h1 className="font-display text-3xl font-bold leading-tight text-ink-900">
          Let them tell you themselves.
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
          One big button, pressed by the child. They talk about what they made, they hear it back, and you write down
          what they said in their own words. The recording stays in this tab and is never saved anywhere.
        </p>
      </div>
      <ChildVoices />
    </div>
  );
}
