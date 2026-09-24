"""Generate an animated 8-bit version of assets/profile.png.

Usage (from the repo root):
    pip install pillow
    python3 tools/pixel-profile/generate.py

Writes assets/profile4.gif (also used by the profile image rotation).
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "profile.png"
OUT = ROOT / "assets" / "profile4.gif"

SIZE = 128          # pixel-art resolution
SCALE = 4           # output upscale (nearest neighbour)
COLORS = 48         # base palette size
FRAMES = 32
FRAME_MS = 100

random.seed(8)


def build_base():
    im = Image.open(SRC).convert("RGB")
    im = ImageEnhance.Color(im).enhance(1.35)
    im = ImageEnhance.Contrast(im).enhance(1.08)
    small = im.resize((SIZE, SIZE), Image.BOX)
    q = small.quantize(COLORS, method=Image.MEDIANCUT, kmeans=4, dither=Image.Dither.NONE)
    return q.convert("RGB")


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def mix(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


# ---------------------------------------------------------------- sprites

class Floater:
    """A bright object on a dark background that bobs up and down."""

    def __init__(self, base, box, phase, amp=1.5, threshold=70):
        x0, y0, x1, y1 = box
        self.box = box
        self.phase = phase
        self.amp = amp
        self.pixels = {}
        bg = []
        for y in range(y0, y1):
            for x in range(x0, x1):
                c = base.getpixel((x, y))
                if lum(c) > threshold:
                    self.pixels[(x, y)] = c
                else:
                    bg.append(c)
        bg.sort(key=lum)
        self.bg = bg[len(bg) // 2] if bg else (10, 10, 20)

    def clear(self, frame):
        for (x, y) in self.pixels:
            frame.putpixel((x, y), self.bg)

    def draw(self, frame, t):
        dy = round(self.amp * math.sin(2 * math.pi * t + self.phase))
        for (x, y), c in self.pixels.items():
            if 0 <= y + dy < SIZE:
                frame.putpixel((x, y + dy), c)


def glow(frame, base, cx, cy, r, color, strength, pred=lambda c: True):
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            d = math.hypot(x - cx, y - cy)
            if d > r:
                continue
            c = base.getpixel((x, y))
            if pred(c):
                k = strength * (1 - d / (r + 1))
                frame.putpixel((x, y), mix(c, color, max(0.0, min(1.0, k))))


def blink(frame, base, x0, x1, y0, y1, lid_row):
    for x in range(x0, x1 + 1):
        skin = base.getpixel((x, y1 + 1))
        for y in range(y0, y1 + 1):
            frame.putpixel((x, y), skin)
        frame.putpixel((x, lid_row), (48, 28, 23))


def sparkle(frame, cx, cy, size, color=(255, 255, 240)):
    frame.putpixel((cx, cy), color)
    for i in range(1, size + 1):
        c = mix(color, frame.getpixel((cx, cy - i)), i / (size + 1))
        for x, y in ((cx + i, cy), (cx - i, cy), (cx, cy + i), (cx, cy - i)):
            frame.putpixel((x, y), c)


# ---------------------------------------------------------------- main

def main():
    base = build_base()

    floaters = [
        Floater(base, (25, 4, 43, 21), 0.0),            # top cube
        Floater(base, (29, 22, 41, 32), 2.1, amp=1.2, threshold=45),  # gem
        Floater(base, (27, 33, 41, 45), 4.2),           # bottom cube
    ]

    # twinkling stars in dark spots of the upper background
    stars = []
    candidates = [(x, y) for y in range(1, 50) for x in range(1, SIZE - 1)
                  if lum(base.getpixel((x, y))) < 40
                  and all(lum(base.getpixel((x + dx, y + dy))) < 55
                          for dx in (-1, 0, 1) for dy in (-1, 0, 1))]
    random.shuffle(candidates)
    for x, y in candidates:
        if all(abs(x - sx) + abs(y - sy) > 6 for sx, sy, _ in stars):
            stars.append((x, y, random.random()))
        if len(stars) == 26:
            break

    is_cyan = lambda c: c[2] > c[0] + 30 and lum(c) > 60
    is_warm = lambda c: c[0] > c[2] + 20
    is_brain = lambda c: c[0] > c[2] and lum(c) > 90

    frames = []
    for f in range(FRAMES):
        t = f / FRAMES
        frame = base.copy()

        # floating cubes
        for fl in floaters:
            fl.clear(frame)
        for fl in floaters:
            fl.draw(frame, t)

        # robot eyes pulse
        k = 0.5 + 0.5 * math.sin(2 * math.pi * t * 2)
        glow(frame, base, 15, 26, 3, (120, 255, 255), 0.9 * k, is_cyan)
        glow(frame, base, 23, 26, 3, (120, 255, 255), 0.9 * k, is_cyan)

        # robot hand core pulse
        k = 0.5 + 0.5 * math.sin(2 * math.pi * t * 2 + 1.5)
        glow(frame, base, 5, 109, 3, (255, 240, 160), 0.8 * k, is_warm)

        # brain pulse
        k = 0.5 + 0.5 * math.sin(2 * math.pi * t)
        for y in range(18, 44):
            for x in range(95, 126):
                if ((x - 110) / 16) ** 2 + ((y - 30) / 13) ** 2 <= 1:
                    c = base.getpixel((x, y))
                    if is_brain(c):
                        frame.putpixel((x, y), mix(c, (255, 120, 170), 0.45 * k))

        # twinkling stars
        for x, y, ph in stars:
            s = math.sin(2 * math.pi * (t * 2 + ph))
            if s > 0.85:
                sparkle(frame, x, y, 1, (255, 255, 220))
            elif s > 0.4:
                frame.putpixel((x, y), (190, 200, 255))

        # blinking cursor after "Laravel"
        if (f // 4) % 2 == 0:
            for y in range(59, 64):
                frame.putpixel((29, y), (255, 170, 80))

        # "AI generation" image being scanned
        sy = 82 + (f % 16)
        if sy <= 96:
            for x in range(104, 126):
                frame.putpixel((x, sy), mix(frame.getpixel((x, sy)), (160, 255, 255), 0.55))

        # blink
        if f in (12, 13) or f == 27:
            blink(frame, base, 49, 54, 64, 66, 65)
            blink(frame, base, 65, 70, 63, 65, 64)

        # smile sparkle
        if 20 <= f <= 23:
            sparkle(frame, 71, 76, 1 if f in (20, 23) else 2)

        frames.append(frame)

    # shared palette across all frames so colours don't flicker
    strip = Image.new("RGB", (SIZE, SIZE * FRAMES))
    for i, fr in enumerate(frames):
        strip.paste(fr, (0, i * SIZE))
    palette = strip.quantize(96, method=Image.MEDIANCUT, kmeans=2, dither=Image.Dither.NONE)

    out = [fr.quantize(palette=palette, dither=Image.Dither.NONE)
             .resize((SIZE * SCALE, SIZE * SCALE), Image.NEAREST)
           for fr in frames]
    out[0].save(OUT, save_all=True, append_images=out[1:], duration=FRAME_MS,
                loop=0, optimize=True, disposal=1)
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
