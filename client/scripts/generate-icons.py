"""One-time asset generator: PWA icons from the brand bolt (needs Pillow)."""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public"

BG = (5, 5, 8)
TEAL = (0, 245, 212)
EMERALD = (16, 185, 129)


def bolt(draw, s: int):
    k = s / 64
    pts = [(35, 8), (18, 36), (29, 36), (27, 56), (44, 28), (33, 28), (37, 8)]
    draw.polygon([(x * k, y * k) for x, y in pts], fill=TEAL)


for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    bolt(d, size)
    img.save(OUT / name, optimize=True)
    print("wrote", name)
