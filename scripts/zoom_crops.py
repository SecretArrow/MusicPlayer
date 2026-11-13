"""Zoom crops for precise overlap checks."""
from PIL import Image, ImageDraw

CROPS = [
    ("rosewood brand plate 2x", "/tmp/render/full-rosewood.png", (10, 20, 300, 110), 2),
    ("violet card bottom edge 2x", "/tmp/render/full-violet.png", (100, 750, 700, 880), 2),
]

PAD = 6
LABEL_H = 22
imgs = []
for label, path, box, scale in CROPS:
    im = Image.open(path).crop(box)
    im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    imgs.append((label, im))

total_h = sum(im.height + LABEL_H + PAD for _, im in imgs) + PAD
sheet = Image.new("RGB", (1420, total_h), (24, 24, 27))
draw = ImageDraw.Draw(sheet)
y = PAD
for label, im in imgs:
    draw.text((8, y + 4), label, fill=(255, 210, 120))
    y += LABEL_H
    sheet.paste(im, (PAD, y))
    y += im.height + PAD
sheet.save("/tmp/render/zoom-sheet.png")
print("saved", sheet.size)
