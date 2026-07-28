import OpenAI from "openai";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { GUIDE_TOPICS, unwrittenTopics, type GuideTopic } from "@/lib/blog-topics";
import { slugify } from "@/lib/blog";

const MODEL = process.env.OPENAI_BLOG_MODEL ?? "gpt-5.4-mini";

const WRITER_PROMPT = `You write guides for early childhood educators in New Zealand and Australia, published by StoryLoop.

Who reads this: a kaiako or educator who has been on the floor with children all day. They are tired, practical, and allergic to being talked down to. They can spot someone who has never worked in a centre within two sentences.

HOW TO WRITE
- Write like a knowledgeable colleague talking, not like a content marketer.
- Short paragraphs. Vary sentence length. Some sentences are short.
- Use concrete examples with real detail: a specific child doing a specific thing. Invent illustrative examples freely, they are clearly illustrative.
- Say the useful thing first. Do not warm up for three paragraphs.
- Admit what is hard or contested. Certainty about everything reads as marketing.
- Use "you" and sometimes "we". Contractions are fine.

NEVER DO THIS
- Never use an em dash or en dash. Not once. Use a comma, a full stop, or rewrite the sentence.
- No "in today's fast-paced world", "unlock", "delve", "elevate", "game changer", "it's not just X, it's Y", "let's dive in".
- No headings that are questions the article then restates.
- Do not open with a definition of the topic.
- Do not end with a summary paragraph that repeats what you just said.
- Do not mention StoryLoop more than once, and only if it is genuinely relevant. This is a guide, not an advert.
- Do not invent statistics, percentages, studies, or quotes from named people. If you want to make a numeric point, phrase it as observation ("most educators we talk to") rather than fake data.

STRUCTURE
- Open with a concrete situation the reader recognises, in one or two sentences.
- Use ## for section headings. Four to seven sections.
- Headings should be statements or plain labels, not clickbait.
- Where useful, include one short bulleted list. Not more than two lists total.
- End on something practical the reader could do tomorrow, not a conclusion.

LENGTH: 900 to 1400 words.

Return ONLY valid JSON, no markdown fence, in this exact shape:
{
  "title": "the final title, which may differ from the working title if you can do better",
  "excerpt": "one or two sentences for the blog index and search results, under 200 characters",
  "seo_description": "meta description under 155 characters",
  "body_markdown": "the full guide in markdown, using ## for headings",
  "cover_emoji": "a single relevant emoji"
}`;

function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Strip the characters we promised never to publish, whatever the model does. */
function scrub(text: string) {
  return text
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+([.,;:])/g, "$1");
}

export type WriteResult =
  | { ok: true; slug: string; title: string; words: number }
  | { ok: false; reason: string };

/**
 * Write and publish the next unwritten guide.
 *
 * Deliberately writes one at a time. A queue that dumps five posts in a day
 * looks exactly like what it is, and search engines treat it accordingly.
 */
export async function writeNextGuide(options: { dryRun?: boolean } = {}): Promise<WriteResult> {
  if (!hasOpenAIKey()) return { ok: false, reason: "no_api_key" };

  const admin = createAdminSupabase();
  const { data: existing } = await admin.from("blog_posts").select("slug");
  const published = (existing ?? []).map((row) => row.slug);
  const remaining = unwrittenTopics(published);

  if (remaining.length === 0) return { ok: false, reason: "no_topics_left" };

  const topic: GuideTopic = remaining[0];

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: WRITER_PROMPT },
      {
        role: "user",
        content: `Write this guide as JSON.

Working title: ${topic.title}
Angle: ${topic.angle}
Region: ${topic.region === "both" ? "New Zealand and Australia, so cover Te Whāriki and EYLF where relevant" : topic.region === "NZ" ? "New Zealand only, use Te Whāriki and te reo Māori naturally where it fits" : "Australia only, use EYLF wording and do not use te reo Māori"}
Search phrases readers use: ${topic.keywords.join(", ")}

Remember: no em dashes anywhere, no invented statistics, and at most one mention of StoryLoop.`,
      },
    ],
    max_completion_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  let parsed: { title?: string; excerpt?: string; seo_description?: string; body_markdown?: string; cover_emoji?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  const body = scrub(String(parsed.body_markdown ?? "").trim());
  const title = scrub(String(parsed.title ?? topic.title).trim());
  const words = body.split(/\s+/).filter(Boolean).length;

  // Refuse to publish something thin. A short post that ranks for nothing is
  // worse than no post, because it dilutes the rest of the site.
  if (words < 450) return { ok: false, reason: `too_short_${words}_words` };
  if (/[—–]/.test(body) || /[—–]/.test(title)) return { ok: false, reason: "em_dash_survived_scrub" };

  if (options.dryRun) {
    return { ok: true, slug: topic.slug, title, words };
  }

  const { error } = await admin.from("blog_posts").insert({
    slug: slugify(topic.slug),
    title,
    excerpt: scrub(String(parsed.excerpt ?? "").trim()).slice(0, 300) || null,
    seo_description: scrub(String(parsed.seo_description ?? "").trim()).slice(0, 200) || null,
    body_markdown: body,
    category: topic.category,
    region: topic.region,
    tags: topic.keywords.slice(0, 8),
    cover_emoji: String(parsed.cover_emoji ?? "📝").slice(0, 8),
    author_name: "The StoryLoop team",
    published: true,
    published_at: new Date().toISOString(),
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true, slug: topic.slug, title, words };
}

export function topicBacklogSize(publishedSlugs: string[]) {
  return { total: GUIDE_TOPICS.length, remaining: unwrittenTopics(publishedSlugs).length };
}
