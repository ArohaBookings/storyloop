import assert from "node:assert/strict";
import test from "node:test";
import { generateAiPolicy, normalizePolicyInput, policyToText, type PolicyInput } from "../lib/ai-policy";

/**
 * A centre may formally adopt this document, so the tests are about the things
 * that would embarrass a director in front of a regulator or a parent: the wrong
 * country's law, broken grammar, leaked template syntax, or a policy that reads
 * as an advert.
 */

const base: PolicyInput = {
  serviceName: "Sunnyside Early Learning",
  country: "NZ",
  serviceType: "centre",
  approverRole: "the centre manager",
  familyNotice: "inform",
  approvedTools: ["StoryLoop"],
  reviewMonths: 12,
  effectiveDate: "2026-10-01",
};

const text = (input: Partial<PolicyInput>) => policyToText(generateAiPolicy(input));

test("a New Zealand policy never cites Australian law, frameworks or regulators", () => {
  const nz = text({ ...base, country: "NZ" });
  for (const foreign of ["Australian Privacy Principles", "1988", "EYLF", "Early Years Learning Framework", "Office of the Australian Information Commissioner"]) {
    assert.ok(!nz.includes(foreign), `NZ policy mentions ${foreign}`);
  }
  assert.match(nz, /Privacy Act 2020/);
  assert.match(nz, /Te Whāriki/);
  assert.match(nz, /Information Privacy Principles/);
});

test("an Australian policy never cites New Zealand law, curriculum or te reo terms", () => {
  const au = text({ ...base, country: "AU" });
  for (const foreign of ["Te Whāriki", "Privacy Act 2020", "Information Privacy Principles", "kaiako", "Kaiako", "tamariki", "tamaiti", "whānau", "Whānau"]) {
    assert.ok(!au.includes(foreign), `AU policy mentions ${foreign}`);
  }
  assert.match(au, /Privacy Act 1988/);
  assert.match(au, /Early Years Learning Framework/);
  // Many small services are exempt, so coverage is never asserted.
  assert.match(au, /where they apply to our service/);
  assert.match(au, /do not enter personal information, and particularly sensitive information, into publicly available generative AI tools/);
});

test("no broken articles or leaked template syntax in either country", () => {
  for (const country of ["NZ", "AU"] as const) {
    for (const familyNotice of ["inform", "opt_out", "opt_in"] as const) {
      const t = text({ ...base, country, familyNotice });
      assert.ok(!/\ba educator/i.test(t), `${country}/${familyNotice}: "a educator"`);
      assert.ok(!/\ban kaiako/i.test(t), `${country}/${familyNotice}: "an kaiako"`);
      for (const junk of ["${", "undefined", "null", "NaN", "[object Object]"]) {
        assert.ok(!t.includes(junk), `${country}/${familyNotice}: leaked ${junk}`);
      }
    }
  }
});

test("a NZ policy never mixes 'child' and 'tamaiti' in the family section", () => {
  for (const familyNotice of ["inform", "opt_out", "opt_in"] as const) {
    const section = generateAiPolicy({ ...base, country: "NZ", familyNotice }).sections.find((s) => s.heading.startsWith("6."));
    assert.ok(section);
    assert.ok(!/\bchild\b/.test(section.paragraphs.join(" ")), `NZ ${familyNotice} says "child"`);
  }
});

test("all nine sections are present and in order", () => {
  const headings = generateAiPolicy(base).sections.map((s) => s.heading.split(".")[0]);
  assert.deepEqual(headings, ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
});

test("StoryLoop appears only where the centre listed it, never inside a rule", () => {
  const policy = generateAiPolicy({ ...base, approvedTools: ["StoryLoop", "Microsoft Copilot (work account)"] });
  for (const section of policy.sections) {
    if (section.heading.startsWith("3.")) continue;
    assert.ok(!section.paragraphs.join(" ").includes("StoryLoop"), `StoryLoop inside ${section.heading}`);
  }
  const withoutIt = text({ ...base, approvedTools: ["Microsoft Copilot (work account)"] });
  const body = withoutIt.split("This policy is a starting point")[0];
  assert.ok(!body.includes("StoryLoop"), "StoryLoop appears in a policy that did not list it");
});

test("the three family notice approaches produce genuinely different commitments", () => {
  const family = (familyNotice: PolicyInput["familyNotice"]) =>
    generateAiPolicy({ ...base, familyNotice }).sections.find((s) => s.heading.startsWith("6."))!.paragraphs.join(" ");
  const inform = family("inform"), optOut = family("opt_out"), optIn = family("opt_in");
  assert.notEqual(inform, optOut);
  assert.notEqual(optOut, optIn);
  assert.match(optIn, /until their whānau has agreed/);
  assert.match(optOut, /can ask us not to/);
});

test("inputs are sanitised: blanks fall back, review period is clamped, tools are capped", () => {
  const n = normalizePolicyInput({
    serviceName: "   ",
    country: "US" as unknown as "NZ",
    serviceType: "prison" as unknown as "centre",
    reviewMonths: 999,
    approvedTools: Array.from({ length: 20 }, (_, i) => `  Tool   ${i}  `),
  });
  assert.equal(n.serviceName, "Our service");
  assert.equal(n.country, "NZ");
  assert.equal(n.serviceType, "centre");
  assert.equal(n.reviewMonths, 24);
  assert.equal(n.approvedTools.length, 8);
  assert.equal(n.approvedTools[0], "Tool 0");
  assert.equal(normalizePolicyInput({ reviewMonths: 1 }).reviewMonths, 3);
  assert.equal(normalizePolicyInput({ reviewMonths: Number.NaN }).reviewMonths, 12);
});

test("an empty approved-tools list shows a placeholder rather than an empty section", () => {
  const section = generateAiPolicy({ ...base, approvedTools: [] }).sections.find((s) => s.heading.startsWith("3."))!;
  assert.ok(section.paragraphs.some((p) => p.includes("List the tools your service approves")));
});

test("a bad date reads as a sentence, not 'Invalid Date'", () => {
  const policy = generateAiPolicy({ ...base, effectiveDate: "not-a-date" });
  assert.ok(!policy.subtitle.includes("Invalid"));
  assert.match(policy.subtitle, /the date it is adopted/);
});

test("plain text export ends with the advice-disclaimer", () => {
  assert.match(text(base), /obtain your own advice where needed\.$/);
});
