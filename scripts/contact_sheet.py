"""Build one labeled contact sheet from crops of theme screenshots."""
from PIL import Image, ImageDraw

CROPS = [
    ("rosewood top-left (box overflow?)", "/tmp/render/full-rosewood.png", (0, 0, 620, 130)),
    ("sunset top-right (NOW SPINNING + toolbar)", "/tmp/render/full-sunset.png", (1160, 0, 1600, 130)),
    ("violet bottom (HUD + cards)", "/tmp/render/full-violet.png", (0, 830, 1600, 972)),
    ("aurora bottom (pill over content)", "/tmp/render/full-aurora.png", (380, 850, 1220, 972)),
    ("ocean dock", "/tmp/render/full-ocean.png", (380, 820, 1220, 972)),
    ("coffee tuner row", "/tmp/render/full-coffee.png", (0, 78, 1600, 145)),
]

PAD = 6
LABEL_H = 22
imgs = []
for label, path, box in CROPS:
    im = Image.open(path).crop(box)
    scale = 1400 / im.width if im.width > 1400 else 1
    if scale != 1:
        im = im.resize((int(im.width * scale), int(im.height * scale)))
    imgs.append((label, im))

total_h = sum(im.height + LABEL_H + PAD for _, im in imgs) + PAD
sheet = Image.new("RGB", (1412, total_h), (24, 24, 27))
draw = ImageDraw.Draw(sheet)
y = PAD
for label, im in imgs:
    draw.text((8, y + 4), label, fill=(255, 210, 120))
    y += LABEL_H
    sheet.paste(im, (PAD, y))
    draw.rectangle([PAD - 1, y - 1, PAD + im.width, y + im.height], outline=(80, 80, 90))
    y += im.height + PAD
sheet.save("/tmp/render/contact-sheet.png")
print("saved", sheet.size)
