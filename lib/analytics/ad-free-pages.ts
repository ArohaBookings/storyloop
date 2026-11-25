/**
 * Pages where no advertising or remarketing tag ever loads (release decision 4,
 * 19 Nov 2026, widened after review 1, R1-01): every page that shows a child's
 * story, a statement or an educator's notes.
 *
 * - /family: the Family link, a family reading their child's story.
 * - /check: a leader checking one story an educator sent them.
 * - /w/[code]: a wall card's story, opened from its QR code.
 * - /check-my-story: the public story check (held off in this release).
 * - /join: a team invitation; /unsubscribe and /stop: emailed links (the
 *   leader's stop link carries her address, so nothing may read that URL).
 * - Every page of the signed-in app (app/(app)/*) and the admin pages: they
 *   show stories, notes, children and statements. tests/ad-free-pages.test.ts
 *   fails if a new app page is not on this list.
 *
 * The one signed-in moment Google Ads measures, a paid plan starting, is sent
 * from /upgraded, a page that shows nothing but "Starting your plan" and then
 * moves on to the page she came from (app/upgraded/page.tsx).
 *
 * The root layout's Google tag (components/analytics/GoogleAdsTag.tsx) asks
 * this file before it renders anything, so on these pages no Google script is
 * in the page at all, and arriving at one inside a session that already has
 * the tag withdraws ad consent. Pure.
 */
export const AD_FREE_PUBLIC_PAGES: readonly string[] = ["/family", "/check", "/w", "/check-my-story", "/join", "/unsubscribe", "/stop"];

/** Every top-level page of the signed-in app (app/(app)) and the admin pages. */
export const AD_FREE_APP_PAGES: readonly string[] = [
  "/billing", "/centre", "/centre-tools", "/children", "/dashboard", "/evidence", "/feedback", "/generate", "/group",
  "/history", "/insights", "/pickup", "/planning", "/practice", "/reliever", "/roi", "/room", "/statement", "/support",
  "/team", "/today", "/voices", "/wall", "/year", "/admin", "/admin-login",
];

export const AD_FREE_PAGES: readonly string[] = [...AD_FREE_PUBLIC_PAGES, ...AD_FREE_APP_PAGES];

/** Whether an advertising tag may load on this path. Pure. */
export function adsTagAllowedOn(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return !AD_FREE_PAGES.some((page) => path === page || path.startsWith(`${page}/`));
}
