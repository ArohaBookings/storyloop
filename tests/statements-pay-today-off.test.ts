import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

// Lane B's STATEMENTS_PAY_TODAY readers with the switch off (25 Nov 2026):
// no rewrite (the protected statement routes answer directly, as live), the
// wall is the 24 Nov wall, start-today answers 404, checkout keeps the free week.
const read = (file: string) => readFileSync(file, "utf8");

test("off: no rewrite, and the gate hands every request straight to the protected handler", () => {
  assert.match(read("next.config.ts"), /if \(!STATEMENTS_PAY_TODAY\) return \{ beforeFiles: \[\], afterFiles: \[\], fallback: \[\] \};/);
  assert.match(read("lib/statement-gate-server.ts"), /if \(!STATEMENTS_PAY_TODAY\) return inner\(request\);/);
});

test("off: the wall is the old wall, and start-today is closed", () => {
  const wall = read("components/app/AppLimitWall.tsx");
  assert.match(wall, /const payToday = STATEMENTS_PAY_TODAY && wall === "statement";/);
  assert.match(wall, /if \(payToday\) \{\s*return \(/, "the pay-today form is a separate branch; below it the old markup is unchanged");
  assert.match(wall, /trial_days: STATEMENTS_PAY_TODAY && wall === "statement" \? 0 : terms\.trialDays/);
  assert.match(read("app/api/stripe/start-today/route.ts"), /if \(!STATEMENTS_PAY_TODAY\) return \{ fail: "not_eligible" as const, response: NextResponse\.json\(\{ error: "Not available\.", code: "not_eligible" \}, \{ status: 404 \}\) \};/);
});
