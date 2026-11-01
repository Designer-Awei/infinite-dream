# Head-shot crops of the heroes (loadout page, app icon, loading screen): a square that keeps the whole
# head, from the very top (hair / hat / horns) down to the neck, centred on the face (between the eyes).
from PIL import Image
ROOT = __file__.rsplit("/tools/", 1)[0]
# face centre x, head top y, neck y (px in hero_<id>.png)
FACE = {"deepseek": (178, 4, 232), "gpt": (202, 2, 222), "grok": (150, 0, 214), "claude": (165, 2, 205), "doubao": (124, 12, 200), "glm": (170, 2, 205)}
def head(cid, k=1.12):
    im = Image.open(f"{ROOT}/web/assets/hero_{cid}.png").convert("RGBA")
    cx, top, neck = FACE[cid]
    side = int((neck - top) * k)
    x0, y0 = int(round(cx - side / 2)), int(round(top - side * 0.04))
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.alpha_composite(im, (-x0, -y0))
    return out
if __name__ == "__main__":
    for cid in FACE:
        head(cid).resize((128, 128), Image.LANCZOS).save(f"{ROOT}/web/assets/head_{cid}.png", optimize=True)
    print("ok")
