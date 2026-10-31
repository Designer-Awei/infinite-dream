import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto("http://localhost:8765/index.html"); await page.waitForTimeout(2000);
const cid = process.argv[2] || "deepseek";
const frames = await page.evaluate(async (cid) => {
  const app = __app; app.begin({ mode: "solo", pvp: false, seed: 3, players: [{ id: 1, cid, name: "T" }], myId: 1 });
  const g = app.game, me = app.me; g.enemies.length = 0; g.waveDelay = 999;
  const cv = document.getElementById("view"); const out = [];
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (const [dx, dy] of dirs) for (let i = 0; i < 6; i++) {
    __dbg.input.mx = dx; __dbg.input.my = dy;
    await new Promise((r) => setTimeout(r, 70));
    const cam = __dbg.renderer.cam;
    const c = document.createElement("canvas"); c.width = 90; c.height = 90;
    c.getContext("2d").drawImage(cv, Math.round(me.x - cam.x - 45), Math.round(me.y - cam.y - 70), 90, 90, 0, 0, 90, 90);
    out.push(c.toDataURL());
  }
  __dbg.input.mx = 0; __dbg.input.my = 0;
  return out;
}, cid);
const fs = require("fs"); fs.mkdirSync("/home/claude/game/tmp/anim", { recursive: true });
frames.forEach((d, i) => fs.writeFileSync(`/home/claude/game/tmp/anim/f${String(i).padStart(2, "0")}.png`, Buffer.from(d.split(",")[1], "base64")));
await browser.close();
