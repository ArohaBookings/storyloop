import Link from "next/link";
import type { TeamViewScope } from "@/lib/centre-team";

const DEFAULT_LABELS: Record<TeamViewScope, string> = { team: "Whole team", mine: "Just mine", sample: "Sample team" };

/**
 * Whole team, just mine, or the sample team (18 Nov 2026). Shown only when a
 * page has more than one view to offer, so an educator sees nothing new.
 */
export default function TeamScopeSwitch({
  scopes,
  current,
  hrefs,
  labels = DEFAULT_LABELS,
}: {
  scopes: TeamViewScope[];
  current: TeamViewScope;
  hrefs: Record<TeamViewScope, string>;
  labels?: Record<TeamViewScope, string>;
}) {
  if (scopes.length < 2) return null;
  return (
    <nav aria-label="Whose stories" className="flex flex-wrap gap-2 print:hidden" data-testid="team-scope-switch">
      {scopes.map((scope) => (
        <Link
          key={scope}
          href={hrefs[scope]}
          aria-current={scope === current ? "page" : undefined}
          data-testid={`team-scope-${scope}`}
          className={`inline-flex min-h-[44px] items-center rounded-full border px-3 py-1.5 text-sm ${
            scope === current ? "border-sage-700 bg-sage-700 text-paper" : "border-sage-200 text-ink-700 hover:border-sage-300"
          }`}
        >
          {labels[scope]}
        </Link>
      ))}
    </nav>
  );
}
