#!/usr/bin/env python3
"""
Render StoryLoop's brand images from the site's own logo and typeface.

    python3 scripts/brand/render_brand.py

Writes public/brand/:
  storyloop-icon.png        512 x 512, the loop mark on paper (Stripe icon, favicons)
  storyloop-logo.png        mark + wordmark, transparent, for Stripe Checkout
  storyloop-logo-email.png  mark + wordmark at 2x for emails (shown at 190 x 44)

The mark is public/logo.svg; the wordmark is Fraunces, the display face the
site uses, so every surface a customer sees says the same name the same way.
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "public" / "brand"
SVG = (REPO / "public" / "logo.svg").read_text()

FONT = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&display=block">'
PAGE = """<!doctype html><html><head>%s<style>
html,body{margin:0;background:transparent}
.wrap{display:inline-flex;align-items:center;gap:%dpx;padding:%dpx}
.mark{width:%dpx;height:%dpx}
.mark svg{width:100%%;height:100%%}
.word{font-family:Fraunces,Georgia,serif;font-weight:700;font-size:%dpx;letter-spacing:-0.02em;color:%s;line-height:1}
</style></head><body><div class="wrap" id="x"><div class="mark">%s</div>%s</div></body></html>"""


def render(page, name, mark, word_size, gap, pad, color="#2b2826", with_word=True):
    html = PAGE % (FONT, gap, pad, mark, mark, word_size, color, SVG,
                   '<span class="word">StoryLoop</span>' if with_word else "")
    page.set_content(html, wait_until="networkidle")
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(300)
    page.locator("#x").screenshot(path=str(OUT / name), omit_background=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(device_scale_factor=1)
        render(page, "storyloop-icon.png", mark=512, word_size=0, gap=0, pad=0, with_word=False)
        render(page, "storyloop-logo.png", mark=160, word_size=112, gap=36, pad=16)
        render(page, "storyloop-logo-email.png", mark=72, word_size=52, gap=16, pad=8)
        browser.close()
    for f in sorted(OUT.glob("*.png")):
        print(f.relative_to(REPO), f.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
