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
// stubs. The rule: with all five switches false the site behaves exactly as
// the live commit 776e537.

test("the five switches exist, are plain booleans, and are set as ruled on 24 Nov", () => {
  assert.deepEqual(switches.BUILD_SWITCHES, {
    STATEMENTS_PAY_TODAY: true,
    LEADER_EMAIL_ON: true,
    CLASS_SET_ON: true,
    CENTRE_START_NO_CHECKOUT: true,
    LEADER_SOURCES_ON: false,
  });
  const source = readFileSync("lib/build-switches.ts", "utf8");
  for (const name of Object.keys(switches.BUILD_SWITCHES)) {
    assert.match(source, new RegExp(`export const ${name} = (true|false);`), `${name} is a one-line switch`);
  }
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
  assert.equal(renderToStaticMarkup(React.createElement(SourceLines, { note: "n", text: "Mia & the tower", kind: "story" })), "Mia &amp; the tower");
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
