import { createAdminSupabase } from "@/lib/supabase/admin";
import { hashCheckToken, newCheckToken } from "@/lib/story-check-token";
import { findWallLanguage, type WallLanguage } from "@/lib/wall-languages";
import { getCentreCover } from "@/lib/centres";
import { hasFeatureAccess } from "@/lib/plans";
import { replyInEnglish, translateStoryForFamily } from "@/lib/family-translate";
import {
  FAMILY_LINKS_PER_CHILD,
  FAMILY_STORIES_SHOWN,
  cleanFamilyLabel,
  cleanFamilyReply,
  educatorFamilyView,
  familyLinkExpiry,
  familyLinkState,
  familyView,
  looksLikeFamilyToken,
  storyTitle,
  translationFor,
  type EducatorFamilyView,
  type FamilyLinkRow,
  type FamilyView,
} from "@/lib/family-link";

/**
 * Database work for the Family link (lib/family-link.ts). Service role only.
 * Every read is by an owner id as well as a row id, and every "no" a family's
 * browser can receive looks the same, so a guessed link learns nothing.
 */
const LINK_COLUMNS = "id, user_id, child_id, label, language, created_at, expires_at, revoked_at, last_opened_at, open_count";
const REPLY_COLUMNS = "id, link_id, story_id, body, body_en, created_at, seen_at";

type ShareRow = { story_id: string; translations: unknown; shared_at: string };

/** Whether this educator's plan, their own or their centre's, includes translation. */
export async function canTranslateFor(userId: string): Promise<boolean> {
  try {
    const { data } = await createAdminSupabase().from("profiles").select("plan").eq("id", userId).maybeSingle();
    const cover = await getCentreCover(userId, data?.plan);
    return hasFeatureAccess(cover?.plan ?? data?.plan, "translationReadability");
  } catch {
    return false;
  }
}

async function findLink(token: string): Promise<FamilyLinkRow | null> {
  if (!looksLikeFamilyToken(token)) return null;
  const { data } = await createAdminSupabase().from("family_links").select(LINK_COLUMNS).eq("token_hash", hashCheckToken(token)).maybeSingle();
  return (data as FamilyLinkRow | null) ?? null;
}

async function sharedStories(childId: string, userId: string) {
  const admin = createAdminSupabase();
  const { data: shares } = await admin
    .from("family_shares")
    .select("story_id, translations, shared_at")
    .eq("child_id", childId)
    .eq("user_id", userId)
    .order("shared_at", { ascending: false })
    .limit(FAMILY_STORIES_SHOWN);
  const rows = (shares ?? []) as ShareRow[];
  if (!rows.length) return [];
  const { data: stories } = await admin
    .from("stories")
    .select("id, story_text, created_at, metadata")
    .eq("user_id", userId)
    .in("id", rows.map((row) => row.story_id));
  const byId = new Map((stories ?? []).map((story) => [story.id as string, story]));
  return rows
    .map((row) => {
      const story = byId.get(row.story_id);
      return story ? { id: story.id as string, story_text: story.story_text as string, created_at: (story.created_at as string | null) ?? row.shared_at, metadata: story.metadata, translations: row.translations } : null;
    })
    .filter((story): story is NonNullable<typeof story> => story !== null)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

async function viewFor(link: FamilyLinkRow, now: Date): Promise<FamilyView | null> {
  const admin = createAdminSupabase();
  const [{ data: child }, { data: profile }, stories, { data: replies }] = await Promise.all([
    admin.from("child_profiles").select("name").eq("id", link.child_id).eq("user_id", link.user_id).maybeSingle(),
    admin.from("profiles").select("full_name").eq("id", link.user_id).maybeSingle(),
    sharedStories(link.child_id, link.user_id),
    admin.from("family_replies").select(REPLY_COLUMNS).eq("link_id", link.id).order("created_at", { ascending: true }).limit(200),
  ]);
  if (!child) return null;
  return familyView({
    link,
    childName: child.name,
    educatorName: profile?.full_name ?? null,
    language: findWallLanguage(link.language),
    stories,
    replies: (replies ?? []) as Parameters<typeof familyView>[0]["replies"],
    now,
  });
}

/** What a family holding this link may see, or null for an unknown, cancelled or ended link. */
export async function openFamilyLink(token: string, now = new Date()): Promise<FamilyView | null> {
  const link = await findLink(token);
  if (!link || familyLinkState(link, now) !== "open") return null;
  await createAdminSupabase()
    .from("family_links")
    .update({ last_opened_at: now.toISOString(), open_count: (link.open_count ?? 0) + 1 })
    .eq("id", link.id);
  return viewFor(link, now);
}

/** A family member writes back about one of the shared stories. */
export async function replyThroughFamilyLink(
  token: string,
  input: { storyId: unknown; text: unknown },
  now = new Date(),
): Promise<{ ok: false; reason: "gone" | "empty" | "not_shared" | "failed" } | { ok: true; view: FamilyView; userId: string; storyId: string }> {
  const link = await findLink(token);
  if (!link || familyLinkState(link, now) !== "open") return { ok: false, reason: "gone" };
  const body = cleanFamilyReply(input.text);
  if (!body) return { ok: false, reason: "empty" };
  const storyId = typeof input.storyId === "string" ? input.storyId : "";
  const admin = createAdminSupabase();
  // Only a story the educator shared with THIS child's family can be answered.
  const { data: share } = await admin.from("family_shares").select("story_id").eq("story_id", storyId).eq("child_id", link.child_id).eq("user_id", link.user_id).maybeSingle();
  if (!share) return { ok: false, reason: "not_shared" };

  const english = (await canTranslateFor(link.user_id)) ? await replyInEnglish(body) : null;
  const { error } = await admin.from("family_replies").insert({
    link_id: link.id,
    story_id: storyId,
    child_id: link.child_id,
    user_id: link.user_id,
    body,
    body_en: english,
  });
  if (error) {
    console.error("Family reply insert failed:", error.message);
    return { ok: false, reason: "failed" };
  }
  const view = await viewFor(link, now);
  return view ? { ok: true, view, userId: link.user_id, storyId } : { ok: false, reason: "failed" };
}

/** Translate one story into each language, tolerating failure, and store what passed. */
async function translateShare(userId: string, storyId: string, languages: WallLanguage[]) {
  if (!languages.length) return 0;
  const admin = createAdminSupabase();
  const [{ data: story }, { data: share }] = await Promise.all([
    admin.from("stories").select("story_text, metadata").eq("id", storyId).eq("user_id", userId).maybeSingle(),
    admin.from("family_shares").select("translations").eq("story_id", storyId).eq("user_id", userId).maybeSingle(),
  ]);
  if (!story || !share) return 0;
  const meta = story.metadata && typeof story.metadata === "object" ? (story.metadata as Record<string, unknown>) : {};
  const title = storyTitle(story.story_text, meta.storyTitle);
  const existing = (share.translations && typeof share.translations === "object" ? share.translations : {}) as Record<string, unknown>;
  const needed = languages.filter((language) => !translationFor(existing, language.code, story.story_text));
  if (!needed.length) return 0;
  const results = await Promise.allSettled(needed.map(async (language) => [language.code, await translateStoryForFamily({ title, text: story.story_text }, language)] as const));
  const next = { ...existing };
  let made = 0;
  for (const result of results) {
    if (result.status === "fulfilled" && result.value[1]) { next[result.value[0]] = result.value[1]; made += 1; }
  }
  if (made) await admin.from("family_shares").update({ translations: next }).eq("story_id", storyId).eq("user_id", userId);
  return made;
}

async function activeLinks(userId: string, childId: string, now = new Date()) {
  const { data } = await createAdminSupabase().from("family_links").select(LINK_COLUMNS).eq("user_id", userId).eq("child_id", childId).order("created_at", { ascending: false }).limit(40);
  return ((data ?? []) as FamilyLinkRow[]).filter((link) => familyLinkState(link, now) === "open");
}

/** The child this story belongs to for sharing: its own profile, else the one profile with the same first name, else a new one. */
async function childForStory(userId: string, story: { child_id: string | null; child_name: string | null; age_group: string | null }, requestedChildId?: string) {
  const admin = createAdminSupabase();
  const wanted = requestedChildId || story.child_id;
  if (wanted) {
    const { data } = await admin.from("child_profiles").select("id, name").eq("id", wanted).eq("user_id", userId).maybeSingle();
    if (data) return { id: data.id as string, name: data.name as string };
  }
  const name = (story.child_name ?? "").trim();
  if (!name) return null;
  const first = name.split(/\s+/)[0].toLowerCase();
  const { data: profiles } = await admin.from("child_profiles").select("id, name").eq("user_id", userId).limit(500);
  const matches = (profiles ?? []).filter((profile) => String(profile.name).trim().split(/\s+/)[0].toLowerCase() === first);
  if (matches.length === 1) return { id: matches[0].id as string, name: matches[0].name as string };
  if (matches.length > 1) return null; // two children with that first name: the educator picks
  const { data: created } = await admin.from("child_profiles").insert({ user_id: userId, name: name.slice(0, 60), age_group: story.age_group }).select("id, name").single();
  return created ? { id: created.id as string, name: created.name as string } : null;
}

/** Share a story with its child's family. Idempotent. Returns null when the story is not the educator's. */
export async function shareStoryWithFamily(userId: string, storyId: string, requestedChildId?: string) {
  const admin = createAdminSupabase();
  const { data: story } = await admin.from("stories").select("id, child_id, child_name, age_group").eq("id", storyId).eq("user_id", userId).maybeSingle();
  if (!story) return null;
  const child = await childForStory(userId, story, requestedChildId);
  if (!child) return { needsChild: true as const };
  const { error } = await admin.from("family_shares").upsert({ story_id: storyId, child_id: child.id, user_id: userId }, { onConflict: "story_id", ignoreDuplicates: false });
  if (error) {
    console.error("Family share failed:", error.message);
    return { failed: true as const };
  }
  let translated = 0;
  if (await canTranslateFor(userId)) {
    const languages = [...new Map((await activeLinks(userId, child.id)).map((link) => [link.language, findWallLanguage(link.language)])).values()].filter((language): language is WallLanguage => language !== null);
    translated = await translateShare(userId, storyId, languages);
  }
  return { child, translated };
}

export async function unshareStory(userId: string, storyId: string) {
  const { error } = await createAdminSupabase().from("family_shares").delete().eq("story_id", storyId).eq("user_id", userId);
  return !error;
}

/** Make a link for one child. The key is returned once and never stored. */
export async function createFamilyLink(userId: string, childId: string, input: { label: unknown; language: unknown }, now = new Date()) {
  const admin = createAdminSupabase();
  const { data: child } = await admin.from("child_profiles").select("id, name").eq("id", childId).eq("user_id", userId).maybeSingle();
  if (!child) return { ok: false as const, reason: "no_child" as const };
  if ((await activeLinks(userId, childId, now)).length >= FAMILY_LINKS_PER_CHILD) return { ok: false as const, reason: "too_many" as const };
  const language = findWallLanguage(typeof input.language === "string" ? input.language : null);
  const { token, hash } = newCheckToken();
  const { error } = await admin.from("family_links").insert({
    user_id: userId,
    child_id: childId,
    label: cleanFamilyLabel(input.label) || "Family",
    language: language?.code ?? null,
    token_hash: hash,
    expires_at: familyLinkExpiry(now).toISOString(),
  });
  if (error) {
    console.error("Family link create failed:", error.message);
    return { ok: false as const, reason: "failed" as const };
  }
  // Stories already shared get this language too, newest first, a bounded number.
  if (language && (await canTranslateFor(userId))) {
    const { data: shares } = await admin.from("family_shares").select("story_id").eq("child_id", childId).eq("user_id", userId).order("shared_at", { ascending: false }).limit(6);
    await Promise.allSettled((shares ?? []).map((share) => translateShare(userId, share.story_id as string, [language])));
  }
  return { ok: true as const, token, childName: child.name as string };
}

export async function cancelFamilyLink(userId: string, linkId: string, now = new Date()) {
  const { error } = await createAdminSupabase().from("family_links").update({ revoked_at: now.toISOString() }).eq("id", linkId).eq("user_id", userId).is("revoked_at", null);
  return !error;
}

/** Where sharing stands for one story: is it shared, with which child, which links exist, what came back. Never throws. */
export async function familyStateForStory(userId: string, storyId: string): Promise<{ shared: boolean; child: { id: string; name: string } | null; family: EducatorFamilyView } | null> {
  try {
    const admin = createAdminSupabase();
    const { data: story } = await admin.from("stories").select("id, child_id, child_name").eq("id", storyId).eq("user_id", userId).maybeSingle();
    if (!story) return null;
    const { data: share } = await admin.from("family_shares").select("child_id").eq("story_id", storyId).eq("user_id", userId).maybeSingle();
    const childId = (share?.child_id as string | undefined) ?? (story.child_id as string | null) ?? null;
    if (!childId) return { shared: false, child: null, family: educatorFamilyView({ links: [], replies: [], sharedStoryIds: [] }) };
    const [{ data: child }, { data: links }, { data: replies }] = await Promise.all([
      admin.from("child_profiles").select("id, name").eq("id", childId).eq("user_id", userId).maybeSingle(),
      admin.from("family_links").select(LINK_COLUMNS).eq("child_id", childId).eq("user_id", userId).order("created_at", { ascending: false }).limit(40),
      admin.from("family_replies").select(REPLY_COLUMNS).eq("story_id", storyId).eq("user_id", userId).order("created_at", { ascending: true }).limit(100),
    ]);
    return {
      shared: Boolean(share),
      child: child ? { id: child.id as string, name: child.name as string } : null,
      family: educatorFamilyView({
        links: ((links ?? []) as FamilyLinkRow[]).filter((link) => !link.revoked_at),
        replies: (replies ?? []) as Parameters<typeof educatorFamilyView>[0]["replies"],
        sharedStoryIds: share ? [storyId] : [],
      }),
    };
  } catch (error) {
    console.error("Family state lookup failed:", error);
    return null;
  }
}

/** Replies the educator has not seen yet, newest first. An empty list if the tables are not there. */
export async function unseenFamilyReplies(userId: string) {
  try {
    const admin = createAdminSupabase();
    const { data, error } = await admin.from("family_replies").select("id, story_id, child_id, created_at").eq("user_id", userId).is("seen_at", null).order("created_at", { ascending: false }).limit(50);
    if (error || !data?.length) return [];
    const { data: children } = await admin.from("child_profiles").select("id, name").eq("user_id", userId).in("id", [...new Set(data.map((row) => row.child_id as string))]);
    const nameOf = new Map((children ?? []).map((child) => [child.id as string, child.name as string]));
    return data.map((row) => ({ id: row.id as string, storyId: row.story_id as string | null, childName: nameOf.get(row.child_id as string) ?? "A child", at: row.created_at as string }));
  } catch {
    return [];
  }
}

export async function markFamilyRepliesSeen(userId: string, storyId: string, now = new Date()) {
  await createAdminSupabase().from("family_replies").update({ seen_at: now.toISOString() }).eq("user_id", userId).eq("story_id", storyId).is("seen_at", null);
}
