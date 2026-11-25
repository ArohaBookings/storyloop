import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import test from "node:test";
import { AD_FREE_APP_PAGES, AD_FREE_PAGES, adsTagAllowedOn } from "../lib/analytics/ad-free-pages";
import { paidReturnSuccessUrl, paidReturnTarget } from "../lib/paid-return";

// No advertising or remarketing tag on a page that shows a child's story, a statement or an educator's notes
// (release decision 4, 19 Nov 2026; review 1, R1-01).

test("no ad tag on the family page, the leader's check, a wall card's story, the public story check", () => {
  for (const path of ["/family", "/family/", "/family?l=abc", "/family#k", "/check", "/check?x=1", "/w/AB12CD", "/w/AB12CD/", "/w", "/check-my-story", "/join", "/unsubscribe"]) {
    assert.equal(adsTagAllowedOn(path), false, path);
  }
  assert.equal(adsTagAllowedOn(null), false, "an unknown page gets no tag");
});

test("no ad tag on any page of the signed-in app, and a new app page fails this test until it is listed", () => {
  for (const group of ["app/(app)", "app/(admin)"]) {
    for (const name of readdirSync(group)) {
      if (!statSync(`${group}/${name}`).isDirectory()) continue;
      assert.ok(AD_FREE_APP_PAGES.includes(`/${name}`), `/${name} is an app page with no place on the ad-free list`);
      assert.equal(adsTagAllowedOn(`/${name}`), false, `/${name}`);
    }
  }
  for (const path of ["/generate?upgraded=true", "/statement", "/children/5b2f/transition", "/history", "/dashboard?upgraded=true&plan=educator", "/team", "/billing"]) {
    assert.equal(adsTagAllowedOn(path), false, path);
  }
});

test("the tag still loads on public pages and on /upgraded, where a paid plan is measured", () => {
  for (const path of ["/", "/signup", "/pricing", "/for-families", "/for-centres", "/try", "/upgraded", "/auth/finish", "/whanau", "/checkout-done"]) {
    assert.equal(adsTagAllowedOn(path), true, path);
  }
});

test("the public story pages on the list exist", () => {
  for (const page of AD_FREE_PAGES.filter((p) => !AD_FREE_APP_PAGES.includes(p) && p !== "/check-my-story")) {
    const file = page === "/w" ? "app/w/[code]/page.tsx" : `app${page}/page.tsx`;
    assert.ok(existsSync(file), file);
  }
});

test("the Google tag asks the list before it renders anything", () => {
  const tag = readFileSync("components/analytics/GoogleAdsTag.tsx", "utf8");
  assert.match(tag, /const allowed = adsTagAllowedOn\(pathname\);/);
  assert.match(tag, /if \(!allowed\) return null;\n\s+return <GoogleTag \/>;/);
  assert.match(tag, /gtag\("consent", "update", \{ ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" \}\)/);
  assert.match(readFileSync("app/layout.tsx", "utf8"), /<GoogleAdsTag \/>/);
  for (const page of ["app/family/page.tsx", "app/check/page.tsx", "app/w/[code]/page.tsx"]) {
    assert.doesNotMatch(readFileSync(page, "utf8"), /googletagmanager|gtag|fbq|connect\.facebook|GoogleAdsTag/, page);
  }
});

test("the paid conversion is sent only from /upgraded, then she goes back to the page she came from", () => {
  const route = readFileSync("app/api/stripe/checkout/route.ts", "utf8");
  assert.match(route, /success_url: paidReturnSuccessUrl\(origin, returnPath, selectedPlan\),/);
  assert.equal(paidReturnSuccessUrl("https://storyloop.space", "/generate", "educator"), "https://storyloop.space/upgraded?to=%2Fgenerate&plan=educator&session_id={CHECKOUT_SESSION_ID}");
  assert.equal(paidReturnSuccessUrl("https://storyloop.space", null, "centre_starter"), "https://storyloop.space/upgraded?to=%2Fdashboard&plan=centre_starter&session_id={CHECKOUT_SESSION_ID}");
  assert.equal(paidReturnTarget("/generate", "educator", "cs_test_abc123"), "/generate?upgraded=true&plan=educator&session_id=cs_test_abc123");
  assert.equal(paidReturnTarget("https://evil.example/x", "educator", "cs_test_abc123"), "/dashboard?upgraded=true&plan=educator&session_id=cs_test_abc123", "never off the short list");
  assert.equal(paidReturnTarget("//evil.example", "educator", "junk"), "/dashboard?upgraded=true&plan=educator", "a made-up session id is dropped");
  // Nothing in the app sends an ads conversion any more.
  for (const file of ["components/app/CheckoutReturn.tsx", "app/(app)/dashboard/page.tsx"]) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /reportPaidConversion|AdsPaidConversion|google-ads/, file);
  }
  assert.match(readFileSync("components/analytics/PaidReturn.tsx", "utf8"), /reportPaidConversion\(/);
  assert.doesNotMatch(readFileSync("app/upgraded/page.tsx", "utf8"), /stories|child_name|observations|from\("/, "the stop shows nothing about a child");
});

test("the leader's stop page carries her address in its link: no advertising tag there (R2-1)", () => {
  for (const path of ["/stop", "/stop?t=eyJlIjoiam9Aa293aGFpLm56In0", "/stop/"]) assert.equal(adsTagAllowedOn(path), false, path);
});
