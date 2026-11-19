import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  TELL_CENTRE_ADDRESS,
  TELL_CENTRE_ON,
  tellCentreMailto,
  tellCentreMessage,
  tellCentreMessageIsClean,
} from "../lib/family-tell-centre";
import { tellCentreForToken } from "../lib/family-tell-centre-server";

/**
 * Tell your centre (19 Nov 2026): a family who enjoys the stories can tell
 * their centre about StoryLoop from their own phone. The educator switches it
 * on per link; off, nothing shows and nothing is counted. The note names no
 * child, no educator and links no story, and nothing is sent from StoryLoop.
 */

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("the note says only that centres can try StoryLoop free, and where", () => {
  const message = tellCentreMessage();
  assert.match(message, /StoryLoop/);
  assert.match(message, /Centres can try it free/);
  assert.ok(message.endsWith(TELL_CENTRE_ADDRESS));
  assert.equal(TELL_CENTRE_ADDRESS, "https://storyloop.space/for-centres");
  // Short enough to read in a message app, and true on every date: no date, no length of free period.
  assert.ok(message.length < 220, `${message.length} characters`);
  assert.equal(/january|30 days|\d{4}/i.test(message), false);
  // Plain, and it concedes nothing: no other product, no "works alongside".
  assert.equal(/alongside|beside|instead of/i.test(message), false);
});

test("it names no child, no educator and links no story", () => {
  const message = tellCentreMessage();
  for (const names of [{ child: "Mia", educator: "Aroha" }, { child: "Theo", educator: "Sam Taylor" }, { child: "Kai", educator: null }]) {
    assert.equal(tellCentreMessageIsClean(message, names), true, JSON.stringify(names));
  }
  // The checker itself catches each thing that must never be in it.
  assert.equal(tellCentreMessageIsClean(`${message} Mia loves it.`, { child: "Mia" }), false);
  assert.equal(tellCentreMessageIsClean(`Aroha writes them. ${message}`, { educator: "Aroha Smith" }), false);
  assert.equal(tellCentreMessageIsClean(`${message} https://storyloop.space/family#AbCdEfGhIjKlMnOpQrStUvWxYz012345`, {}), false);
  assert.equal(tellCentreMessageIsClean(`${message} write to sam@example.com`, {}), false);
});

test("the mail fallback has no recipient: the parent chooses who it goes to", () => {
  const href = tellCentreMailto();
  assert.ok(href.startsWith("mailto:?"), href);
  const params = new URLSearchParams(href.slice("mailto:?".length));
  assert.equal(params.get("subject"), "Learning stories");
  assert.equal(params.get("body"), tellCentreMessage());
  assert.equal(params.has("to") || params.has("cc") || params.has("bcc"), false);
});

test("a link that is not a family key is off without asking the database", async () => {
  assert.equal(await tellCentreForToken(""), false);
  assert.equal(await tellCentreForToken("not-a-key"), false);
  assert.equal(await tellCentreForToken("x".repeat(31)), false);
});

test("off by default: the column starts false, and off means no line, no button and no event", () => {
  const migration = read("../supabase/migrations/20261119_family_tell_centre.sql");
  assert.match(migration, /add column if not exists tell_centre boolean not null default false/);
  const page = read("../components/marketing/FamilyPage.tsx");
  assert.match(page, /const \[tellCentre, setTellCentre\] = useState\(false\);/, "the family page starts with it off");
  assert.match(page, /const tell = TELL_CENTRE_ON && data\.tellCentre === true;\s*setTellCentre\(tell\);/, "only a true answer from the server switches it on, and only while the feature is on");
  assert.match(page, /\{tellCentre && view\.stories\.length > 0 && \(/, "the line and button render only when on");
  assert.match(page, /if \(tell && data\.view\.stories\.length > 0\) trackEvent\("ui_action", \{ action: "family_tell_centre_shown", page: "\/family" \}\)/);
  // Events carry a fixed name and the page path only: never the key, the child or the note.
  for (const call of page.match(/trackEvent\([^)]*\)/g) ?? []) assert.match(call, /^trackEvent\("ui_action", \{ action: "family_tell_centre_\w+", page: "\/family" \}\)$/);
  // Nothing is sent from our servers: the note goes to the parent's own share sheet or mail app.
  const tapHandler = page.slice(page.indexOf("const tellTheCentre"), page.indexOf("const reply ="));
  assert.ok(tapHandler.length > 0);
  assert.equal(/fetch\(/.test(tapHandler), false);
  assert.match(tapHandler, /navigator\.share\(\{ text \}\)/);
  assert.match(tapHandler, /tellCentreMailto\(text\)/);
});

test("the family page keeps its privacy: still noindex and no-referrer, the key never in an address", () => {
  const route = read("../app/family/page.tsx");
  assert.match(route, /robots: \{ index: false, follow: false/);
  assert.match(route, /referrer: "no-referrer"/);
  const api = read("../app/api/family/route.ts");
  assert.match(api, /const tellCentre = TELL_CENTRE_ON \? await tellCentreForToken\(token\) : false;\n\s*return NextResponse\.json\(\{ view, tellCentre \}/);
});

test("only the educator switches it, for one of her own open links, through her own account", () => {
  const server = read("../lib/family-tell-centre-server.ts");
  const set = server.slice(server.indexOf("export async function setTellCentre"));
  for (const guard of ['.eq("id", linkId)', '.eq("user_id", userId)', '.eq("child_id", childId)', '.is("revoked_at", null)', '.gt("expires_at"']) {
    assert.ok(set.includes(guard), `setTellCentre must filter ${guard}`);
  }
  const route = read("../app/api/children/[id]/family-links/route.ts");
  const patch = route.slice(route.indexOf("export async function PATCH"), route.indexOf("export async function DELETE"));
  assert.match(patch, /auth\.getUser\(\)/);
  assert.match(patch, /typeof body\?\.tellCentre !== "boolean"/);
  assert.match(patch, /setTellCentre\(user\.id, id, linkId, body\.tellCentre\)/);
  const share = read("../components/app/FamilyShare.tsx");
  assert.match(share, /const tellOn = state\?\.tellCentre\?\.\[link\.id\] === true;/, "a link with no stored answer shows as off");
  assert.match(share, /role="switch"/);
});

test("held for this release: off everywhere, from one constant, until three real family links exist", () => {
  assert.equal(TELL_CENTRE_ON, false, "Tell your centre is held (release decision, 19 Nov 2026): switch it on only with that decision changed");
  // The switch's API refuses before reading anything.
  const route = read("../app/api/children/[id]/family-links/route.ts");
  const patch = route.slice(route.indexOf("export async function PATCH"), route.indexOf("export async function DELETE"));
  assert.match(patch, /^export async function PATCH\([^)]*\) \{\n\s*if \(!TELL_CENTRE_ON\) return NextResponse\.json\(\{ error: "Not found\." \}, \{ status: 404 \}\);/);
  // The family page's API and the educator's family state never read the column while it is off,
  // so the release works whether or not 20261119_family_tell_centre.sql has reached production.
  assert.match(read("../app/api/family/route.ts"), /TELL_CENTRE_ON \? await tellCentreForToken\(token\) : false/);
  assert.match(read("../app/api/stories/[id]/family/route.ts"), /if \(!TELL_CENTRE_ON\) return state;/);
  // The educator sees no switch and no help line; the family page shows no line.
  const share = read("../components/app/FamilyShare.tsx");
  assert.match(share, /\{TELL_CENTRE_ON && <button/);
  assert.match(share, /\{TELL_CENTRE_ON && links\.length > 0 && \(/);
  assert.match(read("../components/marketing/FamilyPage.tsx"), /const tell = TELL_CENTRE_ON && data\.tellCentre === true;/);
});
