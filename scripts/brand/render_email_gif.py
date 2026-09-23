#!/usr/bin/env python3
"""
The animated hero for StoryLoop emails: a real note becoming its real draft.

    python3 scripts/brand/render_email_gif.py

Writes public/email/note-to-story.gif (shown at 560 px wide).

The note and the draft are real: the draft is what the production writer
returned for this note in the story evaluation run of 23 September 2026
(fidelity 8/10 from the independent judge, no invented speech). The child's two
quotes are highlighted because keeping a child's words exactly is the promise.

Email clients do not run scripts and most ignore CSS animation, but nearly all
play a GIF, and Outlook shows its first frame. So the first frame is a complete
picture on its own (the finished draft), then it plays from the note.
"""
import io
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "public" / "email"

NOTE = "Mia found a slater under the log. Put it on her hand and counted its legs, got to 12 then lost count. Asked 'does it have a mum?'. Got the bug book with Hemi and they found a picture. Mia said 'it rolls into a ball like a hedgehog'."
TITLE = "Mia and the slater"
# Whole sentences exactly as the writer returned them, in order; the rest of
# each paragraph and the later sections are left out for space, never reworded.
PARAS = [
    "Mia found a slater under a log and chose to hold it carefully on her hand. She looked closely at its body and began counting its legs.",
    "Mia then wondered, <q>does it have a mum?</q> This question opened up her thinking about the slater as a living creature.",
    "Mia got the bug book with Hemi and they found a picture of a slater. Mia connected the picture to what she had seen in her hand and explained, <q>it rolls into a ball like a hedgehog</q>.",
]
CHIPS = ["Her words, kept exactly", "Te Whāriki: Mana aotūroa", "Checked against your note"]

HTML = """<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,500&family=Manrope:wght@500;600;700&family=JetBrains+Mono:wght@500&display=block">
<style>
*{box-sizing:border-box}
body{margin:0;background:#f8f1e7}
#stage{width:560px;padding:22px;background:#f8f1e7;font-family:Manrope,Arial,sans-serif;color:#2b2826}
.label{font:700 10px/1 Manrope,Arial;letter-spacing:.14em;text-transform:uppercase;color:#8c5e3d;margin:0 0 8px}
.note{background:#fffdf8;border:1px solid #e4d5c5;border-radius:16px;padding:14px 16px;min-height:96px}
.note p{margin:0;font:500 12.5px/1.6 'JetBrains Mono',monospace;color:#3f3a38}
.caret{display:inline-block;width:7px;height:14px;background:#a87851;vertical-align:-2px;margin-left:1px}
.bar{display:flex;align-items:center;justify-content:space-between;margin:12px 0}
.btn{background:#6f4930;color:#fffaf1;border-radius:999px;padding:9px 16px;font:700 12.5px/1 Manrope,Arial}
.btn.dim{background:#bd9573}
.writing{font:600 12px/1 Manrope,Arial;color:#8c5e3d}
.story{background:#fffdf8;border:1px solid #e4d5c5;border-left:4px solid #a87851;border-radius:16px;padding:16px 18px}
.story h2{margin:0 0 4px;font:700 22px/1.15 Fraunces,Georgia,serif;color:#1a1817}
.story .kicker{font:600 11px/1 Manrope,Arial;color:#8c5e3d;margin:0 0 10px}
.story p{margin:0 0 9px;font:500 13px/1.6 Manrope,Arial;color:#3f3a38}
q{quotes:none;background:#e2ecd9;color:#304121;border-radius:5px;padding:1px 4px;font-weight:700}
q::before{content:'\\201C'}q::after{content:'\\201D'}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.chip{background:#f2f6ee;border:1px solid #c7d8b3;color:#3a5027;border-radius:999px;padding:5px 10px;font:700 11px/1 Manrope,Arial}
.hide{visibility:hidden}
</style></head><body><div id="stage">
<p class="label">Your note, %d words</p>
<div class="note"><p id="note"></p></div>
<div class="bar"><span class="writing" id="writing">&nbsp;</span><span class="btn" id="btn">Write my story</span></div>
<div class="story">
<h2 id="title">&nbsp;</h2>
<p class="kicker" id="kicker">&nbsp;</p>
<div id="paras"></div>
<div class="chips" id="chips"></div>
</div>
</div>
<script>
const NOTE = %s, TITLE = %s, PARAS = %s, CHIPS = %s;
window.setFrame = (s) => {
  const chars = Math.round(NOTE.length * Math.min(1, s.note));
  document.getElementById('note').innerHTML = NOTE.slice(0, chars).replace(/&/g,'&amp;').replace(/</g,'&lt;') + (s.note < 1 ? '<span class="caret"></span>' : '');
  document.getElementById('writing').innerHTML = s.writing ? 'StoryLoop is writing' + '.'.repeat(s.writing) : '&nbsp;';
  document.getElementById('btn').className = 'btn' + (s.writing ? ' dim' : '');
  document.getElementById('title').innerHTML = s.paras >= 0 ? TITLE : '&nbsp;';
  document.getElementById('kicker').innerHTML = s.paras >= 0 ? 'Learning story, opening lines &middot; a draft for you to check' : '&nbsp;';
  document.getElementById('paras').innerHTML = PARAS.slice(0, Math.max(0, s.paras)).map(p => '<p>' + p + '</p>').join('');
  document.getElementById('chips').innerHTML = CHIPS.slice(0, s.chips).map(c => '<span class="chip">' + c + '</span>').join('');
};
</script></body></html>"""


def frames():
    """(state, milliseconds). The finished picture comes first, for Outlook."""
    done = {"note": 1, "writing": 0, "paras": 3, "chips": 3}
    out = [(done, 2600)]
    blank = {"note": 0, "writing": 0, "paras": -1, "chips": 0}
    out.append((blank, 500))
    steps = 14
    for i in range(1, steps + 1):
        out.append(({**blank, "note": i / steps}, 90))
    out.append(({**blank, "note": 1}, 700))
    for dots in (1, 2, 3, 1, 2, 3):
        out.append(({**blank, "note": 1, "writing": dots}, 260))
    for paras in (0, 1, 2, 3):
        out.append(({"note": 1, "writing": 0, "paras": paras, "chips": 0}, 650 if paras else 350))
    for chips in (1, 2, 3):
        out.append(({"note": 1, "writing": 0, "paras": 3, "chips": chips}, 380))
    out.append((done, 3400))
    return out


def main():
    import json

    OUT.mkdir(parents=True, exist_ok=True)
    html = HTML % (len(NOTE.split()), json.dumps(NOTE), json.dumps(TITLE), json.dumps(PARAS), json.dumps(CHIPS))
    images, durations = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(device_scale_factor=2, viewport={"width": 620, "height": 900})
        page.set_content(html, wait_until="networkidle")
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(400)
        stage = page.locator("#stage")
        # Lock every box at its finished size so nothing jumps between frames.
        page.evaluate("s => window.setFrame(s)", frames()[0][0])
        page.evaluate("""() => {
          for (const sel of ['.note', '.story', '#stage']) {
            const el = document.querySelector(sel);
            el.style.height = el.getBoundingClientRect().height + 'px';
          }
        }""")
        for state, ms in frames():
            page.evaluate("s => window.setFrame(s)", state)
            png = stage.screenshot()
            image = Image.open(io.BytesIO(png)).convert("RGB")
            # Rendered at 2x, stored at 1.5x: sharp on a phone, light enough to load.
            image = image.resize((int(image.width * 0.75), int(image.height * 0.75)), Image.LANCZOS)
            images.append(image)
            durations.append(ms)
        browser.close()
    # One shared palette keeps the file small and stops colours flickering.
    palette_source = images[0]
    quantised = [im.quantize(palette=palette_source.quantize(colors=96, method=Image.MEDIANCUT), dither=Image.NONE) for im in images]
    target = OUT / "note-to-story.gif"
    quantised[0].save(target, save_all=True, append_images=quantised[1:], duration=durations, loop=0, optimize=True, disposal=1)
    print(target.relative_to(REPO), images[0].size, "%d frames" % len(images), "%d KB" % (target.stat().st_size // 1024))


if __name__ == "__main__":
    main()
