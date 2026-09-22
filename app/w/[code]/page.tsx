import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/rate-limit";
import { isWallCode, type PublicWallCard } from "@/lib/wall-card";
import {
  findWallLanguage,
  preferredLanguage,
  TRANSLATION_NOTICE,
  WALL_LANGUAGES,
  type TranslatableCard,
} from "@/lib/wall-languages";

/**
 * The page behind a code printed on a wall.
 *
 * This is the only route in StoryLoop that serves content to someone with no
 * account, so it is written as if the code is already public, because a code
 * printed in a building the public walks through effectively is.
 *
 * What protects a child here is NOT this file. It is that the row was built by
 * lib/wall-card.ts, which removes every name before the educator ever sees a
 * preview, and confirmed by that educator before publishing. This file's job is
 * narrower: select only the public columns, never the scrub report, refuse
 * anything not live, and add nothing of its own.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The learning behind this",
  // A wall code should never turn up in a search result. It is for the person
  // standing in front of the display, and nobody else.
  robots: { index: false, follow: false, nocache: true },
};

type Row = {
  card: PublicWallCard;
  status: string;
  expires_at: string;
  translations: Record<string, TranslatableCard> | null;
};

async function loadCard(rawCode: string): Promise<Row | null> {
  if (!isWallCode(rawCode)) return null;
  const code = rawCode.toUpperCase();

  // Rate limited per IP, because a public lookup is the one thing that could be
  // used to hunt for codes. Generous enough that a family scanning a whole wall
  // of displays at pickup never notices it.
  const forwarded = (await headers()).get("x-forwarded-for") ?? "unknown";
  const allowed = await consumeRateLimit({
    scope: "wall-card-view",
    key: forwarded.split(",")[0].trim(),
    limit: 60,
    windowSeconds: 300,
  });
  if (!allowed) return null;

  const admin = createAdminSupabase();
  const { data } = await admin
    .from("wall_cards")
    // Explicit column list. `scrub_report` names the children that were removed
    // and must never be fetched on this path, so it is not named here and a
    // future "select *" cannot creep in.
    .select("card, status, expires_at, translations")
    .eq("code", code)
    .eq("status", "published")
    .maybeSingle();

  if (!data) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;

  // Count that it was scanned. A number, nothing else: no identity, no device,
  // no location. A product that told a centre which parent scanned what would
  // have started surveilling families at the door.
  try {
    await admin.rpc("count_wall_card_scan", { card_code: code });
  } catch {
    // Counting is the least important thing this route does.
  }

  return data as Row;
}

export default async function WallCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ code }, query] = await Promise.all([params, searchParams]);
  const row = await loadCard(code);
  if (!row) notFound();

  const translations = row.translations ?? {};
  const offered = Object.keys(translations).filter((key) => findWallLanguage(key));

  // What language to show. An explicit choice wins; otherwise the phone is
  // asked. THIS is the moment the feature is for: a grandparent whose phone is
  // set to Samoan scans a painting and reads about their mokopuna's morning in
  // Samoan, without knowing there was a choice to make.
  const requested = typeof query.lang === "string" && offered.includes(query.lang) ? query.lang : null;
  const accept = (await headers()).get("accept-language");
  const chosen = requested ?? (query.lang === "en" ? null : preferredLanguage(accept, offered));
  const language = chosen ? findWallLanguage(chosen) : null;
  const card = language && translations[language.code] ? translations[language.code] : row.card;
  const translated = Boolean(language && translations[language.code]);

  return (
    <main
      lang={language?.code ?? "en"}
      dir={language?.rtl ? "rtl" : "ltr"}
      className="mx-auto min-h-screen max-w-2xl bg-paper px-5 py-10 sm:py-16"
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-clay-700">The learning behind this</p>
      <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink-900 text-balance sm:text-4xl">
        {card.heading}
      </h1>

      {card.body.map((paragraph) => (
        <p key={paragraph} className="mt-4 text-lg leading-relaxed text-ink-700">{paragraph}</p>
      ))}

      {card.dispositions.length > 0 && (
        <section className="mt-7">
          <ul className="flex flex-wrap gap-2">
            {card.dispositions.map((item) => (
              <li key={item} className="rounded-full bg-cream-100 px-3 py-1 text-sm text-ink-700">{item}</li>
            ))}
          </ul>
        </section>
      )}

      {card.curriculum.length > 0 && (
        <section className="mt-3">
          <ul className="flex flex-wrap gap-2">
            {card.curriculum.map((item) => (
              <li key={item} className="rounded-full border border-clay-200 px-3 py-1 text-sm text-ink-700">{item}</li>
            ))}
          </ul>
        </section>
      )}

      {card.tryAtHome && (
        <section className="mt-7 rounded-2xl border border-clay-100 bg-cream-50 p-5">
          <p className="leading-relaxed text-ink-700">{card.tryAtHome}</p>
        </section>
      )}

      {/* Every language names itself. A menu labelled in English is useless to
          the one person who most needs it. */}
      {offered.length > 0 && (
        <nav className="mt-9 border-t border-clay-100 pt-5" aria-label="Language">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href={`/w/${code.toUpperCase()}?lang=en`}
                hrefLang="en"
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  !translated ? "border-clay-700 bg-clay-700 text-paper" : "border-clay-200 text-ink-700 hover:border-clay-400"
                }`}
              >
                English
              </Link>
            </li>
            {WALL_LANGUAGES.filter((option) => offered.includes(option.code)).map((option) => (
              <li key={option.code}>
                <Link
                  href={`/w/${code.toUpperCase()}?lang=${option.code}`}
                  hrefLang={option.code}
                  lang={option.code}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    language?.code === option.code
                      ? "border-clay-700 bg-clay-700 text-paper"
                      : "border-clay-200 text-ink-700 hover:border-clay-400"
                  }`}
                >
                  {option.endonym}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <footer className="mt-8 border-t border-clay-100 pt-5">
        <p className="text-sm leading-relaxed text-ink-500">
          This page is about the learning in this experience, not about any individual child. It deliberately contains no
          names, no photographs and no dates.
        </p>
        {/* In the reader's own language. A warning about the Samoan, written in
            English, is not a warning to the person reading the Samoan. */}
        {translated && (
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            {(card as TranslatableCard).notice?.trim() || TRANSLATION_NOTICE}
          </p>
        )}
        <p className="mt-3 text-xs text-ink-400">
          Written by an educator at this service. Assembled with{" "}
          <a href="https://storyloop.space" className="underline underline-offset-2 hover:text-ink-700">StoryLoop</a>.
        </p>
      </footer>
    </main>
  );
}
