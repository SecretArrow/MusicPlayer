"""Combine view screenshots into contact sheets (2 cols)."""
import sys
from PIL import Image, ImageDraw

def sheet(paths, out, cols=2, width=690):
    imgs = []
    for p in paths:
        im = Image.open(p)
        s = width / im.width
        imgs.append(im.resize((width, int(im.height * s)), Image.LANCZOS))
    rows = (len(imgs) + cols - 1) // cols
    cell_h = max(im.height for im in imgs) + 20
    W = cols * width + (cols + 1) * 8
    H = rows * cell_h + 8
    canvas = Image.new("RGB", (W, H), (20, 20, 24))
    d = ImageDraw.Draw(canvas)
    for i, im in enumerate(imgs):
        r, c = divmod(i, cols)
        x = 8 + c * (width + 8)
        y = 8 + r * cell_h
        d.text((x + 4, y + 2), paths[i].split("/")[-1], fill=(255, 210, 120))
        canvas.paste(im, (x, y + 18))
    canvas.save(out)
    print("saved", out, canvas.size)

if __name__ == "__main__":
    out = sys.argv[1]
    sheet(sys.argv[2:], out)
