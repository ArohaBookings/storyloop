import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Repeat } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profiles";
import { hasFeatureAccess } from "@/lib/plans";
import {
  buildOwnSignals,
  describeSignal,
  MIN_SERVICES_PER_SIGNAL,
  type PracticeRecord,
} from "@/lib/practice-signals";

export const metadata = { title: "What you came back to" };

const STORY_LIMIT = 500;

function readMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export default async function PracticePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await getOrCreateProfile(user);
  const back = (
    <Link href="/planning" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900">
      <ArrowLeft className="h-4 w-4" /> Planning brief
    </Link>
  );

  if (!hasFeatureAccess(profile.plan, "practiceSignals")) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
        {back}
        <div className="card mt-5 p-6">
          <p className="section-title mb-1">Paid plans</p>
          <h1 className="font-display text-2xl font-bold text-ink-900">What you came back to</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Every platform stores the plan. StoryLoop stores what happened when you went back to it, because a next step
            gets marked tried or worth continuing. Over a year that becomes a record of your own practice: the things you
            keep returning to and keeping.
          </p>
          <Link href="/billing?feature=practice-signals" className="btn-primary mt-4 inline-flex text-sm">See plans</Link>
        </div>
      </div>
    );
  }

  const { data: stories } = await supabase
    .from("stories")
    .select("outcomes, metadata")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(STORY_LIMIT);

  const records: PracticeRecord[] = (stories ?? []).flatMap((row) => {
    const metadata = readMetadata(row.metadata);
    const themes = [
      ...(Array.isArray(row.outcomes) ? row.outcomes.filter((o): o is string => typeof o === "string") : []),
      ...(Array.isArray(metadata.learningDispositions)
        ? metadata.learningDispositions.filter((d): d is string => typeof d === "string")
        : []),
    ];
    const steps = Array.isArray(metadata.nextStepProgress) ? metadata.nextStepProgress : [];
    return steps.flatMap((entry) => {
      const item = readMetadata(entry);
      const text = typeof item.text === "string" ? item.text : "";
      const outcome = item.status === "tried" || item.status === "continue" ? item.status : "planned";
      if (!text) return [];
      return themes.map((theme) => ({ serviceId: user.id, theme, text, outcome } as PracticeRecord));
    });
  });

  const signals = buildOwnSignals({ records }).slice(0, 25);

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 md:p-8">
      {back}

      <div className="mt-4">
        <p className="section-title mb-2">Your practice</p>
        <h1 className="font-display text-3xl font-bold leading-tight text-ink-900">What you came back to.</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Every platform stores the plan. This is the other half: what happened when you went back to it. These are
          things you have returned to more than once and, sometimes, decided were worth keeping.
        </p>
      </div>

      {signals.length === 0 ? (
        <div className="card mt-6 p-6">
          <p className="text-sm leading-relaxed text-ink-600">
            Nothing here yet. This fills in as you mark next steps as tried or worth continuing on your stories, which
            is also the part of the planning cycle a review visit asks about. Two returns to the same idea is enough to
            show up here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {signals.map((signal) => (
            <li key={`${signal.theme}-${signal.phrase}`} className="card p-5">
              <p className="text-[15px] leading-relaxed text-ink-900">{signal.phrase}</p>
              <p className="mt-1.5 text-xs text-ink-500">
                {signal.theme} · {describeSignal(signal, "own")}
              </p>
            </li>
          ))}
        </ul>
      )}

      <section className="card mt-6 p-6">
        <p className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
          <Repeat className="h-4 w-4 text-clay-700" /> Later, across services
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Once enough services have opted in, the same signal can be counted across all of them: not what educators
          planned, but what they came back and marked worth continuing. Nothing is shown unless at least{" "}
          {MIN_SERVICES_PER_SIGNAL} separate services wrote something that means the same thing, which is both what
          makes a signal believable and what makes anything specific to one room impossible to surface.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          It will never say a thing works. It can only ever say what educators did and what they decided afterwards.
        </p>
        <Link href="/support" className="btn-secondary mt-3 inline-flex text-xs">Contributing is opt-in, on Support</Link>
      </section>
    </div>
  );
}
