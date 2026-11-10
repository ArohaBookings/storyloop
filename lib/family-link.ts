/**
 * Family link (10 Nov 2026): a private link an educator gives to one child's
 * family. They read the stories the educator shared about that child, in their
 * own language where a translation was prepared, and can write back. No app, no
 * account, no password, no photographs.
 *
 * Why it exists. A centre could not move to StoryLoop: its educators wrote here
 * and then pasted the story into whatever families read. This is the family
 * side. It is also the part an educator cannot get from a general AI chat: the
 * family's answer comes back to the story it belongs to.
 *
 * The rules, all here so they can be tested without a database:
 *  - The link is the key. Random, shown once, stored only as a hash, cancellable,
 *    and it ends after FAMILY_LINK_DAYS.
 *  - It opens ONE child's shared stories. A story the educator did not share is
 *    not reachable, and nothing of any other child is.
 *  - The family sees the child's first name, the educator's first name, and the
 *    stories. Never an email address, a surname or an account id.
 *  - A translation is shown only if it was made from the story as it stands now,
 *    and only if every word the child said is still in it, exactly as said.
 *  - One caregiver never sees what another wrote back.
 *
 * Safe to import in the browser. Keys are made in lib/story-check-token.ts.
 */
export const FAMILY_LINK_DAYS = 400;
export const FAMILY_LINKS_PER_CHILD = 6;
export const FAMILY_LABEL_MAX = 30;
export const FAMILY_REPLY_MAX = 800;
export const FAMILY_STORIES_SHOWN = 60;
/** Said on the family's page wherever a translation is shown, in their language. */
export const FAMILY_TRANSLATION_NOTICE =
  "A computer translated this from the teacher's English. Your child's own words are left exactly as they said them. If something reads wrongly, tap English and tell your child's teacher.";

export type FamilyLinkRow = {
  id: string;
  user_id: string;
  child_id: string;
  label: string | null;
  language: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_opened_at: string | null;
  open_count: number | null;
};

export type FamilyLinkState = "open" | "expired" | "cancelled";

export function looksLikeFamilyToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32}$/.test(value);
}

export function familyLinkExpiry(now = new Date()) {
  return new Date(now.getTime() + FAMILY_LINK_DAYS * 24 * 60 * 60 * 1000);
}

/** Cancelled wins over everything. */
export function familyLinkState(row: Pick<FamilyLinkRow, "expires_at" | "revoked_at">, now = new Date()): FamilyLinkState {
  if (row.revoked_at) return "cancelled";
  if (new Date(row.expires_at).getTime() <= now.getTime()) return "expired";
  return "open";
}

/** Who the link was given to: "Mum", "Nana Mere". Letters, spaces, hyphens and apostrophes only. */
export function cleanFamilyLabel(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "")
    .replace(/[^\p{L}\p{M}' -]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, FAMILY_LABEL_MAX);
}

/** What a family member wrote, as they wrote it: control characters out, length capped, nothing else changed. */
export function cleanFamilyReply(raw: unknown) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, FAMILY_REPLY_MAX);
}

export function firstName(fullName: string | null | undefined, fallback: string) {
  const first = (fullName ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || first.includes("@")) return fallback;
  return first.replace(/[^\p{L}\p{M}'-]/gu, "").slice(0, 30) || fallback;
}

/** The story's own title: the stored one, else its first line. */
export function storyTitle(storyText: string, stored?: unknown) {
  if (typeof stored === "string" && stored.trim()) return stored.trim().slice(0, 140);
  return (storyText.split("\n").find((line) => line.trim()) ?? "A learning story").trim().slice(0, 140);
}

/** A short, stable fingerprint of a story's text, so a translation knows which wording it was made from. Not a secret. */
export function textFingerprint(text: string) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return `${text.length}:${(hash >>> 0).toString(36)}`;
}

/** Every phrase in quotation marks: what a child said. */
export function quotedPhrases(text: string) {
  return [...text.matchAll(/"([^"\n]{2,160})"|“([^”\n]{2,160})”/g)].map((match) => (match[1] ?? match[2]).trim()).filter(Boolean);
}

export type StoryTranslation = { title: string; text: string; notice: string; source: string };

/**
 * Whether a machine translation may be shown to a family. Refuses anything
 * that dropped a paragraph, ballooned, or changed a single word a child said.
 */
export function isUsableStoryTranslation(original: { title: string; text: string }, candidate: unknown): candidate is { title: string; text: string; notice: string } {
  if (!candidate || typeof candidate !== "object") return false;
  const c = candidate as Record<string, unknown>;
  if (typeof c.title !== "string" || typeof c.text !== "string" || typeof c.notice !== "string") return false;
  if (!c.title.trim() || c.title.length > 240 || !c.notice.trim() || c.notice.length > 400) return false;
  const length = c.text.trim().length;
  if (length < original.text.trim().length * 0.35 || length > original.text.trim().length * 3) return false;
  const paragraphs = (text: string) => text.split(/\n+/).filter((line) => line.trim()).length;
  if (paragraphs(c.text) !== paragraphs(original.text)) return false;
  // The child's words, exactly as said, are still there.
  return quotedPhrases(original.text).every((phrase) => (c.text as string).includes(phrase));
}

/** The translation to show for this story in this language, or null: only one made from the wording as it stands now. */
export function translationFor(translations: unknown, language: string | null, storyText: string): StoryTranslation | null {
  if (!language || !translations || typeof translations !== "object") return null;
  const entry = (translations as Record<string, unknown>)[language];
  if (!entry || typeof entry !== "object") return null;
  const t = entry as Record<string, unknown>;
  if (typeof t.title !== "string" || typeof t.text !== "string" || typeof t.notice !== "string" || typeof t.source !== "string") return null;
  if (t.source !== textFingerprint(storyText)) return null;
  return { title: t.title, text: t.text, notice: t.notice, source: t.source };
}

type SharedStory = { id: string; story_text: string; created_at: string | null; metadata: unknown; translations: unknown };
type ReplyRow = { id: string; link_id: string; story_id: string | null; body: string; body_en: string | null; created_at: string; seen_at: string | null };

/**
 * Exactly what the family's page receives. Built field by field, so a new
 * column on stories, children or profiles can never leak through a link.
 */
export function familyView(input: {
  link: FamilyLinkRow;
  childName: string | null | undefined;
  educatorName: string | null | undefined;
  language: { code: string; endonym: string; rtl?: boolean } | null;
  stories: SharedStory[];
  replies: ReplyRow[];
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const mine = input.replies.filter((reply) => reply.link_id === input.link.id);
  return {
    state: familyLinkState(input.link, now),
    childName: firstName(input.childName, "your child"),
    educator: firstName(input.educatorName, "Your child's teacher"),
    label: input.link.label ?? "",
    language: input.language ? { code: input.language.code, endonym: input.language.endonym, rtl: input.language.rtl === true } : null,
    stories: input.stories.slice(0, FAMILY_STORIES_SHOWN).map((story) => {
      const meta = story.metadata && typeof story.metadata === "object" ? (story.metadata as Record<string, unknown>) : {};
      const translation = translationFor(story.translations, input.language?.code ?? null, story.story_text);
      return {
        id: story.id,
        title: storyTitle(story.story_text, meta.storyTitle),
        writtenOn: story.created_at,
        text: story.story_text,
        translation: translation ? { title: translation.title, text: translation.text, notice: translation.notice } : null,
        replies: mine.filter((reply) => reply.story_id === story.id).map((reply) => ({ body: reply.body, at: reply.created_at })),
      };
    }),
  };
}
export type FamilyView = ReturnType<typeof familyView>;

/** What the educator sees about one child's family links, and what came back. */
export function educatorFamilyView(input: { links: FamilyLinkRow[]; replies: ReplyRow[]; sharedStoryIds: string[]; now?: Date }) {
  const now = input.now ?? new Date();
  const labelOf = new Map(input.links.map((link) => [link.id, link.label ?? "Family"]));
  return {
    links: input.links.map((link) => ({
      id: link.id,
      label: link.label ?? "Family",
      language: link.language,
      state: familyLinkState(link, now),
      opened: (link.open_count ?? 0) > 0,
      lastOpenedAt: link.last_opened_at,
      createdAt: link.created_at,
    })),
    sharedStoryIds: input.sharedStoryIds,
    replies: input.replies.map((reply) => ({
      id: reply.id,
      storyId: reply.story_id,
      from: labelOf.get(reply.link_id) ?? "Family",
      body: reply.body,
      bodyEn: reply.body_en,
      at: reply.created_at,
      seen: Boolean(reply.seen_at),
    })),
  };
}
export type EducatorFamilyView = ReturnType<typeof educatorFamilyView>;

/** The link the educator sends. The key sits after the #, which browsers never send to a server. */
export function familyUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/family#${token}`;
}

export function familyTokenFromHash(hash: string) {
  const value = hash.replace(/^#/, "").trim();
  return looksLikeFamilyToken(value) ? value : "";
}
