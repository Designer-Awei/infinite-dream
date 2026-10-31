import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR " + e.message));
await page.goto("http://localhost:8765/index.html"); await page.waitForTimeout(2000);
console.log(await page.evaluate(() => {
  const app = __app; app.begin({ mode: "solo", pvp: true, seed: 7, players: [{ id: 1, cid: "grok", name: "A" }, { id: 2, cid: "glm", name: "B" }], myId: 1 });
  const g = app.game, a = g.player(1), b = g.player(2); const o = [];
  a.input.atk = true;
  for (let i = 0; i < 300; i++) { b.x = a.x + 80; b.y = a.y; g.update(1 / 60); if (i % 60 === 0) o.push([a.x|0, a.y|0, a.target && a.target.id, g.bullets.length, b.hp, b.shield, b.pvpAcc.toFixed(2), b.invuln.toFixed(2)].join(",")); }
  return o.join("\n");
}));
await browser.close();
