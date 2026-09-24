#!/usr/bin/env python3
"""
Photographic scenes for the website: real settings (a kitchen table at night,
a centre room, an office, a couch) with a device whose screen is left pure
chroma green, so a REAL StoryLoop screenshot can be put on it afterwards by
composite_scenes.py. The model never draws StoryLoop's interface, so nothing
on a screen is invented.

Children are shown the way centres photograph them for families: hands,
backs, soft focus, never a clear face.

    python3 scripts/brand/generate_scenes.py            # all scenes
    python3 scripts/brand/generate_scenes.py kitchen    # one scene

Reads OPENAI_API_KEY from the repository's root .env.local. Writes raw
scenes to scripts/brand/scenes/<name>.png (not served).
"""

import base64
import json
import os
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "scenes"

STYLE = (
    "Documentary photograph, natural light, shot on a full-frame camera with a 35mm lens, shallow depth of field, "
    "warm but true colours, realistic skin and fabric texture, candid, not staged, not an advert. "
    "New Zealand / Australian setting. No text, no logos, no watermarks. "
    "The device screen is completely flat, uniform, fully saturated chroma-key green (#00FF00) from edge to edge, "
    "evenly lit, with no reflections, no glare, no content and no bezel shadows on it, and nothing covers any part of the screen."
)

SCENES = {
    "kitchen": (
        "1536x1024",
        "An early childhood teacher in her early thirties sitting at a wooden kitchen table at home in the evening, "
        "a warm lamp and a mug of tea beside her, a small spiral notebook with handwritten notes open next to a silver laptop. "
        "The laptop faces the camera at a slight three-quarter angle so its whole screen is clearly visible. "
        "She is relaxed and smiling slightly, looking at the screen, one hand resting near the trackpad. "
        "Dark window behind her, cosy, tired-but-relieved mood.",
    ),
    "classroom": (
        "1536x1024",
        "Inside a bright early childhood centre in the morning. In the foreground, an educator's hands hold an iPad in landscape "
        "orientation, seen from slightly behind her shoulder, the iPad's whole screen facing the camera. "
        "In the soft-focus background, two toddlers seen from behind build a tower of natural wooden blocks on a low table; "
        "no child's face is visible. Plants, low shelves with baskets, children's paintings on the wall.",
    ),
    "office": (
        "1536x1024",
        "A centre manager in her forties at a tidy desk in a small office of an early childhood centre, children's artwork "
        "pinned to a corkboard behind her, a window with daylight. A laptop on the desk faces the camera at a gentle angle so "
        "its entire screen is visible; she is leaning in, reading it with a calm, satisfied expression, a pen in her hand.",
    ),
    "family": (
        "1024x1536",
        "A parent sitting on a couch at home in the late afternoon, holding a smartphone upright towards the camera so its whole "
        "screen is visible, smiling at it. A toddler leans against the parent's arm, seen only from behind (the back of their "
        "curly head and a striped jumper), no face visible. Soft window light, a knitted blanket, a few picture books on the couch.",
    ),
    "team": (
        "1536x1024",
        "Three early childhood educators of different ages and backgrounds sitting on low chairs around a child-height table after "
        "the children have gone home, planning together. A laptop on the table is turned towards the camera so its full screen is "
        "visible. Mugs, sticky notes, a basket of loose parts. Warm late-afternoon light, relaxed, collegial.",
    ),
}


def api_key() -> str:
    # The main checkout's .env.local (worktrees live under .claude/worktrees/).
    candidates = [parent / ".env.local" for parent in HERE.parents]
    for path in candidates:
        if path.exists():
            for line in path.read_text().splitlines():
                if line.startswith("OPENAI_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"')
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        sys.exit("OPENAI_API_KEY not found")
    return key


def generate(name: str) -> str:
    size, scene = SCENES[name]
    body = json.dumps({
        "model": "gpt-image-2",
        "prompt": f"{scene} {STYLE}",
        "size": size,
        "quality": "high",
        "n": 1,
    }).encode()
    request = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=body,
        headers={"Authorization": f"Bearer {api_key()}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=300) as response:
        payload = json.load(response)
    data = payload["data"][0]
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.png"
    path.write_bytes(base64.b64decode(data["b64_json"]))
    return str(path)


def _safe(name: str) -> str:
    try:
        return generate(name)
    except urllib.error.HTTPError as error:
        return f"failed: {error.code} {error.read()[:300]!r}"
    except Exception as error:  # noqa: BLE001
        return f"failed: {error}"


if __name__ == "__main__":
    names = sys.argv[1:] or list(SCENES)
    with ThreadPoolExecutor(max_workers=5) as pool:
        for name, result in zip(names, pool.map(lambda n: _safe(n), names)):
            print(name, result)
