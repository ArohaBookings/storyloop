/**
 * Generates public/images/logo-email.png from the same geometry as
 * public/logo.svg.
 *
 * Why a generator instead of just committing a PNG: email clients do not render
 * SVG (Gmail and Outlook both strip it), so the mark has to exist as a raster.
 * Checking in an opaque binary means nobody can tell whether it still matches
 * the real logo. This script is the source of truth, so if logo.svg changes,
 * the same numbers change here and the PNG is regenerated:
 *
 *     node scripts/generate-email-logo.mjs
 *
 * No image library is involved. The mark is three concentric shapes on a
 * rounded card, which is plain arithmetic, and Node's own zlib does the PNG
 * encoding. Supersampled 3x for clean edges at small display sizes.
 *
 * Run it after editing and eyeball the output; there is a self-check at the
 * bottom that fails loudly if the canvas comes out blank, which is exactly the
 * failure an earlier browser-canvas attempt produced silently.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const SIZE = 160; // displayed ~40px in email, so 4x for retina
const SS = 3; // supersampling factor
const ART = 200; // logo.svg viewBox

// Colours lifted directly from public/logo.svg.
const CARD = [251, 248, 242]; // #fbf8f2
const BORDER = [228, 213, 197]; // #e4d5c5
const CLAY_A = [168, 120, 81]; // #a87851 gradient start
const CLAY_B = [111, 73, 48]; // #6f4930 gradient end
const GOLD = [232, 193, 85]; // #e8c155

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** Distance from a point to the rounded-rect edge, negative inside. */
function roundedRectSDF(x, y, w, h, r) {
  const qx = Math.abs(x - w / 2) - (w / 2 - r);
  const qy = Math.abs(y - h / 2) - (h / 2 - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

const W = SIZE * SS;
const px = new Float64Array(W * W * 4);

for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    // Map supersampled pixel into the 200x200 art space.
    const ax = ((x + 0.5) / W) * ART;
    const ay = ((y + 0.5) / W) * ART;

    let rgb = null;
    let alpha = 0;

    const card = roundedRectSDF(ax, ay, ART, ART, 44);
    if (card <= 0) {
      rgb = CARD;
      alpha = 1;
      // hairline border just inside the card edge
      if (card > -2.2) rgb = BORDER;

      const d = Math.hypot(ax - 100, ay - 100);

      // outer loop: radius 40, stroke width 9, clay gradient along the diagonal
      if (Math.abs(d - 40) <= 4.5) {
        const t = Math.min(1, Math.max(0, (ax + ay) / (ART * 2)));
        rgb = mix(CLAY_A, CLAY_B, t);
      }
      // inner loop: radius 20, stroke width 4, gold at 70% over the card
      else if (Math.abs(d - 20) <= 2) {
        rgb = mix(CARD, GOLD, 0.7);
      }
      // the captured moment
      if (d <= 5) rgb = CLAY_A;
    }

    const i = (y * W + x) * 4;
    if (alpha > 0 && rgb) {
      px[i] = rgb[0];
      px[i + 1] = rgb[1];
      px[i + 2] = rgb[2];
      px[i + 3] = 255;
    }
  }
}

// Downsample the supersampled buffer to the final size.
const out = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const i = (((y * SS + sy) * W) + (x * SS + sx)) * 4;
        const wgt = px[i + 3] / 255;
        r += px[i] * wgt; g += px[i + 1] * wgt; b += px[i + 2] * wgt; a += px[i + 3];
      }
    }
    const n = SS * SS;
    const aAvg = a / n;
    const cover = aAvg / 255 || 1;
    const o = (y * SIZE + x) * 4;
    out[o] = Math.round(r / n / cover);
    out[o + 1] = Math.round(g / n / cover);
    out[o + 2] = Math.round(b / n / cover);
    out[o + 3] = Math.round(aAvg);
  }
}

// ------------------------------------------------------------------ PNG encode
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // truecolour with alpha
ihdr[10] = 0;  // deflate
ihdr[11] = 0;  // adaptive filtering
ihdr[12] = 0;  // no interlace

// Each scanline is prefixed with filter type 0 (None).
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE * 4 + 1)] = 0;
  out.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

// ------------------------------------------------------------------ self-check
// The earlier attempt at this produced an almost entirely transparent image and
// said nothing. Refuse to write that.
let opaque = 0;
for (let i = 3; i < out.length; i += 4) if (out[i] > 10) opaque++;
const filled = opaque / (SIZE * SIZE);
if (filled < 0.5) {
  console.error(`Refusing to write: only ${(filled * 100).toFixed(1)}% of pixels are opaque.`);
  process.exit(1);
}

const target = "public/images/logo-email.png";
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, png);

const centre = (x, y) => {
  const o = (y * SIZE + x) * 4;
  return [out[o], out[o + 1], out[o + 2], out[o + 3]];
};
console.log(`Wrote ${target} (${SIZE}x${SIZE}, ${png.length} bytes, ${(filled * 100).toFixed(1)}% opaque)`);
console.log(`  centre dot  ${centre(80, 80)}   expected ~[168,120,81]`);
console.log(`  outer loop  ${centre(48, 80)}   expected clay`);
console.log(`  card bg     ${centre(80, 20)}   expected ~[251,248,242]`);
