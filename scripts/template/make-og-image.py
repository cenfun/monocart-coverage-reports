#!/usr/bin/env python3
"""Generate the 1200x630 Open Graph image for the Monocart Coverage Reports
docs site (https://cenfun.github.io/monocart-coverage-reports/).

Pillow-only and portable: the monocart logomark is loaded from the
pre-rendered og-logo.png next to this script (no SVG rasterizer needed).
Fonts are looked up in FONT_DIR or common DejaVu paths.

Usage: python3 scripts/template/make-og-image.py
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630

# Monocart / coverage-report palette (light GitHub-style report theme)
BG = (255, 255, 255)        # #ffffff report background
HEADER_BG = (246, 248, 250)  # #f6f8fa GitHub header gray
TEXT = (36, 41, 47)          # #24292e primary text
MUTED = (87, 96, 106)        # #57606a secondary text
BORDER = (208, 215, 222)     # #d0d7de borders
MARK = (210, 105, 30)        # #d2691e chocolate brand mark
GREEN = (46, 164, 79)        # #2ea44f coverage pass
YELLOW = (227, 179, 65)      # #e3b341 coverage warn

_FONT_CANDIDATES = [
    "DejaVuSans-Bold.ttf",
    "DejaVuSans.ttf",
    "NotoSans-Bold.ttf",
    "NotoSans-Regular.ttf",
]


def load_font(size, bold=False):
    """Find a usable TTF/OTF font (FONT_DIR override first, then common paths)."""
    env_dir = os.environ.get("FONT_DIR")
    if env_dir:
        candidates = [
            os.path.join(env_dir, "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"),
            os.path.join(env_dir, "DejaVuSans.ttf" if bold else "DejaVuSans-Bold.ttf"),
        ]
        for c in candidates:
            if os.path.exists(c):
                return ImageFont.truetype(c, size)
    roots = [
        "/usr/share/fonts/truetype/dejavu",
        "/usr/share/fonts/TTF",
        "/Library/Fonts",
        "C:/Windows/Fonts",
    ]
    for root in roots:
        for name in _FONT_CANDIDATES:
            if bold and "Bold" not in name:
                continue
            if not bold and "Bold" in name:
                continue
            p = os.path.join(root, name)
            if os.path.exists(p):
                return ImageFont.truetype(p, size)
    raise FileNotFoundError("No usable TTF font found; set FONT_DIR=/path/to/fonts")


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # header band + accent strip (brand chocolate)
    d.rectangle([0, 0, W, 8], fill=MARK)
    d.rectangle([0, 8, W, 96], fill=HEADER_BG)

    # subtle footer band
    d.rectangle([0, 540, W, H], fill=HEADER_BG)

    # logomark (transparent PNG next to this script)
    logo_path = os.path.join(here, "og-logo.png")
    if os.path.exists(logo_path):
        logo = Image.open(logo_path).convert("RGBA")
        resample = getattr(Image, "Resampling", Image).LANCZOS
        logo = logo.resize((230, 230), resample)
        img.paste(logo, (95, 175), logo)
    else:
        # fallback: simple chocolate hexagon/M placeholder
        d.regular_polygon((210, 280, 110), n_sides=6, rotation=30, fill=MARK)

    f_bold_big = load_font(46, bold=True)
    f_reg = load_font(27)
    f_reg_small = load_font(23)
    f_bold_small = load_font(27, bold=True)

    # title + tagline
    d.text((360, 218), "Monocart Coverage Reports", font=f_bold_big, fill=TEXT, anchor="la")
    d.text((363, 292), "Native V8 & Istanbul coverage reports for JavaScript",
           font=f_reg, fill=MUTED, anchor="la")

    # feature pills
    pills = ["V8  ·  Istanbul", "15+ report formats", "Merge  ·  CI gate"]
    pill_h = 48
    x = 363
    for label in pills:
        w_text = d.textlength(label, font=f_reg_small)
        pw = w_text + 40
        d.rounded_rectangle([x, 358, x + pw, 358 + pill_h], radius=pill_h // 2,
                            outline=BORDER, width=3)
        d.text((x + 20, 358 + pill_h // 2), label, font=f_reg_small, fill=TEXT, anchor="lm")
        x += pw + 18

    # coverage status dots (report-theme accent) — 2x2 grid to avoid clipping
    metrics = [("Statements", "81.6%", GREEN), ("Branches", "59.6%", YELLOW),
               ("Functions", "78.8%", YELLOW), ("Lines", "64.4%", YELLOW)]
    for i, (name, pct, color) in enumerate(metrics):
        mx = 363 + (i % 2) * 335
        my = 462 + (i // 2) * 42
        d.ellipse([mx, my, mx + 14, my + 14], fill=color)
        d.text((mx + 24, my + 7), f"{name} {pct}", font=f_reg_small, fill=TEXT, anchor="lm")

    # domain footer
    d.text((600, 585), "cenfun.github.io/monocart-coverage-reports",
           font=f_bold_small, fill=TEXT, anchor="mm")

    out = os.path.join(here, "og-image.png")
    img.save(out)
    print(f"saved {out} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    sys.exit(main())