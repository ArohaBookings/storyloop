// Renders the homepage films (scripts/film/README.md).
//
//   node scripts/film/render.mjs                 the first film (note), both variants (nz, au), into public/film
//   node scripts/film/render.mjs --film photo    the "Photo of my notes" film (film-photo.html)
//   node scripts/film/render.mjs --film class    the "whole class" film (film-class.html)
//   node scripts/film/render.mjs --film all      all three
//   node scripts/film/render.mjs --film photo --variant nz --frames-only   frames only, to look at
//
// Every note, story, draft and app label is read from the files the product
// itself uses (the demo's example, lib/real-examples.ts, lib/transition-examples.ts,
// the app's own pages), so a film cannot drift from the product: change the
// source, run this again, and the film says the new words. A label that is no
// longer in the app stops the render.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const FPS = 30;
const SIZE = { width: 1080, height: 1350 };
// Two files per variant: phones get the small one (HomeFilm picks by screen width).
const OUTPUTS = [
  { suffix: "", width: 1080, height: 1350, bitrate: 1_300_000 },
  { suffix: "-small", width: 720, height: 900, bitrate: 700_000 },
];
/**
 * The films. `prefix` names the files (public/film/<prefix>-<variant>[-small].mp4 and
 * -poster.jpg); lib/home-film.ts must use the same names. `poster` is the second the
 * still is taken from: the frame that says the film's idea on its own, because a
 * visitor who asked for less motion only ever sees the still.
 */
const FILMS = {
  note: { page: "film.html", seconds: 20, prefix: "storyloop", poster: 9.4, data: () => examples() }, // the child's words marked, with the chip
  photo: { page: "film-photo.html", seconds: 11, prefix: "storyloop-photo", poster: 5.4, data: () => photoExamples() }, // the photo, read into the note
  class: { page: "film-class.html", seconds: 11, prefix: "storyloop-class", poster: 4.5, data: () => classExamples() }, // a draft, outcome by outcome
};

function arg(name, fallback = null) {
  const at = process.argv.indexOf(`--${name}`);
  return at > -1 ? process.argv[at + 1] ?? true : fallback;
}

function playwright() {
  for (const base of [root, path.join(root, ".test-local")]) {
    try {
      return createRequire(path.join(base, "package.json"))("playwright");
    } catch { /* try the next place */ }
  }
  throw new Error("Playwright was not found. Install it (npm i -D playwright) or restore .test-local.");
}

/** The examples, exactly as the homepage demo holds them. */
function examples() {
  const nzFile = fs.readFileSync(path.join(root, "lib/demo-examples.ts"), "utf8");
  const literal = nzFile.slice(nzFile.indexOf("= {", nzFile.indexOf("export const DEMO_EXAMPLES")) + 2, nzFile.lastIndexOf("};") + 1);
  const nz = JSON.parse(literal).NZ;
  const demo = fs.readFileSync(path.join(root, "components/landing/StoryDemo.tsx"), "utf8");
  const tpl = (name) => {
    const found = demo.match(new RegExp("const " + name + " = `([\\s\\S]*?)`;"));
    if (!found) throw new Error(`${name} was not found in StoryDemo.tsx`);
    return found[1];
  };
  const checksBlock = demo.match(/const EXAMPLE_EVIDENCE[\s\S]*?checks: \[([\s\S]*?)\]/);
  if (!checksBlock) throw new Error("EXAMPLE_EVIDENCE checks were not found in StoryDemo.tsx");
  const auChecks = [...checksBlock[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`));
  const firstWord = (note) => note.trim().split(/[\s(,]/)[0];
  return {
    nz: { child: firstWord(nz.note), note: nz.note, story: nz.story, checks: [nz.checks[1], nz.checks[3]], reply: "He does this in the bath too! Thank you for noticing." },
    au: { child: firstWord(tpl("SAMPLE")), note: tpl("SAMPLE"), story: tpl("EXAMPLE_OUTPUT"), checks: [auChecks[0], auChecks[3]], reply: "He told us about the dragon at dinner! Thank you." },
  };
}


const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
/** A label the app shows today, or the render stops: a film must not show a button that is gone. */
function appLabel(file, text) {
  if (!read(file).includes(text)) throw new Error(`"${text}" is no longer in ${file}: update the film before rendering it.`);
  return text;
}

/** "Photo of my notes": a sample note from lib/real-examples.ts, handwritten, and the story written from it. */
function photoExamples() {
  const src = read("lib/real-examples.ts");
  const all = JSON.parse(src.slice(src.indexOf("= [", src.indexOf("export const REAL_EXAMPLES:")) + 2, src.lastIndexOf("];") + 1));
  const pick = (slug) => {
    const found = all.find((x) => x.slug === slug);
    if (!found) throw new Error(`${slug} is not in lib/real-examples.ts`);
    return found;
  };
  const generate = "app/(app)/generate/page.tsx";
  appLabel(generate, "Photo of my notes");
  appLabel(generate, "Generate story");
  appLabel(generate, "What happened?");
  appLabel(generate, "Reading your notes…");
  const message = appLabel(generate, "Notes added from your photo. Check them against the paper, especially anything a child said, then generate the story.");
  const one = (x) => ({ note: x.note, story: x.story, message });
  return { nz: one(pick("two-shoes-independence-nz")), au: one(pick("two-painting-colours-au")) };
}

/** "The whole class": the statement guides' worked example (an invented child) and its real draft, then Next child. */
function classExamples() {
  const src = read("lib/transition-examples.ts");
  const notes = JSON.parse(src.match(/export const TRANSITION_EXAMPLE_NOTES = ("(?:[^"\\]|\\.)*");/)[1]);
  const drafts = JSON.parse(src.slice(src.indexOf("= {", src.indexOf("export const TRANSITION_EXAMPLES:")) + 2, src.lastIndexOf("};") + 1));
  const demo = "components/marketing/TransitionDemo.tsx";
  const page = "components/app/StatementFromNotes.tsx";
  const demoSrc = read(demo);
  const strategy = (fw) => {
    const m = demoSrc.match(new RegExp(`\\n\\s*${fw}: "([^"]+)",`, "g"));
    const label = m && m.map((line) => line.match(/"([^"]+)"/)[1]).find((l) => /^Strategy/.test(l));
    if (!label) throw new Error(`no strategy label for ${fw} in ${demo}`);
    return label;
  };
  const labels = {
    transition: appLabel(page, "Transition statement"),
    summary: appLabel(page, "End-of-year summary"),
    name: appLabel(page, "Child&apos;s first name (optional)").replace("&apos;", "'"),
    notes: appLabel(demo, "What you know about this child"),
    draft: appLabel(demo, "Draft the five outcomes"),
    title: appLabel(demo, "Your draft, outcome by outcome"),
  };
  appLabel(demo, "Copy all");
  appLabel(demo, "Next child");
  const first = notes.split(/\s+/)[0];
  const one = (fw, next) => ({ child: first, notes, outcomes: drafts[fw].outcomes.slice(0, 3), strategyLabel: strategy(fw), labels, next });
  return {
    // The second child's notes are invented and only typed: no draft is shown for them.
    nz: one("TW", { child: "Kiri", notes: "Kiri (4). Helps set the table for kai and counts out the cups. Leads the karakia before lunch when it is her turn." }),
    au: one("EYLF", { child: "Mia", notes: "Mia (5). Asks for the space books at rest time. Builds rockets in the block corner and counts down from ten before they launch." }),
  };
}

const pad = (n) => String(n).padStart(4, "0");

async function main() {
  const which = arg("variant", "all");
  const filmArg = arg("film", "note"); // the first film by default, so a plain run re-renders only what it always did
  const outDir = path.resolve(root, arg("out", "public/film"));
  const framesRoot = path.resolve(arg("frames", path.join(os.tmpdir(), "storyloop-film-frames")));
  const framesOnly = process.argv.includes("--frames-only");
  const encodeOnly = process.argv.includes("--encode-only"); // reuse the frames already in --frames
  const step = Number(arg("step", 1)); // --step 15 renders every 15th frame, for a quick look
  const films = filmArg === "all" ? Object.keys(FILMS) : [filmArg];
  fs.mkdirSync(outDir, { recursive: true });

  const { chromium } = playwright();
  const browser = await chromium.launch();
  let encoder = null;
  for (const name of films) {
    const film = FILMS[name];
    if (!film) throw new Error(`unknown film ${name} (note, photo, class or all)`);
    const data = film.data();
    const variants = which === "all" ? Object.keys(data) : [which];
    for (const variant of variants) {
      if (!data[variant]) throw new Error(`unknown variant ${variant}`);
      // The first film keeps its old frames folder (<frames>/nz), so --encode-only still finds them.
      const dir = path.join(framesRoot, name === "note" ? variant : `${name}-${variant}`);
      if (!encodeOnly) {
        fs.rmSync(dir, { recursive: true, force: true });
        fs.mkdirSync(dir, { recursive: true });
        const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });
        await page.addInitScript((d) => { window.FILM_DATA = d; window.FILM_RENDER = true; }, data[variant]);
        await page.goto(pathToFileURL(path.join(here, film.page)).href);
        // Ask for every face the film uses: a font is only fetched once something needs it,
        // and the note (the only mono text) is empty when the page opens.
        const fonts = await page.evaluate(async (hand) => {
          const faces = ["500 40px Fraunces", "700 40px Fraunces", "500 30px Manrope", "600 30px Manrope", "700 30px Manrope", "800 30px Manrope", "400 30px 'JetBrains Mono'"];
          if (hand) faces.push("600 40px Caveat");
          await Promise.all(faces.map((f) => document.fonts.load(f)));
          await document.fonts.ready;
          return faces.map((f) => document.fonts.check(f));
        }, name === "photo");
        if (fonts.includes(false)) throw new Error("The film's fonts did not load (is the network up?). Frames would use fallback fonts.");
        await page.evaluate(() => window.filmInit());
        const seconds = (await page.evaluate(() => window.FILM_SECONDS ?? null)) ?? film.seconds;
        if (seconds !== film.seconds) throw new Error(`${film.page} says ${seconds} s, render.mjs says ${film.seconds} s`);
        const frame = page.locator("#film");
        const total = FPS * film.seconds;
        for (let i = 0; i < total; i += step) {
          await page.evaluate((t) => window.filmRender(t), i / FPS);
          await frame.screenshot({ path: path.join(dir, `f${pad(i)}.png`) });
          if (i % 100 === 0) process.stdout.write(`${name} ${variant} ${i}/${total}\n`);
        }
        await page.close();
      }
      if (framesOnly || step !== 1) continue;

      if (!encoder) {
        encoder = path.join(framesRoot, "encode");
        execFileSync("swiftc", ["-O", "-suppress-warnings", path.join(here, "encode.swift"), "-o", encoder], { stdio: "inherit" });
      }
      for (const o of OUTPUTS) {
        const file = path.join(outDir, `${film.prefix}-${variant}${o.suffix}.mp4`);
        process.stdout.write(execFileSync(encoder, [dir, file, String(o.width), String(o.height), String(FPS), String(o.bitrate)]).toString());
      }
      const poster = path.join(outDir, `${film.prefix}-${variant}-poster.jpg`);
      execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "78", "-Z", "900", path.join(dir, `f${pad(Math.round(film.poster * FPS))}.png`), "--out", poster], { stdio: "ignore" });
      process.stdout.write(`${path.basename(poster)}: ${Math.round(fs.statSync(poster).size / 1024)} KB\n`);
      // AVFoundation leaves its working copies beside the finished files.
      for (const f of fs.readdirSync(outDir)) if (/\.mp4\.sb-/.test(f)) fs.rmSync(path.join(outDir, f));
    }
  }
  await browser.close();
  process.stdout.write(`frames: ${framesRoot}\n`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
