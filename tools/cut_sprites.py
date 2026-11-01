# Cut the six AI girls out of the 3x2 design sheets, remove the blurred background,
# and produce game sprites (~38px tall) plus larger portraits.
import sys, numpy as np
from PIL import Image
from scipy import ndimage
from collections import deque

SRC = sys.argv[1]; OUT = sys.argv[2]
NAMES = ['deepseek','grok','claude','gpt','doubao','glm']
VIEWS = {'front':'ai-girls-front-3x2-v1.png','back':'ai-girls-back-3x2-v1.png','side':'ai-girls-side-right-3x2-v1.png'}

def bg_mask(a):
    # region-grow from the border through smooth, low-contrast steps
    h, w, _ = a.shape
    a = a.astype(np.int32)
    bg = np.zeros((h, w), bool)
    q = deque()
    for x in range(w):
        for y in (0, h-1):
            bg[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w-1):
            bg[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        c = a[y, x]
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx]:
                d = np.abs(a[ny, nx]-c).sum()
                if d < 14:
                    bg[ny, nx] = True; q.append((ny, nx))
    return bg

def process(view, fname):
    im = Image.open(f'{SRC}/{fname}').convert('RGB')
    W, H = im.size; cw, ch = W//3, H//2
    res = {}
    for i, n in enumerate(NAMES):
        cx, cy = (i%3)*cw, (i//3)*ch
        cell = np.array(im.crop((cx, cy, cx+cw, cy+ch)))
        # speed: grow on half res then upscale
        small = np.array(Image.fromarray(cell).resize((cw//2, ch//2), Image.NEAREST))
        bgs = bg_mask(small)
        bg = np.array(Image.fromarray(bgs.astype(np.uint8)*255).resize((cw, ch), Image.NEAREST)) > 127
        fg = ~bg
        # keep largest components (character + detached bits that are big)
        lab, nl = ndimage.label(fg)
        sizes = ndimage.sum(fg, lab, range(1, nl+1))
        keep = np.zeros_like(fg)
        if nl:
            mx = sizes.max()
            for k, s in enumerate(sizes, 1):
                if s > mx*0.04: keep |= lab == k
        fg = ndimage.binary_fill_holes(keep) & ~(bg & ~ndimage.binary_fill_holes(keep))
        fg = keep | (ndimage.binary_fill_holes(keep) & ~bg)
        rgba = np.dstack([cell, (fg*255).astype(np.uint8)])
        ys, xs = np.where(fg)
        y0, y1, x0, x1 = ys.min(), ys.max()+1, xs.min(), xs.max()+1
        res[n] = Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')
    return res

def hires(img, th):
    # high-res sprite: premultiplied area/lanczos downscale, crisp alpha, keeps the original colors
    w, h = img.size; tw = max(1, round(w*th/h))
    arr = np.array(img).astype(np.float32)
    a = arr[..., 3:4]/255
    prem = Image.fromarray(np.dstack([arr[..., :3]*a, a*255]).astype(np.uint8), 'RGBA')
    sm = np.array(prem.resize((tw, th), Image.LANCZOS)).astype(np.float32)
    al = np.clip(sm[..., 3], 0, 255)/255
    rgb = np.where(al[..., None] > 0.01, sm[..., :3]/np.maximum(al[..., None], 1e-3), 0)
    mask = al > 0.5
    out = np.zeros((th+2, tw+2, 4), np.uint8)
    out[1:-1, 1:-1, :3] = np.clip(rgb, 0, 255); out[1:-1, 1:-1, 3] = mask*255
    m = out[..., 3] > 0
    ring = ndimage.binary_dilation(m) & ~m
    out[ring] = (22, 16, 30, 255)
    return Image.fromarray(out, 'RGBA')

def pixelize(img, th):
    # downscale to target height th with box filter, binarize alpha, quantize, re-outline
    w, h = img.size; tw = max(1, round(w*th/h))
    arr = np.array(img).astype(np.float32)
    a = arr[..., 3:4]/255
    prem = Image.fromarray(np.dstack([arr[..., :3]*a, a*255]).astype(np.uint8), 'RGBA')
    sm = np.array(prem.resize((tw, th), Image.BOX)).astype(np.float32)
    al = sm[..., 3]/255
    rgb = np.where(al[..., None] > 0.01, sm[..., :3]/np.maximum(al[..., None], 1e-3), 0)
    mask = al > 0.45
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    q = Image.fromarray(rgb).quantize(colors=24, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    rgb = np.array(q)
    out = np.zeros((th+2, tw+2, 4), np.uint8)
    out[1:-1, 1:-1, :3] = rgb; out[1:-1, 1:-1, 3] = mask*255
    m = out[..., 3] > 0
    ring = ndimage.binary_dilation(m) & ~m
    out[ring] = (22, 16, 30, 255)
    return Image.fromarray(out, 'RGBA')

allv = {v: process(v, f) for v, f in VIEWS.items()}
import json, os
os.makedirs(OUT, exist_ok=True)
# portraits (front, ~150px tall, crisp)
for n in NAMES:
    p = allv['front'][n]; w, h = p.size
    p.resize((round(w*150/h), 150), Image.LANCZOS).save(f'{OUT}/portrait_{n}.png')
for v in VIEWS:
    for n in NAMES:
        allv[v][n].save(f'{OUT}/raw_{v}_{n}.png')
TH = int(sys.argv[3]) if len(sys.argv) > 3 else 38
meta = {}
cells = []
for n in NAMES:
    for v in VIEWS:
        cells.append((n, v, (hires if len(sys.argv) > 4 and sys.argv[4] == 'hires' else pixelize)(allv[v][n], TH)))
CW = max(c[2].size[0] for c in cells); CH = max(c[2].size[1] for c in cells)
atlas = Image.new('RGBA', (CW*3, CH*6), (0,0,0,0))
for k, (n, v, im) in enumerate(cells):
    r, c = k//3, k%3
    x = c*CW + (CW-im.size[0])//2; y = r*CH + (CH-im.size[1])
    atlas.paste(im, (x, y))
    meta.setdefault(n, {})[v] = [c*CW, r*CH, CW, CH]
atlas.save(f'{OUT}/girls.png')
json.dump({'cw': CW, 'ch': CH, 'frames': meta}, open(f'{OUT}/girls.json', 'w'))
print('atlas', atlas.size, CW, CH)
