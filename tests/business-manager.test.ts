import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  SEARCH_GROWTH_TARGET,
  blogPostsTarget,
  channelFor,
  cleanRundown,
  plainRundown,
  requiredWeeklyGrowth,
  trendWeeklyGrowth,
  weeklyGrowth,
  type WeeklyMetrics,
} from "../lib/business-manager";

// Leo, 3 Nov 2026: "see our Google SEO, AEO, Geo, Bing, see how many people are
// going through Facebook… aiming to 8% growth rate on SEO per week".
test("every visit is put in the channel it came from", () => {
  assert.equal(channelFor("google.com"), "google");
  assert.equal(channelFor("www.google.com.au"), "google");
  assert.equal(channelFor("google.co.nz"), "google");
  assert.equal(channelFor("com.google.android.googlequicksearchbox"), "google");
  assert.equal(channelFor("bing.com"), "bing");
  assert.equal(channelFor("cn.bing.com"), "bing");
  assert.equal(channelFor("au.search.yahoo.com"), "other_search");
  assert.equal(channelFor("duckduckgo.com"), "other_search");
  // AI answers (AEO/GEO): Gemini is not Google search.
  assert.equal(channelFor("gemini.google.com"), "ai");
  assert.equal(channelFor("chatgpt.com"), "ai");
  assert.equal(channelFor("", "chatgpt.com"), "ai");
  assert.equal(channelFor("perplexity.ai"), "ai");
  assert.equal(channelFor("copilot.microsoft.com"), "ai");
  // Facebook in all its forms, Instagram included (the page posts and the ad).
  for (const host of ["facebook.com", "m.facebook.com", "l.facebook.com", "lm.facebook.com", "instagram.com"]) assert.equal(channelFor(host), "facebook", host);
  assert.equal(channelFor("", "facebook"), "facebook");
  assert.equal(channelFor("google.com", "google", "cpc"), "ads", "paid clicks are not search");
  assert.equal(channelFor("", "resend", "email"), "email");
  assert.equal(channelFor(null), "direct");
  assert.equal(channelFor("storyloop.space"), "direct");
  assert.equal(channelFor("officeapps.live.com"), "other");
});

test("growth needs a real base, and the four-week trend smooths one noisy week", () => {
  assert.equal(weeklyGrowth(108, 100), 0.08000000000000007);
  assert.equal(weeklyGrowth(5, 4), null, "four visits is not a base");
  assert.ok(Math.abs((trendWeeklyGrowth(136, 100) ?? 0) - 0.0799) < 0.001, "36% over four weeks is about 8% a week");
  assert.equal(trendWeeklyGrowth(30, 10), null);
  assert.equal(SEARCH_GROWTH_TARGET, 0.08);
});

test("the weekly growth needed to reach NZ$10k MRR in a year", () => {
  const needed = requiredWeeklyGrowth(168) ?? 0;
  assert.ok(needed > 0.08 && needed < 0.09, String(needed));
  assert.equal(requiredWeeklyGrowth(10_000), 0);
  assert.equal(requiredWeeklyGrowth(0), null);
});

test("the blog's pace: two guides a week while search is behind, one when on target", () => {
  assert.equal(blogPostsTarget({ searchGrowth: 0.02, topicsLeft: 10 }), 2);
  assert.equal(blogPostsTarget({ searchGrowth: null, topicsLeft: 10 }), 2, "no data yet counts as behind");
  assert.equal(blogPostsTarget({ searchGrowth: 0.09, topicsLeft: 10 }), 1);
  assert.equal(blogPostsTarget({ searchGrowth: 0.02, topicsLeft: 1 }), 1);
  assert.equal(blogPostsTarget({ searchGrowth: 0.02, topicsLeft: 0 }), 0);
});

test("the model's rundown is cleaned, and refused when it is unusable", () => {
  const good = cleanRundown(JSON.stringify({ headline: "Search up 20% — on target", summary: "Google sent 107 visits against 89 last week, and Bing 18 against 10. Facebook jumped while the ad ran.", actions: ["Submit the two new pages for indexing.", "Post the consent form guide to the page."] }));
  assert.ok(good);
  assert.doesNotMatch(JSON.stringify(good), /[–—]/, "no dashes reach Leo");
  assert.equal(cleanRundown("not json"), null);
  assert.equal(cleanRundown(JSON.stringify({ headline: "Hi", summary: "", actions: [] })), null);
  assert.equal(cleanRundown(JSON.stringify({ headline: "Try Storypark instead", summary: "A long enough summary that mentions nothing much at all here.", actions: ["Do it"] })), null, "never names another product");
});

const METRICS: WeeklyMetrics = {
  weekEnding: "2026-11-08",
  visits: {
    thisWeek: { google: 107, bing: 18, other_search: 9, ai: 4, facebook: 122, email: 0, ads: 0, direct: 142, other: 2 },
    lastWeek: { google: 89, bing: 10, other_search: 2, ai: 3, facebook: 25, email: 0, ads: 0, direct: 83, other: 1 },
    last28: { google: 380, bing: 50, other_search: 15, ai: 12, facebook: 200, email: 0, ads: 0, direct: 400, other: 5 },
    previous28: { google: 200, bing: 30, other_search: 5, ai: 6, facebook: 60, email: 0, ads: 0, direct: 200, other: 4 },
  },
  search: { thisWeek: 134, lastWeek: 101, weeklyGrowth: 0.327, trendWeeklyGrowth: 0.17, target: 0.08, onTarget: true },
  signups: { thisWeek: 3, lastWeek: 2, bySource: { google: 2, facebook: 1 } },
  firstStories: 1,
  stories: { thisWeek: 40, lastWeek: 35 },
  revenue: { ready: true, mrrNzd: 168, trialingNzd: 21, payers: 8, trialing: 1, wonThisWeek: 0, lostThisWeek: 0, goalNzd: 10_000, goalPercent: 1.7, requiredWeeklyGrowth: 0.082 },
  email: { marketingSent: 12, billingSent: 3, clicked: 2, unsubscribed: 0 },
  blog: { publishedThisWeek: 1, topicsLeft: 10, targetNextWeek: 1 },
  aiCalls: { storiesThisWeek: 40, managerCallsThisWeek: 0 },
};

test("without the model, the report still says what happened, in plain numbers", () => {
  const rundown = plainRundown(METRICS);
  assert.equal(rundown.headline, "Search is on target");
  assert.match(rundown.summary, /Search visits 134 this week against 101 last week/);
  assert.match(rundown.summary, /Google 107, Bing 18, AI assistants 4, Facebook 122/);
  assert.match(rundown.summary, /MRR NZ\$168 from 8 payers/);
  assert.ok(rundown.actions.length >= 1 && rundown.actions.length <= 3);
  assert.doesNotMatch(JSON.stringify(rundown), /[–—]/);
  const behind = plainRundown({ ...METRICS, search: { ...METRICS.search, onTarget: false }, blog: { ...METRICS.blog, topicsLeft: 2 } });
  assert.equal(behind.headline, "Search is behind the 8% target");
  assert.match(behind.actions.join(" "), /two guides go out this week/);
  assert.match(behind.actions.join(" "), /Only 2 guide topics are left/);
});

test("the report runs weekly on a secret-protected cron, and the blog follows its pace", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as { crons: Array<{ path: string; schedule: string }> };
  const cron = config.crons.find((c) => c.path === "/api/cron/business-manager");
  assert.ok(cron, "weekly report must be scheduled");
  assert.equal(cron.schedule, "0 20 * * 0", "Sunday 20:00 UTC is Monday morning in New Zealand");
  const route = readFileSync(new URL("../app/api/cron/business-manager/route.ts", import.meta.url), "utf8");
  assert.match(route, /CRON_SECRET/);
  assert.match(route, /export async function GET/);
  const blog = readFileSync(new URL("../app/api/cron/blog/route.ts", import.meta.url), "utf8");
  assert.match(blog, /currentBlogTarget\(\)/);
  // AI calls stay far below story volume: one rundown a week, at most two guides.
  const manager = readFileSync(new URL("../lib/business-manager.ts", import.meta.url), "utf8");
  assert.equal((manager.match(/await client\.chat\.completions\.create\(/g) ?? []).length, 1, "one model call in the whole report");
});
