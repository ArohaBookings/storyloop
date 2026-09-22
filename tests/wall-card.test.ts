import assert from "node:assert/strict";
import test from "node:test";
import { buildWallCard, formatWallCode, generateWallCode, isWallCode, scrub, wallCardUrl, WALL_CODE_LENGTH } from "../lib/wall-card";

const ROSTER = ["Ruby", "Tāne", "Ana Maria", "Grace", "Jack-Henry", "Sione"];

const clean = (text: string, names = ROSTER) => scrub(text, names).text;

test("a name goes, in every form a story actually writes it", () => {
  assert.equal(clean("Ruby kept trying."), "The child kept trying.");
  assert.equal(clean("ruby kept trying."), "The child kept trying.");
  assert.equal(clean("RUBY kept trying."), "The child kept trying.");
  assert.equal(clean("Ruby's pipe fell over."), "The child's pipe fell over.");
  assert.equal(clean("Ruby’s pipe fell over."), "The child's pipe fell over.", "curly apostrophes are what phones actually type");
  assert.equal(clean("We watched Ruby, then Sione."), "We watched the child, then the child.");
});

test("macronised and hyphenated names are removed, which a naive word boundary misses", () => {
  assert.equal(clean("Tāne carried the bucket."), "The child carried the bucket.");
  assert.equal(clean("tāne carried the bucket."), "The child carried the bucket.");
  assert.equal(clean("Jack-Henry climbed up."), "The child climbed up.");
  assert.equal(clean("Ana Maria poured it out."), "The child poured it out.");
  // The parts of a full name are removed too, because stories use first names.
  assert.equal(clean("Ana poured it out."), "The child poured it out.");
});

test("a name that is also an ordinary word is still removed, and the educator is told", () => {
  const result = scrub("Grace moved with grace across the mat.", ROSTER);
  assert.ok(!/grace/i.test(result.text), result.text);
  const finding = result.findings.find((f) => f.term === "Grace");
  assert.equal(finding?.action, "removed");
  assert.equal(finding?.count, 2, "both the name and the ordinary word are counted, so nothing is removed silently");
});

test("a name inside another word is left alone", () => {
  // "Rubying" is not Ruby, and mangling real words would make cards unreadable.
  assert.equal(clean("The scrubbing brush was rubbery."), "The scrubbing brush was rubbery.");
  assert.equal(clean("Graceful movements followed."), "Graceful movements followed.");
});

test("dates and ages go, because a date plus a room identifies a child", () => {
  assert.match(clean("On 14/03/2026 they built it."), /recently/);
  assert.match(clean("On 14 March they built it."), /recently/);
  assert.match(clean("She is 4 years old."), /this age group/);
  assert.match(clean("A child aged 3 joined in."), /this age group/);
  assert.match(clean("An 18 months old watched."), /this age group/);
  assert.ok(!/\d{2}\/\d{2}/.test(clean("On 14/03/2026 they built it.")));
});

test("an unknown capitalised word is FLAGGED, never removed silently", () => {
  const result = scrub("The child worked with Whaea Miriama all morning.", ROSTER);
  const flagged = result.findings.filter((f) => f.action === "flagged").map((f) => f.term);
  assert.ok(flagged.includes("Miriama"), JSON.stringify(result.findings));
  // Still present in the text: a human decides, because guessing mangles words.
  assert.match(result.text, /Miriama/);
});

test("curriculum vocabulary survives, or every card would be gibberish", () => {
  const result = scrub("This links to Exploration and Mana Aotūroa in Te Whāriki.", ROSTER);
  assert.match(result.text, /Exploration/);
  assert.match(result.text, /Mana Aotūroa/);
  assert.match(result.text, /Te Whāriki/);
  const flagged = result.findings.filter((f) => f.action === "flagged").map((f) => f.term);
  assert.deepEqual(flagged, [], JSON.stringify(result.findings));
});

test("a sentence's first word is not treated as a name", () => {
  const result = scrub("Water travelled down the pipe. Blocks held it up.", ROSTER);
  assert.deepEqual(result.findings.filter((f) => f.action === "flagged"), []);
});

test("a card is not publishable while anything is merely flagged", () => {
  const withUnknown = buildWallCard({
    storyText: "Ruby tested how water travels down a slope, and Miriama helped her lift the pipe higher.",
    title: "The long pipe",
    outcomes: ["Exploration"],
    knownNames: ROSTER,
  });
  assert.equal(withUnknown.report.safe, false, "an unexplained name must block publishing");
  assert.match(withUnknown.report.blockers.join(" "), /may be names: Miriama/);

  const clear = buildWallCard({
    storyText: "Ruby tested how water travels down a slope and moved a block to lift the pipe higher.",
    title: "The long pipe",
    outcomes: ["Exploration", "Communication"],
    dispositions: ["Perseverance"],
    knownNames: ROSTER,
  });
  assert.equal(clear.report.safe, true);
  assert.deepEqual(clear.card.curriculum, ["Exploration", "Communication"]);
});

test("THE load-bearing test: no roster name can appear anywhere in the public payload", () => {
  // Serialising the public card is exactly what the public route does, so this
  // is the guarantee the whole feature rests on. The educator's report is a
  // separate value on purpose: it names what was removed, and never ships.
  const build = buildWallCard({
    storyText: "Ruby and Tāne worked with Ana Maria. Ruby's pipe fell. Grace held it. Sione fetched Jack-Henry.",
    title: "Ruby's Learning Story",
    outcomes: ["Exploration"],
    knownNames: ROSTER,
  });
  const publicJson = JSON.stringify(build.card);
  for (const name of ROSTER.flatMap((n) => [n, ...n.split(/[\s-]+/)])) {
    assert.ok(!new RegExp(name, "i").test(publicJson), `${name} survived into the public card: ${publicJson}`);
  }
  // And the report does its opposite job: it says what went.
  assert.ok(build.report.findings.some((f) => f.term === "Ruby" && f.action === "removed"));
});

test("a title that needed scrubbing is replaced, not published mangled", () => {
  const build = buildWallCard({ storyText: "The water went up the pipe and over the edge.", title: "Ruby's Learning Story", knownNames: ROSTER });
  assert.equal(build.card.heading, "What was happening here", "a mangled title on a wall reads as a mistake");
  const kept = buildWallCard({ storyText: "The water went up the pipe and over the edge.", title: "The long pipe", knownNames: ROSTER });
  assert.equal(kept.card.heading, "The long pipe", "a clean title is the educator's own words and stays");
});

test("app section headings are dropped, so the card reads as a card", () => {
  const card = buildWallCard({
    storyText: [
      "Learning Story",
      "Ruby tested how water travels down a slope and kept adjusting the angle until it worked.",
      "Curriculum links",
      "Exploration: testing a working theory through repeated attempts and adjustment.",
      "Where to next",
      "Offer longer pipes and a higher frame so the theory can be tested again tomorrow.",
    ].join("\n\n"),
    knownNames: ROSTER,
  });
  const body = card.card.body.join(" ");
  assert.ok(!body.startsWith("Learning Story"));
  assert.ok(/water travels/.test(body), body);
  assert.ok(!/ruby/i.test(body), body);
});

test("with no roster the scrub cannot vouch for itself, so nothing publishes", () => {
  // A sentence-opening name is the commonest case of all and a capital letter
  // there proves nothing, so flagging every sentence opener would bury real
  // warnings in noise. The honest guarantee is different: with no roster to
  // check against, the card is simply not publishable.
  const result = scrub("Ruby built it on 14 March.", []);
  assert.match(result.text, /recently/, "dates still go");
  const build = buildWallCard({ storyText: "Ruby built the long pipe and tested it again and again.", knownNames: [] });
  assert.equal(build.report.safe, false);
  assert.match(build.report.blockers.join(" "), /No child profiles/);
});

test("the scrub is idempotent, so re-running it can never re-mangle a card", () => {
  const once = clean("Ruby's pipe fell over on 14 March.");
  assert.equal(clean(once), once);
});

test("printed codes avoid the characters people misread", () => {
  const codes = Array.from({ length: 400 }, () => generateWallCode());
  assert.ok(codes.every((c) => c.length === WALL_CODE_LENGTH));
  // I, L, O, 0 and 1 are the pairs a grandparent reading a wall gets wrong.
  assert.ok(codes.every((c) => !/[ILO01]/.test(c)), codes.find((c) => /[ILO01]/.test(c)));
  assert.ok(codes.every(isWallCode));
  assert.ok(new Set(codes).size > 395, "codes must not collide in any practical sense");
});

test("a code is validated strictly, so a scanned URL cannot smuggle anything", () => {
  assert.equal(isWallCode("ABCDE23456"), true);
  assert.equal(isWallCode("abcde23456"), true, "case is forgiving, because people type lowercase");
  assert.equal(isWallCode("ABCDE2345"), false, "too short");
  assert.equal(isWallCode("ABCDE234567"), false, "too long");
  assert.equal(isWallCode("ABCDE2345O"), false, "excluded letter");
  assert.equal(isWallCode("../../etc/passwd"), false);
  assert.equal(isWallCode("ABCDE'2345"), false);
  assert.equal(isWallCode(null), false);
});

test("the printed line shows a human where the code goes", () => {
  assert.equal(formatWallCode("ABCDE23456"), "ABCDE 23456");
  assert.equal(wallCardUrl("abcde23456"), "https://storyloop.space/w/ABCDE23456");
});

test("gendered pronouns go, because the page must describe nobody if it leaks", () => {
  assert.equal(clean("Ruby kept trying. She said it needed to go higher."),
    "The child kept trying. They said it needed to go higher.");
  assert.equal(clean("He moved his block and then fixed it himself."),
    "They moved their block and then fixed it themselves.");
  assert.equal(clean("Sione passed the cup to her."), "The child passed the cup to them.");
  assert.equal(clean("We helped him carry it."), "We helped them carry it.");
});

test("the verb agreement that 'they' needs is repaired", () => {
  assert.equal(clean("She was proud of it."), "They were proud of it.");
  assert.equal(clean("He is still working on it."), "They are still working on it.");
  assert.equal(clean("She has done this before."), "They have done this before."); 
  assert.equal(clean("He doesn't give up."), "They don't give up.");
});

test("a sentence never starts lowercase, because this gets printed and stuck on a wall", () => {
  const text = clean("Ruby tried again. Ruby watched the water. Tāne copied.");
  assert.equal(text, "The child tried again. The child watched the water. The child copied.");
  assert.ok(!/[.!?]\s+[a-z]/.test(text), text);
});

test("de-gendering never reintroduces a name or breaks idempotency", () => {
  const once = clean("Ruby said she would try again, and her block held his pipe up.");
  assert.ok(!/ruby|\bshe\b|\bher\b|\bhis\b/i.test(once), once);
  assert.equal(clean(once), once, "running it twice must not change it again");
});
