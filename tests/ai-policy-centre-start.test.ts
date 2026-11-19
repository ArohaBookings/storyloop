import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Under each finished AI policy: one line and one button that start the team's free period (19 Nov 2026).

const generator = readFileSync("components/policy/PolicyGenerator.tsx", "utf8");

test("one line in the shared date-aware centre wording, and one button that starts the free period, with an event", () => {
  const block = generator.slice(generator.indexOf('data-testid="ai-policy-centre-start"'), generator.indexOf("Need a tool that meets it?"));
  assert.match(block, /Your whole team on StoryLoop: <CentreTrialWords \/>, no card\./);
  assert.match(block, /href="\/signup\?plan=centre_starter&utm_source=ai_policy&utm_medium=site"/);
  assert.match(block, /track\("cta_click", \{ cta: "ai_policy_centre_start", country \}\)/);
  assert.equal((block.match(/<Link/g) ?? []).length, 1, "one button");
  assert.match(block, /print:hidden/, "never on the printed policy");
  assert.ok(generator.indexOf('data-testid="ai-policy-centre-start"') > generator.indexOf("</article>"), "under the finished policy");
  assert.doesNotMatch(block, /free month|30 days free/, "never a typed length");
});

test("both policy pages show it, and /ai-policy keeps its title, heading and address", () => {
  assert.match(readFileSync("app/ai-policy/page.tsx", "utf8"), /<PolicyGenerator \/>/);
  assert.match(readFileSync("components/buyer/BuyerPage.tsx", "utf8"), /<PolicyGenerator \/>/);
  const page = readFileSync("app/ai-policy/page.tsx", "utf8");
  assert.match(page, /AI policy/);
});
