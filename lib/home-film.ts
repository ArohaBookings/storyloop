/**
 * The homepage film (11 Nov 2026): 20 seconds, silent, with its words on
 * screen, showing one real note become its real story.
 *
 * It is drawn by scripts/film (film.html, render.mjs, encode.swift) from the
 * same example the demo plays, so it cannot say anything the product did not
 * write. Run `node scripts/film/render.mjs` after the example changes.
 *
 * Two more films (18 Nov 2026, Leo: "create a couple cool videos for the main
 * screen as well (remember never information overload)"): "Photo of my notes"
 * and "the whole class" (statements, one child after another). Same pipeline,
 * same look, 11 seconds each, one idea each. In the hero they play one at a
 * time, the first film first and unchanged, with three small labels under the
 * frame (HERO_FILMS). Only the first film and its still load with the page;
 * the next one is fetched once the first has played, or when its label is
 * tapped. Somebody who asked their device for less motion gets the stills only.
 *
 * WHAT IT IS NOT. It is not a customer talking. A person on camera saying
 * StoryLoop changed their week has to be a real customer who said it and
 * agreed to be shown: staging one is a misleading testimonial under the Fair
 * Trading Act and the Australian Consumer Law, and teachers would see through
 * it. When a real clip exists, put it in CUSTOMER_CLIP below and the page
 * shows it in place of the film, with its captions.
 */
export type FilmVariant = "nz" | "au";

/**
 * Where the film sits (12 Nov 2026, Leo's order): true puts it on the first
 * screen, in the hero's picture slot, and moves the classroom photograph with
 * its note-and-sentence card down into How it works. false puts both back
 * where they were before, exactly: the photograph in the hero, the film in How
 * it works. One word to change, nothing else.
 *
 * 18 Nov 2026: false also turns the two new films and their labels off. They
 * only ever appear in the hero, so with false How it works shows the first
 * film alone, looping, exactly as before.
 */
export const HERO_SHOWS_FILM = true;

/** The films' codes, as recorded in film_play, film_switch and film_complete. */
export type FilmCode = "note" | "photo" | "class";

export type HeroFilm = {
  code: FilmCode;
  /** The label under the frame: three words at most. */
  label: string;
  seconds: number;
  /** public/film/<prefix>-<variant>[-small].mp4 and -poster.jpg, as scripts/film/render.mjs writes them. */
  prefix: string;
  /** One line under the frame, while this film is on. */
  caption: string;
  /** Read out by screen readers, and the film's whole message in a sentence. */
  description: string;
};

/**
 * The hero's films, in the order they play. The first is the original film and
 * must stay first: it is the one the page loads, and the one the hero has
 * shown since 13 Nov. When one ends the next plays, and after the last the
 * first comes round again.
 */
export const HERO_FILMS: readonly HeroFilm[] = [
  {
    code: "note",
    label: "Quick note",
    seconds: 20,
    prefix: "storyloop",
    caption: "A real note and its draft. No sound.",
    description:
      "A 20 second film with no sound. An educator types a quick note about a child at the sandpit and taps Write my story. A learning story appears, with the child's own words marked as kept exactly, curriculum links where the note supports them, and a short list of things to check. The educator shares it with the family, who write back.",
  },
  {
    code: "photo",
    label: "From a photo",
    seconds: 11,
    prefix: "storyloop-photo",
    caption: "A photo of notes, then the story.",
    description:
      "An 11 second film with no sound. A page of handwritten notes is photographed with Photo of my notes and read into the note box, with a reminder to check it against the paper. The educator taps Generate story and a learning story appears, with the child's own words marked.",
  },
  {
    code: "class",
    label: "Whole class",
    seconds: 11,
    prefix: "storyloop-class",
    caption: "One child, then the next.",
    description:
      "An 11 second film with no sound. On the statement page an educator pastes what she knows about one child and gets a transition statement drafted outcome by outcome. She copies it, taps Next child, and starts on the next child's notes.",
  },
];

export function filmFile(film: HeroFilm, variant: FilmVariant, small: boolean) {
  return `/film/${film.prefix}-${variant}${small ? "-small" : ""}.mp4`;
}

export function filmPoster(film: HeroFilm, variant: FilmVariant) {
  return `/film/${film.prefix}-${variant}-poster.jpg`;
}

/** True when `url` is one of this film's own files (either country, either size), and no other film's. */
export function isFilmFile(film: HeroFilm, url: string | null | undefined) {
  if (!url) return false;
  const path = url.split(/[?#]/)[0];
  return path.endsWith(`/film/${film.prefix}-nz.mp4`) || path.endsWith(`/film/${film.prefix}-au.mp4`) ||
    path.endsWith(`/film/${film.prefix}-nz-small.mp4`) || path.endsWith(`/film/${film.prefix}-au-small.mp4`);
}

/** The film after this one, coming round to the first after the last. */
export function nextFilmIndex(index: number, count = HERO_FILMS.length) {
  return count > 0 ? (index + 1) % count : 0;
}

const FIRST = HERO_FILMS[0];

/** The first film: what the page loads, and the only film outside the hero. */
export const HOME_FILM = {
  seconds: FIRST.seconds,
  width: 1080,
  height: 1350,
  file: (variant: FilmVariant, small: boolean) => filmFile(FIRST, variant, small),
  poster: (variant: FilmVariant) => filmPoster(FIRST, variant),
  description: FIRST.description,
} as const;

/**
 * A real customer's clip, once one exists and they have agreed in writing.
 * `captions` is a WebVTT file of exactly what they say. Leave as null until then.
 */
export const CUSTOMER_CLIP: null | { src: string; poster: string; captions: string; credit: string } = null;

/** Aotearoa sees the Te Whāriki story; everywhere else sees the EYLF one. */
export function filmVariantForZone(zone: string | null | undefined): FilmVariant {
  return zone === "Pacific/Auckland" || zone === "Pacific/Chatham" ? "nz" : "au";
}
