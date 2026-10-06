import assert from "node:assert/strict";
import test from "node:test";
import robots from "../app/robots";
import { SEO_PAGE_SLUGS } from "../lib/seo-pages";
import { EYLF_OUTCOMES } from "../lib/eylf-outcomes";
import { TE_WHARIKI_STRANDS } from "../lib/te-whariki-strands";

// Google's and Bing's matching: a rule is a path prefix, "*" matches anything,
// a trailing "$" anchors the end, and the longest matching rule wins (allow on a tie).
function toRegExp(rule: string) {
  const anchored = rule.endsWith("$");
  const body = (anchored ? rule.slice(0, -1) : rule)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

function isAllowed(path: string) {
  const rules = robots().rules;
  const rule = Array.isArray(rules) ? rules[0] : rules;
  const list = (value: string | string[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
  const best = (patterns: string[]) => Math.max(-1, ...patterns.filter((p) => toRegExp(p).test(path)).map((p) => p.length));
  return best(list(rule.allow)) >= best(list(rule.disallow));
}

test("no public guide is blocked by a robots rule", () => {
  const publicPaths = [
    "/",
    "/about",
    "/pricing",
    "/examples",
    "/resources",
    "/learning-story-template",
    "/blog/how-to-write-a-learning-story",
    "/eylf-learning-outcomes",
    "/te-whariki-learning-outcomes-guide",
    ...EYLF_OUTCOMES.map((outcome) => `/eylf-learning-outcomes/${outcome.slug}`),
    ...TE_WHARIKI_STRANDS.map((strand) => `/${strand.slug}`),
    ...SEO_PAGE_SLUGS.map((slug) => `/${slug}`),
  ];
  const blocked = publicPaths.filter((path) => !isAllowed(path));
  assert.deepEqual(blocked, [], `robots.txt blocks public pages: ${blocked.join(", ")}`);
  assert.ok(isAllowed("/today-loop-ece"));
});

test("private pages stay blocked", () => {
  for (const path of ["/today", "/today?date=2026-10-01", "/dashboard", "/admin", "/admin-login", "/api/generate", "/login", "/signup?plan=educator", "/generate"]) {
    assert.equal(isAllowed(path), false, `${path} should be disallowed`);
  }
});
