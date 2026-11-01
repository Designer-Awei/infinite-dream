# App / PWA / iOS icons from DeepSeek 鲸鱼娘's head shot (tools/heads.py framing) on a deep-sea gradient.
import sys
from PIL import Image, ImageDraw, ImageFilter
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from heads import head
ROOT = __file__.rsplit("/tools/", 1)[0]
S = 1024
bg = Image.new("RGBA", (S, S))
d = ImageDraw.Draw(bg)
for y in range(S):  # vertical gradient: light sea blue -> deep navy
    t = y / S
    c = tuple(int(a + (b - a) * t) for a, b in zip((236, 248, 255), (110, 196, 248)))
    d.line([(0, y), (S, y)], fill=c + (255,))
glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse([S * 0.12, S * 0.1, S * 0.88, S * 0.86], fill=(255, 255, 255, 90))
bg.alpha_composite(glow.filter(ImageFilter.GaussianBlur(S * 0.08)))
h = head("deepseek", 1.12)
hs = S  # the crop fills the icon: its edges are the icon edges
h = h.resize((hs, hs), Image.LANCZOS)
# soft dark rim so the character reads on the gradient
sh = Image.new("RGBA", h.size, (10, 20, 60, 0))
sh.putalpha(h.getchannel("A").filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.55)))
bg.alpha_composite(sh, (0, 8))
bg.alpha_composite(h, (0, 0))
full = bg
def rounded(img, r):
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], r, fill=255)
    o = img.copy(); o.putalpha(m); return o
def circle(img):
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).ellipse([0, 0, img.size[0] - 1, img.size[1] - 1], fill=255)
    o = img.copy(); o.putalpha(m); return o
full.convert("RGB").save(ROOT + "/app/ios/AppIcon-1024.png")
rounded(full.resize((512, 512), Image.LANCZOS), 96).save(ROOT + "/app/icon.png")
for name, px in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
    im = full.resize((px, px), Image.LANCZOS)
    rounded(im, int(px * 0.18)).save(f"{ROOT}/app/res/mipmap-{name}/ic_launcher.png")
    circle(im).save(f"{ROOT}/app/res/mipmap-{name}/ic_launcher_round.png")
full.resize((192, 192), Image.LANCZOS).convert("RGB").save(ROOT + "/web/assets/icon-192.png")
full.resize((512, 512), Image.LANCZOS).convert("RGB").save(ROOT + "/web/assets/icon-512.png")
print("icons written")
