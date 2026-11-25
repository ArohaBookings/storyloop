import Link from "next/link";
import { ArrowDown } from "lucide-react";
import type { StatementGuideForm } from "@/lib/statement-guide-forms";
import DrafterSeen from "@/components/marketing/DrafterSeen";
import TransitionDemo from "@/components/marketing/TransitionDemo";
import type { TransitionFramework, TransitionMode } from "@/lib/ai/transition-draft";
import TransitionExample from "@/components/marketing/TransitionExample";

/**
 * The first phone screen of the statement guides (18 Nov 2026, proposal A,
 * fault P08): a short finished example, then the drafter's own box and button,
 * so a reader can try it without scrolling.
 *
 * Why. On a phone the worked example sat 2 to 3 screens down and the drafter
 * box 5 to 6 (review-2026-11-17, transition_example_position.json); in the
 * fortnight to 17 Nov one of 47 sessions on these guides started a draft.
 * Guides convert at 0.6% against the homepage's 3.7%, where the demo is near
 * the top. Nothing on the page is removed: the worked example moves up, folded
 * to its first lines (one tap opens all of it), and the official links, the
 * intro and every section follow, in the same order as before.
 *
 * The drafter is the same component with the same box and the same request;
 * `hero` only tightens its wrapper and puts the button first under the box.
 */
export type HeroExample =
  | { kind: "draft"; framework: TransitionFramework }
  | { kind: "paragraph"; text: string; href: string };

export default function GuideHeroDrafter({
  framework,
  mode,
  choices,
  example,
  official,
  followZone = false,
  desktopColumns = false,
  weekly,
}: {
  framework: TransitionFramework;
  mode: TransitionMode;
  choices?: TransitionFramework[];
  example: HeroExample | null;
  /** The official login or form box, now just below the drafter: one line here points to it. */
  official?: string;
  /** Open the drafter on the visitor's own curriculum (review 2, R2-11). */
  followZone?: boolean;
  /**
   * The desktop first screen (25 Nov 2026, B1): at 1024px and wider this block
   * opens into its parent's two-column grid (StatementGuideHero): the example
   * under the official card on the left, the drafter on the right. Below
   * 1024px nothing moves.
   */
  desktopColumns?: boolean;
  /** B8: the guide data's line for the weekly writer, under the drafter. */
  weekly?: StatementGuideForm["weekly"];
}) {
  return (
    <div className={desktopColumns ? "mt-3 sm:mt-6 lg:contents" : "mt-3 sm:mt-6"} data-testid="guide-hero-drafter-block">
      {official && (
        <a
          href="#official-links"
          className={`${desktopColumns ? "lg:hidden " : ""}inline-flex min-h-[32px] items-center gap-1.5 text-sm font-semibold text-sage-800 underline decoration-sage-300 underline-offset-2 hover:text-sage-900`}
          data-track="guide_hero_official"
        >
          <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
          {official}
        </a>
      )}
      <div className={desktopColumns ? "lg:col-start-1 lg:row-start-2 lg:min-w-0" : undefined}>
      {example?.kind === "draft" && <TransitionExample framework={example.framework} compact />}
      {example?.kind === "paragraph" && (
        <div className="mt-2 max-w-3xl rounded-2xl border border-clay-200 bg-white/90 px-3.5 py-2.5" data-testid="guide-hero-example">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-clay-700">An example, for an imagined child</p>
            <a
              href={example.href}
              className="flex-none text-xs font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900"
              data-track="guide_hero_example_more"
            >
              See it all
            </a>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink-800">{example.text}</p>
        </div>
      )}
      </div>
      <DrafterSeen id="transition-try" kind={mode === "summary" ? "summary" : "statement"} className={`mt-2 max-w-5xl scroll-mt-24 sm:mt-3${desktopColumns ? " lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:min-w-0" : ""}`}>
        <TransitionDemo framework={framework} mode={mode} choices={choices} hero followZone={followZone} />
        {/* B8 (25 Nov 2026): the weekly job, in words from the guide data (lib/statement-guide-forms.ts). */}
        {weekly && (
          <p className="mt-3 text-sm leading-relaxed text-ink-600" data-testid="guide-weekly-line">
            {weekly.lead}{" "}
            {weekly.links.map((link, index) => (
              <span key={link.href}>
                {index > 0 && " or "}
                <Link href={link.href} className="font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2" data-track="guide_weekly_stories">
                  {link.label}
                </Link>
              </span>
            ))}
            .
          </p>
        )}
      </DrafterSeen>
    </div>
  );
}
