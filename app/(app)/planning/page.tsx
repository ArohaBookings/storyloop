import { redirectToLogin } from "@/lib/auth/login-redirect";
import { createClient } from "@/lib/supabase/server";
import { getTeamContext } from "@/lib/centre-team-server";
import { pickTeamViewScope, type TeamViewScope } from "@/lib/centre-team";
import PlanningView from "./PlanningView";

/**
 * Planning (18 Nov 2026). A centre leader whose educators share with her
 * plans from the whole team by default, or from her own stories; the route
 * decides again what it may read (app/api/team-planning). Anyone else gets
 * the page exactly as it was.
 */
export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectToLogin();

  const team = await getTeamContext(user.id);
  const sharing = team.scope?.reviewAuthorIds.length ?? 0;
  const scopes: TeamViewScope[] = team.access.kind === "team" && sharing > 0 ? ["team", "mine"] : [];
  const scope = scopes.length ? pickTeamViewScope((await searchParams).scope, scopes) : null;

  // Keyed by view, so a brief made for the team never stays on screen under "Just mine".
  return <PlanningView key={scope ?? "own"} team={scope ? { scopes, scope, sharing } : null} />;
}
