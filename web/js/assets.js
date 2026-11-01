// Loads images and prepares the sprite canvases the renderer draws from.
import { CHAR_ORDER, ELEM, CHARS, SPR_K } from "./data.js";

export const A = { girls: {}, critters: {}, portraits: {}, ready: false };

function img(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("load " + src));
    i.src = src;
  });
}
const json = (src) => fetch(src).then((r) => r.json());

function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
/** A copy of a canvas/image region with every opaque pixel set to one color. */
export function silhouette(src, color, sx = 0, sy = 0, w = src.width, h = src.height) {
  const c = canvas(w, h), g = c.getContext("2d");
  g.drawImage(src, sx, sy, w, h, 0, 0, w, h);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  return c;
}
function crop(src, sx, sy, w, h, flip = false) {
  const c = canvas(w, h), g = c.getContext("2d");
  if (flip) {
    g.translate(w, 0);
    g.scale(-1, 1);
  }
  g.drawImage(src, sx, sy, w, h, 0, 0, w, h);
  return c;
}
// tight vertical bounds so feet sit on the anchor
function bounds(c) {
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let y0 = c.height, y1 = 0, x0 = c.width, x1 = 0;
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++)
      if (d[(y * c.width + x) * 4 + 3] > 10) {
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
      }
  return { x0, y0, x1, y1 };
}

export async function loadAll(progress = () => {}) {
  const base = "assets/";
  const [gj, gi, cj] = await Promise.all([json(base + "girls.json"), img(base + "girls.png"), json(base + "critters/critters.json")]);
  progress(0.3);
  for (const id of CHAR_ORDER) {
    const fr = gj.frames[id], views = {};
    for (const v of ["front", "back", "side"]) {
      const [x, y, w, h] = fr[v];
      views[v] = crop(gi, x, y, w, h);
      if (v === "side") views.sideL = crop(gi, x, y, w, h, true);
    }
    const b = bounds(views.front);
    const set = { w: gj.cw, h: gj.ch, foot: b.y1 + 1, top: b.y0, k: SPR_K, views, white: {}, tint: {} };
    for (const v of ["front", "back", "side", "sideL"]) {
      set.white[v] = silhouette(views[v], "#ffffff");
      set.tint[v] = silhouette(views[v], ELEM[CHARS[id].elem].glow);
    }
    A.girls[id] = set;
  }
  progress(0.5);
  const names = Object.keys(cj);
  const imgs = await Promise.all(names.map((n) => img(base + "critters/" + n + ".png")));
  names.forEach((n, i) => {
    const m = cj[n];
    A.critters[n] = { ...m, img: imgs[i], white: silhouette(imgs[i], "#ffffff"), red: silhouette(imgs[i], "#ff5050"), blue: silhouette(imgs[i], "#bfefff") };
  });
  progress(0.8);
  const ps = await Promise.all(CHAR_ORDER.map((id) => img(base + "portrait_" + id + ".png")));
  CHAR_ORDER.forEach((id, i) => (A.portraits[id] = ps[i]));
  try {
    await document.fonts.load("12px Cubic");
  } catch {}
  progress(1);
  A.ready = true;
}
