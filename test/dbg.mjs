import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", (e) => console.log("PAGEERROR: " + e.message));
await page.goto("http://localhost:8765/index.html");
await page.waitForTimeout(2000);
await page.click("text=开始冒险");
for (const t of [600, 1200, 2000]) {
  await page.waitForTimeout(t === 600 ? 600 : 600);
  console.log(await page.evaluate(() => JSON.stringify(__app.game.fx.list.map(f => [f.meta.name, Math.round(f.options.x), Math.round(f.options.y), f.options.palette ? 'pal' : '']))));
}
await browser.close();
