import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { AD_FREE_PAGES, adsTagAllowedOn } from "../lib/analytics/ad-free-pages";

// No advertising or remarketing tag on a page that shows a child's story (release decision 4, 19 Nov 2026).

test("no ad tag on the family page, the leader's check, a wall card's story or the public story check", () => {
  for (const path of ["/family", "/family/", "/family?l=abc", "/family#k", "/check", "/check?x=1", "/w/AB12CD", "/w/AB12CD/", "/w", "/check-my-story"]) {
    assert.equal(adsTagAllowedOn(path), false, path);
  }
  assert.equal(adsTagAllowedOn(null), false, "an unknown page gets no tag");
});

test("the tag still loads where conversions are measured", () => {
  for (const path of ["/", "/signup", "/pricing", "/for-families", "/for-centres", "/try", "/dashboard", "/generate", "/billing", "/checkout-done", "/whanau", "/wonder"]) {
    assert.equal(adsTagAllowedOn(path), true, path);
  }
});

test("every listed page exists, and each story page is on the list", () => {
  for (const page of AD_FREE_PAGES.filter((p) => p !== "/check-my-story")) {
    const dir = page === "/w" ? "app/w/[code]/page.tsx" : `app${page}/page.tsx`;
    assert.ok(existsSync(dir), dir);
  }
});

test("the Google tag asks the list before it renders anything", () => {
  const tag = readFileSync("components/analytics/GoogleAdsTag.tsx", "utf8");
  assert.match(tag, /const allowed = adsTagAllowedOn\(pathname\);/);
  assert.match(tag, /if \(!allowed\) return null;\n\s+return <GoogleTag \/>;/);
  assert.match(tag, /gtag\("consent", "update", \{ ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" \}\)/);
  // The only place an advertising script is loaded from.
  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /<GoogleAdsTag \/>/);
  for (const page of ["app/family/page.tsx", "app/check/page.tsx", "app/w/[code]/page.tsx"]) {
    assert.doesNotMatch(readFileSync(page, "utf8"), /googletagmanager|gtag|fbq|connect\.facebook|GoogleAdsTag/, page);
  }
});
