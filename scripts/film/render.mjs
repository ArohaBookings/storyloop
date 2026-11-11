// Renders the homepage film from film.html (scripts/film/README.md).
//
//   node scripts/film/render.mjs            both variants (nz, au), into public/film
//   node scripts/film/render.mjs --variant nz --frames-only   frames only, to look at
//
// The note, the story and the "flagged for you to check" lines are read from the
// same files the homepage demo uses, so the film cannot drift from the product:
// change the example there, run this again, and the film says the new words.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const FPS = 30;
const SECONDS = 20;
const SIZE = { width: 1080, height: 1350 };
// Two files per variant: phones get the small one (HomeFilm picks by screen width).
const OUTPUTS = [
  { suffix: "", width: 1080, height: 1350, bitrate: 1_300_000 },
  { suffix: "-small", width: 720, height: 900, bitrate: 700_000 },
];
const POSTER_SECOND = 9.4; // the child's words marked, with the chip

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

const pad = (n) => String(n).padStart(4, "0");

async function main() {
  const which = arg("variant", "all");
  const outDir = path.resolve(root, arg("out", "public/film"));
  const framesRoot = path.resolve(arg("frames", path.join(os.tmpdir(), "storyloop-film-frames")));
  const framesOnly = process.argv.includes("--frames-only");
  const encodeOnly = process.argv.includes("--encode-only"); // reuse the frames already in --frames
  const step = Number(arg("step", 1)); // --step 15 renders every 15th frame, for a quick look
  const data = examples();
  const variants = which === "all" ? Object.keys(data) : [which];
  fs.mkdirSync(outDir, { recursive: true });

  const { chromium } = playwright();
  const browser = await chromium.launch();
  let encoder = null;
  for (const variant of variants) {
    if (!data[variant]) throw new Error(`unknown variant ${variant}`);
    const dir = path.join(framesRoot, variant);
    if (!encodeOnly) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });
    await page.addInitScript((d) => { window.FILM_DATA = d; window.FILM_RENDER = true; }, data[variant]);
    await page.goto(pathToFileURL(path.join(here, "film.html")).href);
    // Ask for every face the film uses: a font is only fetched once something needs it,
    // and the note (the only mono text) is empty when the page opens.
    const fonts = await page.evaluate(async () => {
      const faces = ["500 40px Fraunces", "700 40px Fraunces", "500 30px Manrope", "600 30px Manrope", "700 30px Manrope", "800 30px Manrope", "400 30px 'JetBrains Mono'"];
      await Promise.all(faces.map((f) => document.fonts.load(f)));
      await document.fonts.ready;
      return faces.map((f) => document.fonts.check(f));
    });
    if (fonts.includes(false)) throw new Error("The film's fonts did not load (is the network up?). Frames would use fallback fonts.");
    await page.evaluate(() => window.filmInit());
    const film = page.locator("#film");
    const total = FPS * SECONDS;
    for (let i = 0; i < total; i += step) {
      await page.evaluate((t) => window.filmRender(t), i / FPS);
      await film.screenshot({ path: path.join(dir, `f${pad(i)}.png`) });
      if (i % 100 === 0) process.stdout.write(`${variant} ${i}/${total}\n`);
    }
    await page.close();
    }
    if (framesOnly || step !== 1) continue;

    if (!encoder) {
      encoder = path.join(framesRoot, "encode");
      execFileSync("swiftc", ["-O", "-suppress-warnings", path.join(here, "encode.swift"), "-o", encoder], { stdio: "inherit" });
    }
    for (const o of OUTPUTS) {
      const file = path.join(outDir, `storyloop-${variant}${o.suffix}.mp4`);
      process.stdout.write(execFileSync(encoder, [dir, file, String(o.width), String(o.height), String(FPS), String(o.bitrate)]).toString());
    }
    const poster = path.join(outDir, `storyloop-${variant}-poster.jpg`);
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "78", "-Z", "900", path.join(dir, `f${pad(Math.round(POSTER_SECOND * FPS))}.png`), "--out", poster], { stdio: "ignore" });
    process.stdout.write(`${path.basename(poster)}: ${Math.round(fs.statSync(poster).size / 1024)} KB\n`);
    // AVFoundation leaves its working copies beside the finished files.
    for (const f of fs.readdirSync(outDir)) if (/\.mp4\.sb-/.test(f)) fs.rmSync(path.join(outDir, f));
  }
  await browser.close();
  process.stdout.write(`frames: ${framesRoot}\n`);
}

main().catch((error) => { console.error(error.message); process.exit(1); });
