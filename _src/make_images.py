"""Make the smaller image files the site serves to phones and fast browsers.

Run after adding or replacing a photo or the footer seal:  python3 _src/make_images.py
Then rebuild:  python3 _src/build.py --launch

- assets/photos/<name>-<width>.webp for each photo, so phones download a small copy instead of the full JPG.
- assets/logo-seal-168.png, the footer seal at the size it is shown (the 512px original stays for Google and sharing).
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, "assets", "photos")
WIDTHS = (640, 1024, 1600)


def photo_variants():
    for fn in sorted(os.listdir(PHOTOS)):
        name, ext = os.path.splitext(fn)
        if ext.lower() not in (".jpg", ".jpeg", ".png") or "-" in name and name.rsplit("-", 1)[1].isdigit():
            continue
        with Image.open(os.path.join(PHOTOS, fn)) as im:
            im = im.convert("RGB")
            w, h = im.size
            for tw in WIDTHS:
                if tw > w:
                    tw = w
                out = os.path.join(PHOTOS, f"{name}-{tw}.webp")
                im.resize((tw, round(h * tw / w)), Image.LANCZOS).save(out, "WEBP", quality=78, method=6)
                if tw == w:
                    break


def footer_seal():
    with Image.open(os.path.join(ROOT, "assets", "logo-seal.png")) as im:
        small = im.resize((168, 168), Image.LANCZOS).quantize(colors=64, method=Image.FASTOCTREE)
        small.save(os.path.join(ROOT, "assets", "logo-seal-168.png"), optimize=True)


if __name__ == "__main__":
    photo_variants()
    footer_seal()
    print("Made the small image files.")
