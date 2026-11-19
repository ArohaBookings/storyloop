import Link from "next/link";
import { ArrowRight, Eye, FileCheck2, Lock } from "lucide-react";
import { redirectToLogin } from "@/lib/auth/login-redirect";
import { createClient } from "@/lib/supabase/server";
import { countPrivateStories, getTeamContext, loadTeamQueue } from "@/lib/centre-team-server";
import { SAMPLE_PRIVATE_STORIES, sampleCountryFor, sampleQueue } from "@/lib/sample-team";
import { withStoryCheck } from "@/lib/check-my-story";
import TeamReviewQueue from "@/components/app/TeamReviewQueue";
import { SampleTeamBanner, SampleTeamOffer } from "@/components/app/SampleTeam";

export const metadata = { title: "Team stories" };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <p className="section-title mb-1">Centre</p>
      <h1 className="font-display text-3xl font-bold text-ink-900">Your team&apos;s stories</h1>
      {children}
    </div>
  );
}

function Note({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <div className="card mt-5 p-5" data-testid={testId}>
      {children}
    </div>
  );
}

/**
 * Team stories (18 Nov 2026): a leader's review queue. The stories her
 * educators choose to share, newest first, each with one tap for "looks good"
 * or a short note the author sees. Educators who keep their stories private
 * appear as a count, never as a story (lib/centre-team.ts).
 */
export default async function TeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectToLogin();

  const ctx = await getTeamContext(user.id);

  if (ctx.access.kind === "none") {
    return (
      <Shell>
        <Note testId="team-none">
          <p className="text-sm leading-relaxed text-ink-700">
            Team stories are for a centre&apos;s leaders: the stories your educators choose to share with you, with one tap to
            say they look good or to leave a short note.
          </p>
          <Link href="/centre" className="btn-primary mt-3 inline-flex text-sm">
            Go to My centre <ArrowRight className="h-4 w-4" />
          </Link>
        </Note>
      </Shell>
    );
  }

  if (ctx.access.kind === "not_leader") {
    return (
      <Shell>
        <Note testId="team-not-leader">
          <p className="text-sm leading-relaxed text-ink-700">
            Your centre&apos;s leaders see the stories you choose to share, and can mark one as looking good or leave you a
            short note. You will find their note on that story in Story history.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/history" className="btn-primary text-sm">Story history</Link>
            <Link href="/centre" className="btn-secondary text-sm">What I share</Link>
          </div>
        </Note>
      </Shell>
    );
  }

  // A leader. The sample team shows only while nobody else is in the centre.
  if (ctx.sample.show) {
    const { data: prefs } = await supabase.from("profiles").select("story_preferences").eq("id", user.id).maybeSingle();
    const country = sampleCountryFor((prefs?.story_preferences as { defaultFramework?: unknown } | null)?.defaultFramework);
    return (
      <Shell>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Stories your educators share with you, newest first. Tap Looks good, or leave a short note they see on their story.
        </p>
        <div className="mt-5">
          <SampleTeamBanner />
          <TeamReviewQueue items={sampleQueue(new Date(), country).map(withStoryCheck)} sample />
          <p className="mt-4 rounded-2xl bg-cream-50 p-3 text-sm leading-relaxed text-ink-700" data-testid="team-private-count">
            <Lock className="mr-1 inline h-3.5 w-3.5 align-[-2px] text-ink-500" />
            1 educator keeps their stories private. You see only how many: {SAMPLE_PRIVATE_STORIES} stories in the last 30 days,
            never what.
          </p>
        </div>
      </Shell>
    );
  }

  if (ctx.access.kind === "lapsed") {
    return (
      <Shell>
        <Note testId="team-lapsed">
          <p className="text-sm leading-relaxed text-ink-700">
            Team stories open while your centre plan is running. Everyone keeps every story they wrote, and their own
            view is just as it was.
          </p>
          <Link href="/centre" className="btn-primary mt-3 inline-flex text-sm">
            Go to My centre <ArrowRight className="h-4 w-4" />
          </Link>
        </Note>
        {ctx.sample.offer && (
          <div className="mt-4">
            <SampleTeamOffer />
          </div>
        )}
      </Shell>
    );
  }

  const scope = ctx.scope;
  const items = await loadTeamQueue(ctx);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const privateCount = scope?.privateMemberIds.length ?? 0;
  const privateStories = privateCount ? await countPrivateStories(ctx, since) : 0;

  return (
    <Shell>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">
        Stories your educators share with you, newest first. Tap Looks good, or leave a short note they see on their story.
      </p>

      <div className="mt-5">
        {items.length > 0 ? (
          <TeamReviewQueue items={items} />
        ) : ctx.otherMembers === 0 ? (
          <>
            <Note testId="team-empty">
              <p className="text-sm leading-relaxed text-ink-700">
                Nobody is in your team yet. Invite your educators on My centre. Their stories stay private until each of them
                chooses to share.
              </p>
              <Link href="/centre" className="btn-primary mt-3 inline-flex text-sm">
                Invite my team <ArrowRight className="h-4 w-4" />
              </Link>
            </Note>
            {ctx.sample.offer && (
              <div className="mt-4">
                <SampleTeamOffer />
              </div>
            )}
          </>
        ) : (
          <Note testId="team-nothing-shared">
            <p className="text-sm leading-relaxed text-ink-700">
              {(scope?.reviewAuthorIds.length ?? 0) > 0
                ? "Nobody has written a story yet. Shared stories will show here, newest first."
                : "Nobody has shared their stories with you yet. Each educator chooses that for themselves on My centre."}
            </p>
          </Note>
        )}

        {privateCount > 0 && (
          <p className="mt-4 rounded-2xl bg-cream-50 p-3 text-sm leading-relaxed text-ink-700" data-testid="team-private-count">
            <Lock className="mr-1 inline h-3.5 w-3.5 align-[-2px] text-ink-500" />
            {plural(privateCount, "educator keeps their", "educators keep their")} stories private. You see only how many:{" "}
            {plural(privateStories, "story", "stories")} in the last 30 days, never what.
          </p>
        )}
      </div>

      {(scope?.reviewAuthorIds.length ?? 0) > 0 && (
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-clay-100 pt-4 text-sm">
          <Link href="/evidence" className="inline-flex min-h-[44px] items-center gap-1.5 font-semibold text-clay-700 hover:text-clay-900">
            <FileCheck2 className="h-4 w-4" /> The team&apos;s evidence pack
          </Link>
          <Link href="/children" className="inline-flex min-h-[44px] items-center gap-1.5 font-semibold text-clay-700 hover:text-clay-900">
            <Eye className="h-4 w-4" /> Who hasn&apos;t been noticed lately
          </Link>
        </div>
      )}
    </Shell>
  );
}
