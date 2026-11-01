# Re-subsets the Cubic 11 pixel font to every character used by the game's web sources (keeps the woff small).
# usage: python3 tools/subset_font.py /path/to/Cubic_11.ttf
import glob, sys
from fontTools import subset
from fontTools.ttLib import TTFont
src = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/ext/fonts/Cubic-11/fonts/ttf/Cubic_11.ttf"
chars = set(chr(c) for c in range(0x20, 0x7F))
for p in glob.glob("web/**/*", recursive=True):
    if p.endswith((".js", ".html", ".css", ".json", ".webmanifest")) and "vendor" not in p and "fxmods" not in p:
        chars |= set(open(p, encoding="utf-8").read())
chars = {c for c in chars if ord(c) >= 0x20}
font = TTFont(src)
cmap = font.getBestCmap()
have = sorted(c for c in chars if ord(c) in cmap)
miss = sorted(c for c in chars if ord(c) not in cmap and ord(c) > 0x7F)
opt = subset.Options(); opt.flavor = "woff"; opt.layout_features = ["*"]
sub = subset.Subsetter(opt); sub.populate(unicodes=[ord(c) for c in have]); sub.subset(font)
font.flavor = "woff"; font.save("web/assets/font/Cubic_11.woff")
print(len(have), "glyphs kept; not in font:", "".join(c for c in miss if not (0x1F000 <= ord(c) <= 0x1FFFF))[:120])
