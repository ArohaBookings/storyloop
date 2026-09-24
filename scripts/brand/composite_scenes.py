#!/usr/bin/env python3
"""
Put a REAL StoryLoop screenshot onto the green screen of each generated scene
(generate_scenes.py), so every screen on the website shows the actual product.

The screen is found as the largest patch of chroma green, its four corners are
taken from that patch, and the screenshot is warped onto it with a perspective
transform. Green that spills onto the bezel is neutralised, and a faint glare
keeps it looking like glass rather than a sticker.

    python3 scripts/brand/composite_scenes.py

Screens come from .test-local/shots-devices.mjs (real pages from a local build,
stories from the story-eval run). Writes public/images/scenes/<name>.jpg.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

HERE = Path(__file__).resolve().parent
SCENES = HERE / "scenes"
SCREENS = HERE / "screens"
OUT = HERE.parents[1] / "public" / "images" / "scenes"

# scene -> the real screen that goes on it
PAIRS = {
    "kitchen": "laptop-draft.png",
    "classroom": "ipad-draft.png",
    "office": "laptop-accuracy.png",
    "family": "phone-family.png",
    "team": "laptop-examples.png",
}


def green_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    mask = (g > 140) & (g - np.maximum(r, b) > 70)
    mask = ndimage.binary_opening(mask, iterations=2)
    labels, count = ndimage.label(mask)
    if count == 0:
        raise ValueError("no green screen found")
    sizes = ndimage.sum(mask, labels, range(1, count + 1))
    largest = labels == (int(np.argmax(sizes)) + 1)
    return ndimage.binary_fill_holes(largest)


def corners(mask: np.ndarray) -> np.ndarray:
    ys, xs = np.nonzero(mask)
    s, d = xs + ys, xs - ys
    return np.array([
        [xs[np.argmin(s)], ys[np.argmin(s)]],  # top left
        [xs[np.argmax(d)], ys[np.argmax(d)]],  # top right
        [xs[np.argmax(s)], ys[np.argmax(s)]],  # bottom right
        [xs[np.argmin(d)], ys[np.argmin(d)]],  # bottom left
    ], dtype=float)


def perspective_coeffs(dst: np.ndarray, src: np.ndarray) -> list[float]:
    """Coefficients mapping output (dst quad) pixels back to input (src rect) pixels, for PIL."""
    rows = []
    for (x, y), (u, v) in zip(dst, src):
        rows.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        rows.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    a = np.array(rows, dtype=float)
    b = src.reshape(8)
    return list(np.linalg.solve(a, b))


def composite(name: str, screen_file: str) -> Path:
    scene = Image.open(SCENES / f"{name}.png").convert("RGB")
    rgb = np.array(scene)
    mask = green_mask(rgb)
    quad = corners(mask)

    # Screens are captured at each device's real proportions (a 16:10 laptop, a
    # landscape iPad, a phone), so they go on whole; the quad's own proportions
    # are foreshortened by perspective and would crop the page wrongly.
    shot = Image.open(SCREENS / screen_file).convert("RGB")
    sw, sh = shot.size
    src = np.array([[0, 0], [sw, 0], [sw, sh], [0, sh]], dtype=float)
    warped = shot.transform(scene.size, Image.PERSPECTIVE, perspective_coeffs(quad, src), Image.BICUBIC)

    # Cover the green fully, with a soft edge.
    grown = ndimage.binary_dilation(mask, iterations=2)
    alpha = Image.fromarray((grown * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))

    # A screen is lit from inside: keep it bright, with a faint diagonal glare.
    screen = np.array(warped).astype(float)
    h, w = mask.shape
    yy, xx = np.mgrid[0:h, 0:w]
    x0, y0 = quad[:, 0].min(), quad[:, 1].min()
    span = max(1.0, (quad[:, 0].max() - x0) + (quad[:, 1].max() - y0))
    t = ((xx - x0) + (yy - y0)) / span
    glare = np.clip(0.07 - 0.09 * t, 0, 0.07)[..., None]
    screen = screen * 0.965 + 255 * glare
    warped = Image.fromarray(np.clip(screen, 0, 255).astype(np.uint8))

    out = Image.composite(warped, scene, alpha)

    # Neutralise green spill on the bezel just outside the screen.
    ring = ndimage.binary_dilation(mask, iterations=8) & ~grown
    arr = np.array(out).astype(int)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    spill = ring & (g > np.maximum(r, b) + 12)
    arr[..., 1] = np.where(spill, np.maximum(r, b) + 4, g)
    out = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.jpg"
    out.save(path, quality=86, optimize=True, progressive=True)
    return path


if __name__ == "__main__":
    for scene_name, screen in PAIRS.items():
        if not (SCENES / f"{scene_name}.png").exists():
            print(scene_name, "skipped: no scene yet")
            continue
        try:
            print(scene_name, composite(scene_name, screen))
        except ValueError as error:
            print(scene_name, "failed:", error)
