import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as switches from "../lib/build-switches";
import { joinFromLeaderOffer } from "../lib/leader-offer-server";
import SendToLeader from "../components/app/SendToLeader";
import SourceLines from "../components/app/SourceLines";
import GuideProductBlock from "../components/marketing/GuideProductBlock";
import StatementGuideHero from "../components/marketing/StatementGuideHero";
import type { SeoPage } from "../lib/seo-pages";

(globalThis as unknown as { React: typeof React }).React = React; // the components use the classic JSX runtime

// The 25 Nov 2026 build's switches (lib/build-switches.ts) and the groundwork
// stubs. There are more than five now (MERGE2 2g): the five behaviour
// switches and one per held page (HELD_PAGE_ON), every one of them in
// lib/build-switches.ts. The rule: with EVERY switch in that file false, the
// site behaves exactly as the live commit 776e537.

test("the five behaviour switches exist, are plain booleans, and are set as ruled", () => {
  assert.deepEqual(switches.BUILD_SWITCHES, {
    STATEMENTS_PAY_TODAY: true,
    LEADER_EMAIL_ON: true,
    CLASS_SET_ON: true,
    CENTRE_START_NO_CHECKOUT: true,
    // A4 passed its gate on 25 Nov (tests/source-lines-accuracy.test.ts), so it is on.
    LEADER_SOURCES_ON: true,
  });
  const source = readFileSync("lib/build-switches.ts", "utf8");
  for (const name of Object.keys(switches.BUILD_SWITCHES)) {
    assert.match(source, new RegExp(`export const ${name} = (true|false);`), `${name} is a one-line switch`);
  }
});

test("every switch of this build is in one file, and turning every true there to false turns every switch off (MERGE2 2g)", () => {
  const source = readFileSync("lib/build-switches.ts", "utf8");
  // The release, as the conductor ruled on 25 Nov after Leo's approval at 17:50.
  assert.deepEqual(switches.HELD_PAGE_ON, {
    "educational-leader-checklist": true,
    "documentation-workload-early-childhood": false,
    "exceeding-nqs-documentation": false,
    "ask-your-centre": false,
    "eylf-planning-cycle": true,
    "assessment-and-rating-evidence": true,
    "qip-childcare": false,
  });
  const names = Object.keys(switches.EVERY_SWITCH);
  assert.equal(names.length, Object.keys(switches.BUILD_SWITCHES).length + Object.keys(switches.HELD_PAGE_ON).length);
  // Each switch is one line ending in true or false, so the switches-off check is one edit of this file.
  const lines = source.split("\n").filter((line) => /(=|:) (true|false)[;,]$/.test(line.trim()) && !line.trim().startsWith("*") && !line.trim().startsWith("//"));
  assert.equal(lines.length, names.length, "every switch line, and only switch lines, end in true or false");
  for (const name of Object.keys(switches.BUILD_SWITCHES)) assert.match(source, new RegExp(`export const ${name} = (true|false);`));
  for (const slug of Object.keys(switches.HELD_PAGE_ON)) assert.match(source, new RegExp(`  "${slug}": (true|false),`));
  const off = source.replace(/(=|:) true([;,])$/gm, "$1 false$2");
  assert.ok(!/(=|:) true[;,]$/m.test(off), "nothing left on after the one edit");
  // The held pages' own file only re-exports: no second place to forget.
  const held = readFileSync("lib/held-pages.ts", "utf8");
  assert.ok(!/(true|false),\s*$/m.test(held.replace(/\/\*[\s\S]*?\*\//g, "")), "lib/held-pages.ts holds no switch values");
  assert.match(held, /import \{ HELD_PAGE_ON \} from "@\/lib\/build-switches";/);
  // The older switches that are off on the live site stay off: this build never turns them on.
  assert.match(readFileSync("lib/buyer-pages.ts", "utf8"), /export const HELD_BUYER_PAGES_ON = false;/);
  assert.match(readFileSync("lib/family-tell-centre.ts", "utf8"), /export const TELL_CENTRE_ON = false;/);
  assert.match(readFileSync("lib/auth/signup-link.ts", "utf8"), /export const SIGNUP_EMAIL_LINK_ON = false;/);
});

// Every file that reads a switch, and the test that proves what it does with
// that switch false. A lane that makes a file read a switch adds it here with
// its test; a reader missing from this list fails the build.
const SWITCH_READERS: Record<string, string> = {
  // Lane A (leader path). Off: no cover, the offer under the story from the start, the site's own bar.
  [path.join("components", "marketing", "LeaderCheckPage.tsx")]: "tests/leader-check-page.test.ts",
  [path.join("app", "check", "page.tsx")]: "tests/leader-check-page.test.ts",
  [path.join("components", "app", "SendToLeader.tsx")]: "tests/leader-switches-off.test.ts",
  [path.join("components", "marketing", "TransitionDemo.tsx")]: "tests/leader-switches-off.test.ts",
  [path.join("app", "(app)", "statement", "page.tsx")]: "tests/leader-switches-off.test.ts",
  [path.join("app", "api", "leader-sets", "route.ts")]: "tests/leader-switches-off.test.ts",
  [path.join("app", "api", "leader-email", "route.ts")]: "tests/leader-switches-off.test.ts",
  [path.join("lib", "email", "leader-check.ts")]: "tests/leader-switches-off.test.ts",
  // Lane B (statements pay today). Off: no rewrite, the old wall, checkout keeps the free week.
  [path.join("lib", "statement-gate-server.ts")]: "tests/statements-pay-today-off.test.ts",
  [path.join("components", "app", "AppLimitWall.tsx")]: "tests/statements-pay-today-off.test.ts",
  [path.join("app", "api", "stripe", "start-today", "route.ts")]: "tests/statements-pay-today-off.test.ts",
  [path.join("app", "api", "stripe", "checkout", "route.ts")]: "tests/checkout-terms-statement.test.ts",
  // Lane B (centre start with no payment page). Off: today's checkout page, nobody joined by the route.
  [path.join("app", "api", "centres", "start-free", "route.ts")]: "tests/centre-start.test.ts",
  [path.join("app", "api", "centres", "route.ts")]: "tests/centre-start.test.ts",
  [path.join("lib", "centre-start-client.ts")]: "tests/centre-start.test.ts",
  [path.join("app", "(auth)", "signup", "SignupForm.tsx")]: "tests/centre-start.test.ts",
  // A4 (where each line came from). Off: the story and the note exactly as before, nothing stored, no tick.
  [path.join("components", "app", "SourceLines.tsx")]: "tests/source-lines-off.test.ts",
  [path.join("lib", "story-check.ts")]: "tests/source-lines-off.test.ts",
  [path.join("lib", "leader-sets.ts")]: "tests/source-lines-off.test.ts",
  [path.join("lib", "leader-sets-server.ts")]: "tests/source-lines-off.test.ts",
  [path.join("app", "api", "stories", "[id]", "check", "route.ts")]: "tests/source-lines-off.test.ts",
  // The held pages (MERGE2 2g, 2h). Off: 404, out of the sitemap, the live words on a re-aimed URL.
  [path.join("lib", "held-pages.ts")]: "tests/release-switches.test.ts",
};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return entry === "node_modules" ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

test("every file that reads a switch has a test for the switch off", () => {
  const readers = ["app", "components", "lib"]
    .flatMap(sourceFiles)
    .filter((file) => file !== path.join("lib", "build-switches.ts"))
    .filter((file) => /from "@\/lib\/build-switches"|from "\.\.?\/.*build-switches"/.test(readFileSync(file, "utf8")));
  for (const file of readers) {
    const proof = SWITCH_READERS[file];
    assert.ok(proof, `${file} reads a build switch: add it to SWITCH_READERS with the test that proves the switch off`);
    assert.ok(existsSync(proof), `${proof} (the off test for ${file}) exists`);
  }
});

test("the stubs change nothing a person sees", async () => {
  // SendToLeader is built now (lane A): an empty set still renders nothing.
  assert.equal(renderToStaticMarkup(React.createElement(SendToLeader, { kind: "set", pieces: [] })), "");
  // SourceLines is built now (A4): a story with no observation shows its words and no marks. Off: tests/source-lines-off.test.ts.
  const lines = renderToStaticMarkup(React.createElement(SourceLines, { note: "n", text: "Mia & the tower", kind: "story" }));
  assert.match(lines, /Mia &amp; the tower/);
  assert.doesNotMatch(lines, /source-chip|source-not-in-note/);
  assert.equal(renderToStaticMarkup(React.createElement(GuideProductBlock, { page: { slug: "x" } as SeoPage })), "");
  assert.deepEqual(await joinFromLeaderOffer("a", "b"), { joined: false });
  // start-free is built now (lane B): tests/centre-start.test.ts.
});

test("the guide slot renders the official links as the page did", () => {
  const officialLinks = { heading: "The official form", links: [{ label: "The form", url: "https://example.org/form", note: "Opens in a new tab." }] };
  const html = renderToStaticMarkup(
    React.createElement(StatementGuideHero, {
      slug: "x",
      drafter: null,
      example: null,
      officialLinks,
      tryLink: { href: "#transition-try", label: "Draft yours" },
      hasExample: true,
    }, React.createElement("i", { id: "between" })),
  );
  assert.ok(html.indexOf('id="between"') < html.indexOf('id="official-links"'), "the plan chooser slot stays above the official links");
  assert.match(html, /data-testid="official-links"/);
  assert.match(html, /href="https:\/\/example.org\/form" target="_blank" rel="noopener noreferrer" data-track="guide_official_link"/);
  assert.match(html, /data-track="guide_official_try" href="#transition-try">Draft yours</);
  assert.match(html, /data-track="guide_official_example" href="#transition-example">Or see a finished example first</);
  const bare = renderToStaticMarkup(React.createElement(StatementGuideHero, { slug: "x", drafter: null, example: null, tryLink: null, hasExample: false }));
  assert.equal(bare, "");
});
