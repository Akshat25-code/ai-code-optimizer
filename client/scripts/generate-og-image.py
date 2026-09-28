"""One-time asset generator: client/public/og-image.png (1200x630 social preview).

Reproducible: python client/scripts/generate-og-image.py  (needs Pillow)
Uses Windows Arial; on other OSes falls back to Pillow's default font.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "public" / "og-image.png"
W, H = 1200, 630
BG = (5, 5, 8)
TEAL = (0, 245, 212)
WHITE = (245, 245, 247)
MUTED = (160, 160, 175)


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
# teal accent bar + soft corner glow (flat circles, cheap)
d.rectangle([0, 0, W, 14], fill=TEAL)
d.ellipse([W - 420, -160, W + 120, 380], fill=(0, 60, 55))
d.ellipse([-200, H - 320, 340, H + 220], fill=(0, 45, 60))
d.text((90, 170), "AI Code Optimizer", font=load(96, bold=True), fill=WHITE)
d.text((90, 300), "Analyze  •  Optimize  •  Verify", font=load(52, bold=True), fill=TEAL)
d.text((90, 400), "Static analysis, AI review, and sandboxed", font=load(38), fill=MUTED)
d.text((90, 452), "execution proof — free to start.", font=load(38), fill=MUTED)
d.text((90, 545), "aicodeoptimizerpromax.com", font=load(30), fill=MUTED)
img.save(OUT, optimize=True)
print("wrote", OUT, OUT.stat().st_size, "bytes")
