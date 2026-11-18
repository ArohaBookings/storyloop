import { NextResponse } from "next/server";

export const maxDuration = 60;

import { generateRoomPlanningBrief } from "@/lib/ai/generate";
import { billingBlockPayload, isBillingBlocked } from "@/lib/billing-access";
import { hasFeatureAccess, requiredPlanForFeature } from "@/lib/plans";
import { buildPlanningBoard } from "@/lib/planning-board";
import { createClient } from "@/lib/supabase/server";
import { getAccessProfile } from "@/lib/supabase/profiles";
import { normalizeAnyFramework } from "@/lib/international-frameworks";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getTeamContext, loadTeamChildren, type TeamContext } from "@/lib/centre-team-server";
import { pickBriefStories, pickTeamViewScope, type TeamViewScope } from "@/lib/centre-team";

function asRecord(value: unknown) {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

type StoryRow = {
  id: string;
  user_id?: string;
  child_id: string | null;
  child_name: string | null;
  story_text: string;
  outcomes: string[] | null;
  next_steps: string[] | null;
  metadata: unknown;
  location: string | null;
  created_at: string;
};

/** What the brief's writer reads from one story: the same fields for one educator or a team. */
function briefInput(story: StoryRow) {
  const metadata = asRecord(story.metadata);
  return {
    childName: story.child_name,
    storyText: story.story_text,
    learningSummary: typeof metadata.learningSummary === "string" ? metadata.learningSummary : "",
    nextSteps: Array.isArray(story.next_steps)
      ? story.next_steps.filter((item): item is string => typeof item === "string").slice(0, 4)
      : [],
    outcomes: Array.isArray(story.outcomes)
      ? story.outcomes.filter((item): item is string => typeof item === "string").slice(0, 4)
      : [],
    createdAt: story.created_at,
  };
}

/**
 * A leader's planning brief from her whole team (18 Nov 2026): only her own
 * stories and those of members who share with her (lib/centre-team.ts), read
 * through the service role because each educator can read only her own rows.
 * At most 12 stories reach the writer, taken in turn from each educator. The
 * board below the brief is counted without a model, so if the written brief
 * cannot be made the leader still sees the team's board.
 */
async function teamBrief(team: TeamContext, viewerId: string) {
  const scope = team.scope!;
  const { data, error } = await createAdminSupabase()
    .from("stories")
    .select("id, user_id, child_id, child_name, story_text, outcomes, next_steps, metadata, location, created_at")
    .in("user_id", scope.authorIds)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  const allowed = new Set(scope.authorIds);
  const stories = ((data ?? []) as StoryRow[]).filter((story) => allowed.has(story.user_id ?? ""));
  if (!stories.length) {
    return NextResponse.json({ error: "Nobody in your team has saved a story yet.", scope: "team", teamAvailable: true }, { status: 400 });
  }

  const picked = pickBriefStories(
    stories.map((story) => ({ id: story.id, userId: story.user_id ?? "", createdAt: story.created_at, story })),
    scope.authorIds,
  ).map((entry) => entry.story);
  const framework = normalizeAnyFramework(picked[0]?.location);

  const team_children = await loadTeamChildren(team);
  const boardChildren = team_children.children.map((child) => {
    const detail = team_children.details[child.profileIds[0]] ?? { ageGroup: null, interests: [] };
    return { id: child.key, name: child.name, age_group: detail.ageGroup, interests: detail.interests };
  });
  const boardStories = stories.slice(0, 20).map((story) => ({
    ...story,
    child_id: story.child_id ? team_children.keyOfProfile[story.child_id] ?? null : null,
  }));
  const planningBoard = buildPlanningBoard(boardStories, boardChildren);

  let brief = null;
  let briefError: string | null = null;
  try {
    brief = await generateRoomPlanningBrief({ framework, stories: picked.map(briefInput) });
  } catch (briefFailure) {
    console.error("Team planning brief not written:", briefFailure instanceof Error ? briefFailure.message.slice(0, 120) : "unknown");
    briefError = "The written brief could not be made just now. Try again in a minute. The team's board is below.";
  }

  return NextResponse.json({
    brief,
    briefError,
    planningBoard,
    storyCount: picked.length,
    authorCount: new Set(picked.map((story) => story.user_id)).size,
    framework,
    generatedAt: new Date().toISOString(),
    scope: "team",
    teamAvailable: true,
    // Ids only: which stories the brief read, and which ones open in Team stories rather than Story history.
    briefStoryIds: picked.map((story) => story.id),
    teamStoryIds: stories.filter((story) => story.user_id !== viewerId).map((story) => story.id),
  });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to create a planning brief" }, { status: 401 });

    const profile = await getAccessProfile(user);
    if (isBillingBlocked(profile)) {
      return NextResponse.json(billingBlockPayload(profile), { status: 402 });
    }

    if (!hasFeatureAccess(profile.plan, "roomPlanningBrief")) {
      return NextResponse.json({
        error: "Room Planning Brief is available on the Centre plan.",
        upgradeRequired: true,
        requiredPlan: requiredPlanForFeature("roomPlanningBrief"),
      }, { status: 403 });
    }

    // One brief is one model call: a ceiling no person writing plans will meet.
    const allowed = await consumeRateLimit({ scope: "team-planning", key: user.id, limit: 20, windowSeconds: 60 * 60 });
    if (!allowed) {
      return NextResponse.json({ error: "That is a lot of briefs this hour. Try again in a little while." }, { status: 429 });
    }

    // A leader whose team shares with her plans from the whole team by default;
    // "mine" is the brief exactly as it always was.
    const body = await request.json().catch(() => ({}));
    const team = await getTeamContext(user.id);
    const teamScopes: TeamViewScope[] = team.access.kind === "team" && (team.scope?.reviewAuthorIds.length ?? 0) > 0 ? ["team", "mine"] : [];
    const scope = teamScopes.length ? pickTeamViewScope(asRecord(body).scope, teamScopes) : "mine";
    if (scope === "team") return await teamBrief(team, user.id);

    const [{ data: stories, error }, { data: children, error: childrenError }] = await Promise.all([
      supabase
      .from("stories")
      .select("id, child_id, child_name, story_text, outcomes, next_steps, metadata, location, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
      supabase
        .from("child_profiles")
        .select("id, name, age_group, interests")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (error) throw error;
    if (childrenError) throw childrenError;
    if (!stories?.length) {
      return NextResponse.json({ error: "Create at least one story before generating a planning brief." }, { status: 400 });
    }

    const dominantFramework = normalizeAnyFramework(stories[0]?.location);
    const briefStories = stories.slice(0, 12);
    const brief = await generateRoomPlanningBrief({
      framework: dominantFramework,
      stories: briefStories.map((story) => briefInput(story as StoryRow)),
    });
    const planningBoard = buildPlanningBoard(stories, children ?? []);

    return NextResponse.json({
      brief,
      planningBoard,
      storyCount: briefStories.length,
      framework: dominantFramework,
      generatedAt: new Date().toISOString(),
      ...(teamScopes.length ? { scope: "mine", teamAvailable: true } : {}),
    });
  } catch (error) {
    console.error("Team planning error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create planning brief" },
      { status: 500 }
    );
  }
}
