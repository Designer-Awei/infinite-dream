import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch();
for (const [w, h, name, m] of [[1897, 876, "pc", false], [844, 390, "phone", true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, deviceScaleFactor: m ? 2 : 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR " + e.message));
  await page.goto("http://localhost:8765/index.html"); await page.waitForTimeout(1800);
  await page.evaluate(() => { const app = __app; app.begin({ mode: "solo", pvp: false, seed: 3, players: [{ id: 1, cid: "claude", name: "T" }], myId: 1 }); const g = app.game; g.cardOffers[1] = ["hp_up", "fa_deepseek", "echo"]; app.me.cards = { atk_up: 2, crit: 1, fs_glm: 1 }; g.onUi("cards", 1); });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `/home/claude/game/tmp/cards_${name}.png` });
  await ctx.close();
}
await browser.close();
