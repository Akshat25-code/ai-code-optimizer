"""One-time asset generator: client/public/og-image.png (1200x630 social preview).

Reproducible: python client/scripts/generate-og-image.py  (needs Pillow)
Uses Windows Arial; on other OSes falls back to Pillow's default font.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "public" / "og-image.png"
W, H = 1200, 630
BG = (4, 16, 31)
TEAL = (232, 184, 75)
WHITE = (241, 245, 249)
MUTED = (143, 161, 184)


def load(size: int, bold: bool = False):
    for path in (
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img)
# gold accent bar + deep-navy corner depth (flat circles, cheap)
d.rectangle([0, 0, W, 14], fill=TEAL)
d.ellipse([W - 420, -160, W + 120, 380], fill=(18, 35, 60))
d.ellipse([-200, H - 320, 340, H + 220], fill=(8, 22, 39))
# prism rays (gold / forest / silver) at right
d.line([(880, 315), (1090, 200)], fill=TEAL, width=14)
d.line([(880, 315), (1090, 315)], fill=(62, 207, 142), width=14)
d.line([(880, 315), (1090, 430)], fill=MUTED, width=14)
d.text((90, 170), "AI Code Optimizer", font=load(96, bold=True), fill=WHITE)
d.text((90, 300), "Ship faster code, proven correct.", font=load(52, bold=True), fill=TEAL)
d.text((90, 400), "Static analysis, AI review, and sandboxed", font=load(38), fill=MUTED)
d.text((90, 452), "execution proof — free to start.", font=load(38), fill=MUTED)
d.text((90, 545), "aicodeoptimizerpromax.com", font=load(30), fill=MUTED)
img.save(OUT, optimize=True)
print("wrote", OUT, OUT.stat().st_size, "bytes")
