/**
 * Pages that show a child's story to someone other than the educator: no
 * advertising or remarketing tag ever loads on them (release decision 4,
 * 19 Nov 2026).
 *
 * - /family: the Family link, a family reading their child's story.
 * - /check: a leader checking one story an educator sent them.
 * - /w/[code]: a wall card's story, opened from its QR code.
 * - /check-my-story: the public story check (held off in this release; listed
 *   so it can never be switched on with the tag).
 *
 * The root layout's Google tag (components/analytics/GoogleAdsTag.tsx) asks
 * this file before it renders anything, so on these pages no Google script is
 * in the page at all, and arriving at one inside a session that already has
 * the tag withdraws ad consent. A new page that shows a child's story to a
 * family or a leader is added here. Pure.
 */
export const AD_FREE_PAGES: readonly string[] = ["/family", "/check", "/w", "/check-my-story"];

/** Whether an advertising tag may load on this path. Pure. */
export function adsTagAllowedOn(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return !AD_FREE_PAGES.some((page) => path === page || path.startsWith(`${page}/`));
}
