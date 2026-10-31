// Pre-render pixelfx critters into trimmed sprite strips for enemies.
import { writeFileSync, mkdirSync } from "node:fs";
const PFX = process.argv[2], OUT = process.argv[3];
const core = await import(PFX + "/src/core/index.js");
const { encodePNG } = await import(PFX + "/tools/lib/png.mjs");
const { createFrame, clearFrame, createFx, composite } = core;
mkdirSync(OUT, { recursive: true });

// id, file name, options, fps
const LIST = [
  ["critters/slime", "slime", {}],
  ["critters/slime", "slime_blue", { palette: ["#0a0c1e", "#141f45", "#1d3a7a", "#2a63b8", "#45a0e8", "#9adcff", "#f0fbff"] }],
  ["critters/slime", "slime_purple", { palette: ["#140a1e", "#2c1240", "#4d1f6e", "#7a33a8", "#b05be0", "#e0a6ff", "#fff0ff"] }],
  ["critters/bat", "bat", {}],
  ["critters/eyeball", "eyeball", {}],
  ["critters/ghost", "ghost", {}],
  ["critters/wisp", "wisp", {}],
  ["critters/flying-skull", "skull", {}],
  ["critters/frog", "frog", {}],
  ["critters/jellyfish", "jelly", {}],
  ["critters/snake", "snake", {}],
];
const manifest = {};
for (const [id, name, opts] of LIST) {
  const mod = await import(PFX + "/src/fx/" + id + ".js");
  const m = mod.meta, [W, H] = m.size, [ox, oy] = m.origin;
  const fps = 12, n = Math.max(1, Math.round(m.duration * fps));
  const fx = createFx(mod, { x: ox, y: oy, seed: 3, ...opts });
  const f = createFrame(W, H);
  const frames = [];
  // warm up simulated critters
  for (let i = 0; i < 24; i++) fx.update(1 / 120);
  for (let i = 0; i < n; i++) {
    clearFrame(f);
    fx.draw(f);
    const px = new Uint8ClampedArray(W * H * 4);
    // drop the faint ambient glow round the creature (keeps hot cores)
    for (let k = 0; k < W * H; k++) {
      const c = f.color[k] >>> 24, l = f.light[k];
      const lm = Math.max(l & 255, (l >>> 8) & 255, (l >>> 16) & 255);
      if (c === 0 && lm < 110) f.light[k] = 0;
    }
    composite(f, px, null, 0.8);
    frames.push(px);
    fx.update(1 / fps);
  }
  // union bbox of opaque-ish pixels
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const px of frames) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (px[(y * W + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  x0 = Math.max(0, x0 - 1); y0 = Math.max(0, y0 - 1); x1 = Math.min(W - 1, x1 + 1); y1 = Math.min(H - 1, y1 + 1);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const out = new Uint8ClampedArray(cw * n * ch * 4);
  frames.forEach((px, i) => {
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
      const s = ((y + y0) * W + x + x0) * 4, d = (y * cw * n + i * cw + x) * 4;
      out[d] = px[s]; out[d + 1] = px[s + 1]; out[d + 2] = px[s + 2]; out[d + 3] = px[s + 3];
    }
  });
  writeFileSync(`${OUT}/${name}.png`, encodePNG(cw * n, ch, out));
  manifest[name] = { w: cw, h: ch, n, fps, ox: ox - x0, oy: oy - y0 };
  console.log(name, cw, ch, n);
}
writeFileSync(`${OUT}/critters.json`, JSON.stringify(manifest));
