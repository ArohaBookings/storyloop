import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  HERO_FILMS,
  HERO_SHOWS_FILM,
  HOME_FILM,
  filmFile,
  filmPoster,
  isFilmFile,
  nextFilmIndex,
} from "../lib/home-film";
import { sanitizeEventMetadata } from "../lib/analytics/events";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import HomeFilm from "../components/landing/HomeFilm";

const root = path.resolve(__dirname, "..");
const publicFile = (url: string) => path.join(root, "public", url);

/** An MP4's length in seconds, from its movie header (mvhd). */
function mp4Seconds(file: string) {
  const buf = fs.readFileSync(file);
  const at = buf.indexOf("mvhd");
  assert.ok(at > 0, `${file} has no movie header`);
  const version = buf[at + 4];
  const timescale = version === 1 ? buf.readUInt32BE(at + 4 + 4 + 16) : buf.readUInt32BE(at + 4 + 4 + 8);
  const duration = version === 1 ? Number(buf.readBigUInt64BE(at + 4 + 4 + 20)) : buf.readUInt32BE(at + 4 + 4 + 12);
  return duration / timescale;
}

test("the first film is the original one, first, and unchanged", () => {
  assert.equal(HERO_SHOWS_FILM, true);
  const first = HERO_FILMS[0];
  assert.equal(first.code, "note");
  assert.equal(first.seconds, 20);
  assert.equal(HOME_FILM.file("nz", true), "/film/storyloop-nz-small.mp4");
  assert.equal(HOME_FILM.file("au", false), "/film/storyloop-au.mp4");
  assert.equal(HOME_FILM.poster("nz"), "/film/storyloop-nz-poster.jpg");
  assert.equal(HOME_FILM.seconds, 20);
  assert.equal(first.caption, "A real note and its draft. No sound.");
  assert.match(HOME_FILM.description, /^A 20 second film with no sound\. An educator types a quick note/);
});

test("three films, one idea each: short labels, short captions, 8 to 12 seconds for the new ones", () => {
  assert.equal(HERO_FILMS.length, 3);
  assert.deepEqual(HERO_FILMS.map((f) => f.code), ["note", "photo", "class"]);
  assert.equal(new Set(HERO_FILMS.map((f) => f.prefix)).size, 3);
  for (const film of HERO_FILMS) {
    const words = film.label.trim().split(/\s+/);
    assert.ok(words.length <= 3, `${film.label}: three words at most`);
    assert.ok(film.label.length <= 14, `${film.label}: fits a third of a phone's film`);
    // One line under a 280px film on a 320px phone, beside the play button.
    assert.ok(film.caption.length <= 36, `${film.caption}: one line`);
    for (const text of [film.label, film.caption, film.description]) {
      assert.ok(!/[—]/.test(text), `no em dash: ${text}`);
      assert.ok(!/\b(works? (beside|alongside)|storypark|educa\b|chatgpt|copilot|gemini|claude)\b/i.test(text), `sells StoryLoop only: ${text}`);
    }
    if (film.code !== "note") assert.ok(film.seconds >= 8 && film.seconds <= 12, `${film.code}: 8 to 12 seconds`);
    assert.match(film.description, new RegExp(`^An? ${film.seconds} second film with no sound\\.`));
  }
});

test("every file a film names is in public/film, and each film is as long as it says", () => {
  for (const film of HERO_FILMS) {
    for (const variant of ["nz", "au"] as const) {
      for (const small of [false, true]) {
        const file = publicFile(filmFile(film, variant, small));
        assert.ok(fs.existsSync(file), `${file} exists`);
        const seconds = mp4Seconds(file);
        assert.ok(Math.abs(seconds - film.seconds) < 0.2, `${path.basename(file)} is ${seconds.toFixed(2)} s, not ${film.seconds}`);
        // Phones get the small file: keep it small.
        if (small) assert.ok(fs.statSync(file).size < 2_000_000, `${path.basename(file)} under 2 MB`);
      }
      const poster = publicFile(filmPoster(film, variant));
      assert.ok(fs.existsSync(poster), `${poster} exists`);
      assert.ok(fs.statSync(poster).size < 200_000, `${path.basename(poster)} under 200 KB`);
    }
  }
});

test("the new films' stills are named apart from the first film's, so the page still preloads only one", () => {
  for (const film of HERO_FILMS.slice(1)) {
    for (const variant of ["nz", "au"] as const) {
      assert.doesNotMatch(filmPoster(film, variant), /storyloop-(nz|au)-poster/);
      assert.doesNotMatch(filmFile(film, variant, true), /storyloop-(nz|au)(-small)?\.mp4/);
    }
  }
});

test("when one film ends the next plays, and after the last the first comes round", () => {
  assert.equal(nextFilmIndex(0), 1);
  assert.equal(nextFilmIndex(1), 2);
  assert.equal(nextFilmIndex(2), 0);
  assert.equal(nextFilmIndex(0, 1), 0);
  assert.equal(nextFilmIndex(0, 0), 0);
});

test("a film knows its own files and nobody else's", () => {
  const [note, photo, klass] = HERO_FILMS;
  assert.ok(isFilmFile(note, "http://localhost:3130/film/storyloop-nz-small.mp4"));
  assert.ok(isFilmFile(note, "/film/storyloop-au.mp4"));
  assert.ok(!isFilmFile(note, "/film/storyloop-photo-au.mp4"));
  assert.ok(!isFilmFile(note, "/film/storyloop-class-nz-small.mp4"));
  assert.ok(isFilmFile(photo, "https://storyloop.space/film/storyloop-photo-nz-small.mp4?x=1"));
  assert.ok(!isFilmFile(photo, "/film/storyloop-nz.mp4"));
  assert.ok(isFilmFile(klass, "/film/storyloop-class-au.mp4"));
  assert.ok(!isFilmFile(klass, ""));
  assert.ok(!isFilmFile(klass, null));
});

test("film events carry the film's code and the country only", () => {
  for (const film of HERO_FILMS) {
    assert.deepEqual(sanitizeEventMetadata("film_play", { variant: "nz", film: film.code }), { variant: "nz", film: film.code });
    assert.deepEqual(sanitizeEventMetadata("film_complete", { variant: "au", film: film.code }), { variant: "au", film: film.code });
  }
  assert.deepEqual(
    sanitizeEventMetadata("film_switch", { variant: "au", from: "note", to: "class", label: "Whole class" } as never),
    { variant: "au", from: "note", to: "class" },
  );
});

test("every app label the new films show is still in the app", () => {
  const has = (file: string, text: string) => assert.ok(fs.readFileSync(path.join(root, file), "utf8").includes(text), `"${text}" in ${file}`);
  const generate = "app/(app)/generate/page.tsx";
  for (const label of ["Photo of my notes", "Generate story", "What happened?", "Reading your notes…", "Notes added from your photo. Check them against the paper, especially anything a child said, then generate the story."]) has(generate, label);
  has(generate, "Photo: your written notes only, never children.");
  for (const label of ["Transition statement", "End-of-year summary", "Child&apos;s first name (optional)"]) has("components/app/StatementFromNotes.tsx", label);
  for (const label of ["What you know about this child", "Draft the five outcomes", "Your draft, outcome by outcome", "Copy all", "Next child", "Strategy for the school teacher", "Strategy for the new entrant teacher"]) {
    has("components/marketing/TransitionDemo.tsx", label);
  }
  // The statement page does not save drafts, so the class film must not show Download everything.
  const classFilm = fs.readFileSync(path.join(root, "scripts/film/film-class.html"), "utf8");
  assert.ok(!/>[^<]*Download everything/.test(classFilm.replace(/<!--[\s\S]*?-->/g, "")));
});

/** The film as the server sends it (before any script runs): what the first paint can ask for. */
function serverHtml(inHero: boolean) {
  (globalThis as unknown as { React: typeof React }).React = React; // the components use the classic JSX runtime
  return renderToStaticMarkup(React.createElement(HomeFilm, { inHero }));
}

test("in the hero the page sends one still and no film: the other films are not in the first paint", () => {
  const html = serverHtml(true);
  // Three labels, the first one on.
  assert.equal((html.match(/data-testid="home-film-label-/g) ?? []).length, 3);
  assert.match(html, /aria-pressed="true" data-testid="home-film-label-note"/);
  for (const film of HERO_FILMS) assert.ok(html.includes(`>${film.label}<`), `label ${film.label}`);
  // One picture, the first film's New Zealand still, loaded first; no video file named at all.
  assert.equal((html.match(/<img /g) ?? []).length, 1);
  assert.match(html, /url=%2Ffilm%2Fstoryloop-nz-poster\.jpg/);
  assert.doesNotMatch(html, /storyloop-(photo|class)-/);
  assert.doesNotMatch(html, /\.mp4/);
  assert.match(html, /preload="none"/);
  // In the hero a film ends, so the next can play: it does not loop.
  assert.doesNotMatch(html, /\bloop=""/);
});

test("outside the hero (HERO_SHOWS_FILM false) it is the first film alone, looping, with no labels", () => {
  const html = serverHtml(false);
  assert.doesNotMatch(html, /home-film-labels|home-film-label-/);
  assert.doesNotMatch(html, /storyloop-(photo|class)-/);
  assert.match(html, /\bloop=""/);
  assert.match(html, /data-placement="how-it-works"/);
  // The one constant decides which of the two the homepage uses.
  const hero = fs.readFileSync(path.join(root, "components/landing/Hero.tsx"), "utf8");
  const how = fs.readFileSync(path.join(root, "components/landing/HowItWorks.tsx"), "utf8");
  assert.ok(hero.includes("{HERO_SHOWS_FILM ? <HomeFilm inHero /> : <HeroPhotoProof inHero />}"));
  assert.ok(how.includes("{HERO_SHOWS_FILM ? <HeroPhotoProof inHero={false} /> : <HomeFilm />}"));
});

test("the film pages keep the house style: no em dash, sample notes labelled as samples", () => {
  for (const page of ["film-photo.html", "film-class.html"]) {
    const html = fs.readFileSync(path.join(root, "scripts/film", page), "utf8");
    assert.ok(!html.includes("—"), `${page}: no em dash`);
    assert.match(html, /Example from (a )?sample notes?/);
  }
});
