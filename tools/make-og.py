#!/usr/bin/env python3
"""
Regenerates og.png — the link preview card for instagram / linkedin / imessage.

    python3 tools/make-og.py

The artwork is the same Lorenz attractor that runs behind the live page,
integrated with the same constants and composited the same way (screen blend
over near-black), so the preview and the site agree with each other.
"""
import math
import pathlib
from PIL import Image, ImageDraw, ImageFont, ImageChops

W, H = 1200, 630
SS = 3                                    # supersample; PIL has no AA lines
OUT = pathlib.Path(__file__).resolve().parent.parent / "og.png"

BG = (8, 8, 11)

# lorenz, 1963
SIGMA, RHO, BETA = 10.0, 28.0, 8.0 / 3.0
DT, STEPS = 0.0035, 105_000

# near the x–z plane: that projection is the one that reads as the butterfly.
# a few degrees off-axis keeps it from looking flat.
ANG, ELEV = 0.06, 0.12
CX, CY, SCALE = 0.665, 0.47, 8.6          # centre as a fraction of W/H, then px per unit


def attractor():
    """the trail, projected to 2D screen coords at supersampled resolution"""
    x, y, z = 0.01, 0.0, 0.0
    ca, sa = math.cos(ANG), math.sin(ANG)
    ce, se = math.cos(ELEV), math.sin(ELEV)
    cx, cy, s = CX * W * SS, CY * H * SS, SCALE * SS
    pts = []
    for _ in range(STEPS):
        x += SIGMA * (y - x) * DT
        y += (x * (RHO - z) - y) * DT
        z += (x * y - BETA * z) * DT
        rx = x * ca - y * sa
        ry = (x * sa + y * ca) * se + (z - 25) * ce
        pts.append((cx + rx * s, cy - ry * s))
    return pts


def draw_attractor():
    layer = Image.new("RGB", (W * SS, H * SS), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    pts = attractor()
    n = len(pts)
    # oldest tail dark, head bright — same fade as the canvas version
    chunks = 90
    per = n // chunks
    for c in range(chunks):
        t = c / (chunks - 1)
        col = (int(24 + t * 206), int(6 + t * 46), int(12 + t * 62))
        seg = pts[c * per: (c + 1) * per + 1]
        if len(seg) > 1:
            d.line(seg, fill=col, width=SS, joint="curve")
    return layer.resize((W, H), Image.LANCZOS)


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def main():
    print("integrating attractor…")
    art = draw_attractor()

    base = Image.new("RGB", (W, H), BG)
    img = ImageChops.screen(base, art)          # matches mix-blend-mode: screen

    # shade the left third so the type has clean ground to sit on
    shade = Image.new("L", (W, H))
    sd = shade.load()
    for x in range(W):
        v = int(238 * max(0.0, 1.0 - (x / W) / 0.60) ** 1.15)
        for y in range(H):
            sd[x, y] = v
    img = Image.composite(Image.new("RGB", (W, H), BG), img, shade)

    d = ImageDraw.Draw(img)
    serif = font("/System/Library/Fonts/Supplemental/Georgia.ttf", 132)
    mono = font("/System/Library/Fonts/Menlo.ttc", 30)
    mono_s = font("/System/Library/Fonts/Menlo.ttc", 23)
    mono_xs = font("/System/Library/Fonts/Menlo.ttc", 19)

    X = 84
    d.text((X, 196), "sanjay", font=serif, fill=(237, 237, 240))
    d.line([(X + 3, 366), (X + 92, 366)], fill=(196, 30, 58), width=3)
    d.text((X, 398), "cs + math @ kennesaw state", font=mono, fill=(190, 190, 199))
    d.text((X, 446), "aspiring quant trader · founding hacksu", font=mono_s, fill=(139, 139, 150))

    d.text((X, 92), "MARIETTA, GA", font=mono_xs, fill=(240, 66, 86))
    d.text((X, H - 62), "sanjayrv-dev.github.io", font=mono_xs, fill=(139, 139, 150))
    d.text((W - 292, H - 62), "σ=10  ρ=28  β=8/3", font=mono_xs, fill=(120, 120, 130))

    # corner brackets, same as the site
    c, L, T = (49, 49, 59), 34, 5
    for (ax, ay, dx, dy) in ((44, 44, 1, 1), (W - 44, 44, -1, 1),
                             (44, H - 44, 1, -1), (W - 44, H - 44, -1, -1)):
        d.rectangle([min(ax, ax + dx * L), min(ay, ay + dy * T),
                     max(ax, ax + dx * L), max(ay, ay + dy * T)], fill=c)
        d.rectangle([min(ax, ax + dx * T), min(ay, ay + dy * L),
                     max(ax, ax + dx * T), max(ay, ay + dy * L)], fill=c)

    img.save(OUT, "PNG", optimize=True)
    print(f"wrote {OUT}  ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
