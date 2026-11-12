/**
 * The homepage film (11 Nov 2026): 20 seconds, silent, with its words on
 * screen, showing one real note become its real story.
 *
 * It is drawn by scripts/film (film.html, render.mjs, encode.swift) from the
 * same example the demo plays, so it cannot say anything the product did not
 * write. Run `node scripts/film/render.mjs` after the example changes.
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
 */
export const HERO_SHOWS_FILM = true;

export const HOME_FILM = {
  seconds: 20,
  width: 1080,
  height: 1350,
  file: (variant: FilmVariant, small: boolean) => `/film/storyloop-${variant}${small ? "-small" : ""}.mp4`,
  poster: (variant: FilmVariant) => `/film/storyloop-${variant}-poster.jpg`,
  /** Read out by screen readers, and the film's whole message in a sentence. */
  description:
    "A 20 second film with no sound. An educator types a quick note about a child at the sandpit and taps Write my story. A learning story appears, with the child's own words marked as kept exactly, curriculum links where the note supports them, and a short list of things to check. The educator shares it with the family, who write back.",
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
