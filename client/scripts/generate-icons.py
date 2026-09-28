"""One-time asset generator: PWA icons with the prism mark (needs Pillow)."""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public"

BG = (4, 16, 31)
SILVER = (199, 210, 224)
GOLD = (232, 184, 75)
FOREST = (62, 207, 142)


def prism(draw, s: int):
    k = s / 64
    w = max(2, int(3 * k))

    def line(a, b, fill):
        draw.line([(a[0] * k, a[1] * k), (b[0] * k, b[1] * k)], fill=fill, width=w)

    line((4, 32), (24, 32), SILVER)
    draw.polygon([(24 * k, 20 * k), (24 * k, 44 * k), (42 * k, 32 * k)],
                 outline=SILVER)
    # re-trace polygon edges at width (PIL outline is 1px)
    for a, b in [((24, 20), (24, 44)), ((24, 44), (42, 32)), ((42, 32), (24, 20))]:
        line(a, b, SILVER)
    line((42, 32), (60, 22), GOLD)
    line((42, 32), (60, 32), FOREST)
    line((42, 32), (60, 42), SILVER)


for size, name in ((192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")):
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)
    prism(d, size)
    img.save(OUT / name, optimize=True)
    print("wrote", name)
