import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch();
for (const [w, h, name] of [[1280, 720, "pc"], [844, 390, "phone"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => console.log("PAGEERROR " + e.message));
  await page.goto("http://localhost:8765/index.html"); await page.waitForTimeout(2000);
  await page.evaluate(() => { const app = __app; app.begin({ mode: "solo", pvp: false, seed: 3, players: [{ id: 1, cid: "claude", name: "T" }], myId: 1 }); const g = app.game; g.cardOffers[1] = ["fa_deepseek", "fs_glm", "reaction_amp"]; g.onUi("cards", 1); });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `/home/claude/game/tmp/cards_${name}.png` });
  await page.close();
}
await browser.close();
