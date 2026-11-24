import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import GuideHeroDrafter, { type HeroExample } from "@/components/marketing/GuideHeroDrafter";
import type { TransitionFramework, TransitionMode } from "@/lib/ai/transition-draft";
import type { SeoPage } from "@/lib/seo-pages";
import { statementGuideForm } from "@/lib/statement-guide-forms";

/**
 * A guide's first block: on the statement guides, the drafter; on every guide
 * with them, the official links the searcher came for (25 Nov 2026 groundwork).
 *
 * STUB: it renders exactly the markup app/[slug]/page.tsx rendered at 776e537,
 * moved here so lane B can lay out the statement guides' desktop first screen
 * (B1) without editing the page that lane C also changes. Lane B owns this file.
 * `children` sits between the drafter and the official links, where /pricing's
 * plan chooser has always been.
 *
 * B1 (25 Nov 2026): on the five statement guides, at 1024px and wider, the
 * first screen is two columns: left the official form (its name, the links,
 * one sentence of what StoryLoop does with it) with the short example under
 * it; right the drafter, its box and button above the fold at 1366x768. 606
 * guide visits in four weeks gave 22 drafter touches because on a computer the
 * drafter sat below the first screen. Below 1024px the DOM order and the look
 * are today's (the grid classes are all lg:).
 */
export type StatementGuideHeroProps = {
  slug: string;
  /** The drafter on the first screen, for the statement guides only (HERO_DRAFTER_SLUGS). */
  drafter: { framework: TransitionFramework; mode: TransitionMode; choices?: TransitionFramework[] } | null;
  example: HeroExample | null;
  officialLinks?: SeoPage["officialLinks"];
  /** Where the official card's button goes and what it says, or null for no button. */
  tryLink: { href: string; label: string } | null;
  /** The statement guides that open with a finished example (#transition-example). */
  hasExample: boolean;
  children?: ReactNode;
};

export default function StatementGuideHero({ slug, drafter, example, officialLinks, tryLink, hasExample, children }: StatementGuideHeroProps) {
  const form = drafter ? statementGuideForm(slug) : null;
  const columns = Boolean(drafter && form);
  const body = (
    <>
      {drafter && (
        <GuideHeroDrafter
          desktopColumns={columns}
          framework={drafter.framework}
          mode={drafter.mode}
          choices={drafter.choices}
          followZone={slug === "end-of-year-learning-summary"}
          example={example}
          official={officialLinks?.heading}
        />
      )}
      {children}
      {/* The official login, form or guide the searcher came for, before
          anything else asks for their attention. New tab, so this page and
          its draft box are still here when they come back. */}
      {officialLinks && (
        <div id="official-links" className={`mt-6 max-w-3xl scroll-mt-24 rounded-3xl border border-sage-200 bg-white p-5 shadow-soft${columns ? " lg:col-start-1 lg:row-start-1 lg:mt-0 lg:max-w-none" : ""}`} data-testid="official-links">
          {columns && form && <p className="mb-2 hidden font-display text-lg font-bold leading-snug text-ink-900 lg:block" data-testid="official-form-name">{form.formName}</p>}
          <p className="text-xs font-bold uppercase tracking-wider text-sage-700">{officialLinks.heading}</p>
          <ul className="mt-3 space-y-2.5">
            {officialLinks.links.map((link) => (
              <li key={link.url} className="min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="guide_official_link"
                  className="inline-flex max-w-full items-start gap-2 text-base font-semibold text-clay-700 underline decoration-clay-300 underline-offset-4 hover:text-clay-900"
                >
                  <ExternalLink className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">{link.label}</span>
                </a>
                {link.note && <p className="mt-0.5 pl-6 text-sm leading-relaxed text-ink-600">{link.note}</p>}
              </li>
            ))}
          </ul>
          {/* What they came for first, then what StoryLoop does about it,
              still on a phone's first screen (the hero buttons sit below
              the intro, more than a screen down once this box is here). */}
          {columns && form && (
            <p className="mt-4 hidden border-t border-sage-100 pt-4 text-sm leading-relaxed text-ink-700 lg:block" data-testid="owned-sentence">{form.ownedSentence}</p>
          )}
          {tryLink && (
            <div className={`mt-4 border-t border-sage-100 pt-4${columns ? " lg:hidden" : ""}`}>
              <p className="text-sm leading-relaxed text-ink-700">
                Writing it now? StoryLoop drafts the wording from your own notes. You check it, then enter the final wording in the official statement yourself.
              </p>
              <Link href={tryLink.href} className="btn-primary mt-3 justify-center" data-track="guide_official_try">
                {tryLink.label}
              </Link>
              {hasExample && (
                <Link href="#transition-example" className="mt-1 flex min-h-[44px] items-center text-sm font-semibold text-clay-700 underline decoration-clay-300 underline-offset-2 hover:text-clay-900" data-track="guide_official_example">
                  Or see a finished example first
                </Link>
              )}
            </div>
          )}
        </div>
      )}
      {/* A guide with no official links still names its form beside the drafter, on a computer only. */}
      {columns && form && !officialLinks && (
        <div className="hidden scroll-mt-24 rounded-3xl border border-sage-200 bg-white p-5 shadow-soft lg:col-start-1 lg:row-start-1 lg:block" data-testid="official-links">
          <p className="font-display text-lg font-bold leading-snug text-ink-900" data-testid="official-form-name">{form.formName}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-700" data-testid="owned-sentence">{form.ownedSentence}</p>
        </div>
      )}
    </>
  );
  if (!columns) return body;
  return (
    <div className="lg:mt-6 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-x-6 lg:gap-y-3" data-testid="statement-guide-hero">
      {body}
    </div>
  );
}
