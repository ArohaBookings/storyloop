import assert from "node:assert/strict";
import test from "node:test";
import {
  FAMILY_LINK_DAYS,
  FAMILY_REPLY_MAX,
  cleanFamilyLabel,
  cleanFamilyReply,
  educatorFamilyView,
  familyLinkExpiry,
  familyLinkState,
  familyTokenFromHash,
  familyUrl,
  familyView,
  isUsableStoryTranslation,
  looksLikeFamilyToken,
  quotedPhrases,
  storyTitle,
  textFingerprint,
  translationFor,
  type FamilyLinkRow,
} from "../lib/family-link";

const NOW = new Date("2026-11-10T08:00:00Z");
const link = (over: Partial<FamilyLinkRow> = {}): FamilyLinkRow => ({
  id: "l1", user_id: "acct-7f3q", child_id: "child-9z1x", label: "Nana", language: "sm", created_at: "2026-11-01T00:00:00Z",
  expires_at: "2027-12-05T00:00:00Z", revoked_at: null, last_opened_at: null, open_count: 0, ...over,
});
const STORY = `More sand\n\nLearning Story\nTama filled the bucket and tipped it out. He said, "more sand". Then he told Mere, “look, it sinks”.\n\nCurriculum links\nMana aotūroa | Exploration: he tested what sand does in water.`;

test("a key is 32 URL-safe characters and nothing else is looked up", () => {
  assert.equal(looksLikeFamilyToken("a".repeat(32)), true);
  assert.equal(looksLikeFamilyToken("aB3_-".repeat(6) + "ab"), true);
  for (const bad of ["", "a".repeat(31), "a".repeat(33), "a".repeat(31) + "/", null, undefined, 12, { a: 1 }]) assert.equal(looksLikeFamilyToken(bad), false);
  assert.equal(familyTokenFromHash("#" + "k".repeat(32)), "k".repeat(32));
  assert.equal(familyTokenFromHash("#../admin"), "");
  assert.equal(familyUrl("https://storyloop.space/", "t".repeat(32)), `https://storyloop.space/family#${"t".repeat(32)}`);
});

test("a link is open until it is cancelled or its time runs out; cancelled wins", () => {
  assert.equal(familyLinkState(link(), NOW), "open");
  assert.equal(familyLinkState(link({ expires_at: "2026-11-10T07:59:59Z" }), NOW), "expired");
  assert.equal(familyLinkState(link({ revoked_at: "2026-11-09T00:00:00Z" }), NOW), "cancelled");
  assert.equal(familyLinkState(link({ revoked_at: "2026-11-09T00:00:00Z", expires_at: "2020-01-01T00:00:00Z" }), NOW), "cancelled");
  assert.equal(Math.round((familyLinkExpiry(NOW).getTime() - NOW.getTime()) / 86_400_000), FAMILY_LINK_DAYS);
});

test("labels and replies are cleaned without changing what a family said", () => {
  assert.equal(cleanFamilyLabel("  Nana   Mere <script> "), "Nana Mere script");
  assert.equal(cleanFamilyLabel("mum@example.com"), "");
  assert.equal(cleanFamilyLabel(42), "");
  assert.equal(cleanFamilyLabel("x".repeat(80)).length, 30);
  assert.equal(cleanFamilyReply("  Fa'afetai lava!\u0000  E fiafia  o ia i le oneone.\n\n\n\nMalo.  "), "Fa'afetai lava! E fiafia o ia i le oneone.\n\nMalo.");
  assert.equal(cleanFamilyReply("谢谢老师，他在家也喜欢玩沙子。"), "谢谢老师，他在家也喜欢玩沙子。");
  assert.equal(cleanFamilyReply("a".repeat(5000)).length, FAMILY_REPLY_MAX);
  assert.equal(cleanFamilyReply(null), "");
});

test("a translation is refused if one word the child said is missing or changed", () => {
  const original = { title: "More sand", text: STORY };
  const good = {
    title: "O le oneone",
    text: `O le oneone\n\nTala o le Aoaoina\nNa faatumu e Tama le pakete ma sasaa. Na ia fai mai, "more sand" (toe aumai le oneone). Ona ia ta'u atu lea ia Mere, “look, it sinks” (vaai, ua goto).\n\nSootaga i le mataupu\nMana aotūroa | Exploration: na ia tofotofoina le oneone i le vai.`,
    notice: "Na faaliliuina e le komepiuta.",
  };
  assert.deepEqual(quotedPhrases(STORY), ["more sand", "look, it sinks"]);
  assert.equal(isUsableStoryTranslation(original, good), true);
  // The child's words translated instead of kept.
  assert.equal(isUsableStoryTranslation(original, { ...good, text: good.text.replace('"more sand"', '"toe aumai le oneone"') }), false);
  // One word of the quote changed.
  assert.equal(isUsableStoryTranslation(original, { ...good, text: good.text.replace("look, it sinks", "look, it sink") }), false);
  // A line dropped, or one added.
  assert.equal(isUsableStoryTranslation(original, { ...good, text: good.text.replace("\n\nSootaga i le mataupu", "") }), false);
  assert.equal(isUsableStoryTranslation(original, { ...good, text: good.text + "\n\nNote: translated." }), false);
  // Empty, tiny or runaway answers.
  assert.equal(isUsableStoryTranslation(original, { ...good, text: "more sand look, it sinks" }), false);
  assert.equal(isUsableStoryTranslation(original, { ...good, text: good.text + " x".repeat(2000) }), false);
  assert.equal(isUsableStoryTranslation(original, { ...good, notice: "" }), false);
  assert.equal(isUsableStoryTranslation(original, { ...good, title: "" }), false);
  assert.equal(isUsableStoryTranslation(original, null), false);
  assert.equal(isUsableStoryTranslation(original, "a string"), false);
});

test("a translation is shown only for the wording it was made from", () => {
  const stored = { sm: { title: "O le oneone", text: "…", notice: "…", source: textFingerprint(STORY) } };
  assert.equal(translationFor(stored, "sm", STORY)?.title, "O le oneone");
  assert.equal(translationFor(stored, "sm", STORY + " Edited."), null, "an edited story never shows a stale translation");
  assert.equal(translationFor(stored, "hi", STORY), null);
  assert.equal(translationFor(stored, null, STORY), null);
  assert.equal(translationFor(null, "sm", STORY), null);
  assert.equal(translationFor({ sm: { title: "x" } }, "sm", STORY), null);
  assert.notEqual(textFingerprint("a"), textFingerprint("b"));
});

test("the family's page gets first names, shared stories and only its own replies", () => {
  const view = familyView({
    link: link(),
    childName: "Tama Ngata",
    educatorName: "Mere Te Rangi",
    language: { code: "sm", endonym: "Gagana Sāmoa" },
    stories: [{ id: "s1", story_text: STORY, created_at: "2026-11-09T00:00:00Z", metadata: { storyTitle: "More sand", secret: "never" }, translations: { sm: { title: "O le oneone", text: "T", notice: "N", source: textFingerprint(STORY) } } }],
    replies: [
      { id: "r1", link_id: "l1", story_id: "s1", body: "Fa'afetai", body_en: "Thank you", created_at: "2026-11-09T05:00:00Z", seen_at: null },
      { id: "r2", link_id: "other-link", story_id: "s1", body: "From Dad", body_en: null, created_at: "2026-11-09T06:00:00Z", seen_at: null },
    ],
    now: NOW,
  });
  assert.equal(view.state, "open");
  assert.equal(view.childName, "Tama");
  assert.equal(view.educator, "Mere");
  assert.equal(view.stories.length, 1);
  assert.equal(view.stories[0].title, "More sand");
  assert.equal(view.stories[0].translation?.title, "O le oneone");
  assert.deepEqual(view.stories[0].replies, [{ body: "Fa'afetai", at: "2026-11-09T05:00:00Z" }], "one caregiver never sees another's reply, or the English reading");
  const text = JSON.stringify(view);
  for (const leak of ["Ngata", "Te Rangi", "acct-7f3q", "child-9z1x", "secret", "never", "Thank you", "From Dad", "token"]) assert.equal(text.includes(leak), false, `${leak} must not reach the family`);
});

test("an educator with an email for a name is never shown to a family", () => {
  const view = familyView({ link: link({ language: null }), childName: null, educatorName: "mere@example.com", language: null, stories: [], replies: [], now: NOW });
  assert.equal(view.educator, "Your child's teacher");
  assert.equal(view.childName, "your child");
  assert.equal(view.language, null);
});

test("the educator sees every link's state and who each reply came from", () => {
  const view = educatorFamilyView({
    links: [link(), link({ id: "l2", label: null, language: null, open_count: 3, last_opened_at: "2026-11-09T00:00:00Z" })],
    replies: [{ id: "r1", link_id: "l1", story_id: "s1", body: "Fa'afetai", body_en: "Thank you", created_at: "2026-11-09T05:00:00Z", seen_at: null }],
    sharedStoryIds: ["s1"],
    now: NOW,
  });
  assert.deepEqual(view.links.map((l) => [l.label, l.opened, l.state]), [["Nana", false, "open"], ["Family", true, "open"]]);
  assert.deepEqual(view.replies[0], { id: "r1", storyId: "s1", from: "Nana", body: "Fa'afetai", bodyEn: "Thank you", at: "2026-11-09T05:00:00Z", seen: false });
});

test("a story's title is its stored one, else its first line", () => {
  assert.equal(storyTitle(STORY, "Sand and water"), "Sand and water");
  assert.equal(storyTitle(STORY, ""), "More sand");
  assert.equal(storyTitle("\n\n  \n", undefined), "A learning story");
});
