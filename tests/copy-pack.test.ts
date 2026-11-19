import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { COPY_PACK_LABEL, showCopyPackBeside } from "../lib/copy-pack";
import { sanitizeEventMetadata } from "../lib/analytics/events";

// Proposal F (18 Nov 2026): the export packs, right beside Copy at the moment she copies.

const ID = "3f2b8c1e-9a4d-4c7b-8e21-6d5a0b9c1f42";

test("beside Copy only once she has copied this story, on a plan with the packs", () => {
  assert.equal(showCopyPackBeside({ plan: "educator", storyId: ID, copiedStoryId: ID }), true);
  for (const plan of ["educator_pro", "centre_starter", "centre_growth"]) {
    assert.equal(showCopyPackBeside({ plan, storyId: ID, copiedStoryId: ID }), true, plan);
  }
  assert.equal(showCopyPackBeside({ plan: "educator", storyId: ID, copiedStoryId: "" }), false, "not before she copies");
  assert.equal(showCopyPackBeside({ plan: "educator", storyId: ID, copiedStoryId: "another-story" }), false, "a copy of an earlier story does not count");
  assert.equal(showCopyPackBeside({ plan: "educator", storyId: "", copiedStoryId: "" }), false, "an unsaved story has no pack");
  assert.equal(showCopyPackBeside({ plan: "free", storyId: ID, copiedStoryId: ID }), false, "a free account sees nothing new, as before");
  assert.equal(showCopyPackBeside({ plan: null, storyId: ID, copiedStoryId: ID }), false);
});

test("the button names no other app", () => {
  assert.equal(COPY_PACK_LABEL, "For my centre's app");
  assert.doesNotMatch(COPY_PACK_LABEL, /storypark|educa|kinderloop|brightwheel|[—–]/i);
});

test("its events carry the story id and the neutral pack name only", () => {
  assert.deepEqual(sanitizeEventMetadata("copy_pack_opened", { story_id: ID, text: "Mia built a tower" }), { story_id: ID });
  assert.deepEqual(sanitizeEventMetadata("copy_pack_copied", { story_id: ID, pack: "pack_2" }), { story_id: ID, pack: "pack_2" });
  assert.deepEqual(sanitizeEventMetadata("copy_pack_copied", { story_id: ID, pack: "storypark" }), { story_id: ID }, "never a platform name");
});

test("the story page and History put it right after Copy and copying a pack is recorded", () => {
  const page = readFileSync("app/(app)/generate/page.tsx", "utf8");
  const copyButton = page.indexOf('onClick={handleCopy} className={storyAction}');
  const packButton = page.indexOf("<CopyPackButton storyId={storyId}");
  const shareButton = page.indexOf('data-testid="row-share-family"');
  assert.ok(copyButton > 0 && packButton > copyButton && packButton < shareButton, "right beside Copy, before anything else in the row");
  assert.match(page, /setPackBesideCopy\(storyId\);/, "Copy brings it");
  assert.match(page, /<div id="copy-pack" tabIndex=\{-1\}/, "the packs are where the button takes her");

  const history = readFileSync("components/app/StoryHistoryItem.tsx", "utf8");
  const historyCopy = history.indexOf("onClick={copyStory}");
  const historyPack = history.indexOf("<CopyPackButton storyId={story.id}");
  assert.ok(historyCopy > 0 && historyPack > historyCopy, "History: right after Copy");
  assert.match(history, /id=\{`copy-pack-\$\{story\.id\}`\}/);

  const panel = readFileSync("components/app/ExportPackPanel.tsx", "utf8");
  assert.match(panel, /trackEvent\("copy_pack_copied", \{ story_id: storyId \?\? null, pack: packName \}\)/);
  const button = readFileSync("components/app/CopyPackButton.tsx", "utf8");
  assert.match(button, /trackEvent\("copy_pack_opened", \{ story_id: storyId \|\| null \}\)/);
  assert.doesNotMatch(button, /window\.open|dialog|modal/i, "no pop-up: it scrolls to the packs already on the page");
});

test("review 2: every copy pack is named by what the format is, never by another product", () => {
  const visible = ["lib/export-packs.ts", "components/app/ExportPackPanel.tsx", "app/(app)/centre-tools/page.tsx"].map((file) =>
    readFileSync(file, "utf8").replace(/\b(platform|value|exportStyle|key)\s*[:=]\s*"[a-z]+"/g, "").replace(/"(storypark|educa|kinderloop|brightwheel)"/g, ""),
  );
  for (const text of visible) {
    assert.doesNotMatch(text.replace(/\/\/.*$/gm, ""), />[^<]*(Storypark|Educa\b|Kinderloop|Brightwheel)[^<]*<|label: "(Storypark|Educa|Kinderloop|Brightwheel)"/);
  }
});
