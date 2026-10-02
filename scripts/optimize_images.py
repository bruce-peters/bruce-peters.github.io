#!/usr/bin/env python3
"""Resize + convert the source screenshots in assets-src/screenshots/ to WebP in
public/screenshots/ (same basename, .webp extension).

Sizes follow how each image is actually displayed:
  - 3D card / pane textures are drawn into ~1024 px canvases -> 1600 px cap
  - archive banners are a 160 px tall strip in a ~520 px card  -> 1200 px cap
  - the about portrait is drawn at ~544 px wide              -> 1000 px cap

Usage:
  python scripts/optimize_images.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "screenshots"
OUT = ROOT / "public" / "screenshots"

# Longest-side cap per file; anything not listed gets DEFAULT_MAX.
DEFAULT_MAX = 1600
MAX_SIDE = {
    "Headshot.jpg": 1000,
    "crab-hunt-physics.jpeg": 1200,
    "roots.png": 1200,
    "pill-pall.jpeg": 1200,
    "scioly-robot.jpeg": 1200,
    "wordle.png": 1200,
    "chat-app.png": 1200,
    "survival-game.png": 1200,
    "marshmallow-simulator-lobby.png": 1200,
    "non-euclidean-escape.png": 1200,
    "scuffed-platformer.png": 1200,
}
QUALITY = 82


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for src in sorted(SRC.iterdir()):
        if src.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
            continue
        im = Image.open(src)
        im = ImageOps.exif_transpose(im)  # phone photos carry rotation in EXIF
        cap = MAX_SIDE.get(src.name, DEFAULT_MAX)
        if max(im.size) > cap:
            im.thumbnail((cap, cap), Image.LANCZOS)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        dst = OUT / (src.stem + ".webp")
        im.save(dst, "WEBP", quality=QUALITY, method=6)
        print(f"{src.name:36} {src.stat().st_size / 1e6:5.2f} MB -> "
              f"{dst.stat().st_size / 1e6:5.2f} MB  {im.size[0]}x{im.size[1]}")


if __name__ == "__main__":
    main()
