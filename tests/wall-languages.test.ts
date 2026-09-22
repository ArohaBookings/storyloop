import assert from "node:assert/strict";
import test from "node:test";
import {
  findWallLanguage,
  isUsableTranslation,
  preferredLanguage,
  TRANSLATION_NOTICE,
  WALL_LANGUAGE_CODES,
  WALL_LANGUAGES,
  type TranslatableCard,
} from "../lib/wall-languages";

const ALL = WALL_LANGUAGE_CODES;

test("every language names itself, because an English menu is useless to whoever needs it", () => {
  assert.ok(WALL_LANGUAGES.length >= 10);
  for (const language of WALL_LANGUAGES) {
    assert.ok(language.endonym.trim().length > 0, language.code);
    assert.ok(language.english.trim().length > 0, language.code);
  }
  // Spot the ones that would be wrong if somebody "tidied" them into English.
  assert.equal(findWallLanguage("sm")?.endonym, "Gagana Sāmoa");
  assert.equal(findWallLanguage("mi")?.endonym, "Te Reo Māori");
  assert.equal(findWallLanguage("zh-Hans")?.endonym, "简体中文");
  assert.equal(findWallLanguage("ar")?.endonym, "العربية");
  // Right to left has to be declared or the script renders as nonsense.
  assert.equal(findWallLanguage("ar")?.rtl, true);
});

test("codes are unique and resolvable, case-insensitively", () => {
  assert.equal(new Set(ALL).size, ALL.length);
  assert.equal(findWallLanguage("SM")?.code, "sm");
  assert.equal(findWallLanguage(" mi ")?.code, "mi");
  assert.equal(findWallLanguage("klingon"), null);
  assert.equal(findWallLanguage(null), null);
  assert.equal(findWallLanguage(""), null);
});

test("THE moment: a phone set to Samoan gets Samoan without anybody touching a menu", () => {
  assert.equal(preferredLanguage("sm-WS,sm;q=0.9,en;q=0.5", ALL), "sm");
  assert.equal(preferredLanguage("mi-NZ", ALL), "mi");
  assert.equal(preferredLanguage("hi-IN,hi;q=0.9", ALL), "hi");
  assert.equal(preferredLanguage("ar", ALL), "ar");
});

test("an English browser is left in English, which is what the card already is", () => {
  assert.equal(preferredLanguage("en-NZ,en;q=0.9", ALL), null);
  assert.equal(preferredLanguage("en-AU", ALL), null);
  assert.equal(preferredLanguage("en", ALL), null);
});

test("Chinese is matched by script, because that is what actually differs", () => {
  assert.equal(preferredLanguage("zh-CN", ALL), "zh-Hans");
  assert.equal(preferredLanguage("zh", ALL), "zh-Hans");
  assert.equal(preferredLanguage("zh-Hans-CN", ALL), "zh-Hans");
  assert.equal(preferredLanguage("zh-TW", ALL), "zh-Hant");
  assert.equal(preferredLanguage("zh-HK", ALL), "zh-Hant");
  assert.equal(preferredLanguage("zh-Hant", ALL), "zh-Hant");
});

test("quality values are honoured, because a browser that prefers Tongan means it", () => {
  assert.equal(preferredLanguage("en;q=0.2,to;q=0.9", ALL), "to");
  // English first at full quality still means English.
  assert.equal(preferredLanguage("en,to;q=0.9", ALL), null);
  assert.equal(preferredLanguage("fr;q=0.9,vi;q=0.8", ALL), "vi", "an unavailable language falls through to the next");
});

test("a language we do not have falls back rather than guessing something close", () => {
  assert.equal(preferredLanguage("fr-FR,fr", ALL), null);
  assert.equal(preferredLanguage("", ALL), null);
  assert.equal(preferredLanguage(null, ALL), null);
  assert.equal(preferredLanguage("sm", []), null, "an unpublished translation is not offered");
  assert.equal(preferredLanguage("nonsense;;;q=abc", ALL), null);
});

const ORIGINAL: TranslatableCard = {
  heading: "What was happening here",
  body: ["The child kept trying to get the water to go up the pipe, and moved a block underneath until it worked."],
  dispositions: ["Perseverance"],
  curriculum: ["Exploration", "Communication"],
  tryAtHome: null,
};

test("a translation is checked before it is ever printed on a wall", () => {
  const good = {
    heading: "O le a le mea sa tupu iinei",
    body: ["Sa taumafai pea le tamaitiiti e faia le vai e alu i luga o le paipa, ma sa ia siitia se poloka i lalo seia oo ina manuia."],
    dispositions: ["Finafinau"],
    curriculum: ["Suesuega", "Fesootaiga"],
    tryAtHome: null,
  };
  assert.equal(isUsableTranslation(ORIGINAL, good), true);
});

test("a refusal, an apology or the English handed back is a failure, not a translation", () => {
  // The once-in-a-thousand answers that would otherwise be printed and trusted.
  assert.equal(isUsableTranslation(ORIGINAL, { ...ORIGINAL }), false, "English back again");
  assert.equal(isUsableTranslation(ORIGINAL, { heading: "Sorry", body: ["I cannot help with that."], dispositions: ["Perseverance"], curriculum: ["Exploration", "Communication"], tryAtHome: null }), false);
  assert.equal(isUsableTranslation(ORIGINAL, { ...ORIGINAL, heading: "Ok", body: ["Ok"] }), false, "far too short");
  assert.equal(isUsableTranslation(ORIGINAL, { ...ORIGINAL, body: ["x".repeat(2000)] }), false, "far too long");
});

test("a translation that drops or invents a section is refused", () => {
  assert.equal(isUsableTranslation(ORIGINAL, { ...ORIGINAL, body: [] }), false);
  assert.equal(isUsableTranslation(ORIGINAL, { ...ORIGINAL, curriculum: ["Suesuega"] }), false, "a curriculum link went missing");
  assert.equal(isUsableTranslation(ORIGINAL, { ...ORIGINAL, dispositions: ["A", "B"] }), false, "one appeared from nowhere");
});

test("anything that is not the right shape at all is refused", () => {
  for (const junk of [null, undefined, "a string", 42, [], { heading: 1 }, { heading: "ok" }]) {
    assert.equal(isUsableTranslation(ORIGINAL, junk), false, JSON.stringify(junk));
  }
  assert.equal(isUsableTranslation(ORIGINAL, { ...ORIGINAL, heading: "Fou", body: ["Sa taumafai"], tryAtHome: 5 }), false);
});

test("the notice is translated too, because a warning nobody can read is not a warning", () => {
  const withNotice = {
    heading: "O le a le mea sa tupu iinei",
    body: ["Sa taumafai pea le tamaitiiti e faia le vai e alu i luga o le paipa."],
    dispositions: ["Finafinau"],
    curriculum: ["Suesuega", "Fesootaiga"],
    tryAtHome: null,
    notice: "Sa faaliliuina lenei e se masini mai le Igilisi a le faiaoga.",
  };
  assert.equal(isUsableTranslation(ORIGINAL, withNotice), true);
  // Absent is fine: the page falls back to the English notice, which is no
  // worse than it was before.
  assert.equal(isUsableTranslation(ORIGINAL, { ...withNotice, notice: undefined }), true);
  assert.equal(isUsableTranslation(ORIGINAL, { ...withNotice, notice: null }), true);
  // But a notice of the wrong type is a malformed answer.
  assert.equal(isUsableTranslation(ORIGINAL, { ...withNotice, notice: 42 }), false);
});

test("the English notice says what it needs to and nothing more", () => {
  assert.match(TRANSLATION_NOTICE, /translated by machine/i);
  assert.match(TRANSLATION_NOTICE, /tell a kaiako/i, "there must be a way to report a bad translation");
  assert.match(TRANSLATION_NOTICE, /English version/i, "the original must be pointed at");
});
