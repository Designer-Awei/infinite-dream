import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch();
for (const [w, h, m] of [[844, 390, true], [1280, 720, false]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tutorialSeen: true })));
  await p.reload(); await p.waitForTimeout(1800);
  await p.evaluate(() => __app.startSolo()); await p.waitForTimeout(1500);
  const b = await p.locator(".pausebtn").boundingBox();
  const top = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.className + " <" + e.tagName : "none"; }, [b.x + b.width / 2, b.y + b.height / 2]);
  if (m) await p.tap(".pausebtn", { force: true }); else await p.click(".pausebtn", { force: true });
  await p.waitForTimeout(500);
  console.log(m ? "phone" : "pc", "box", JSON.stringify(b), "top elem:", top, "pause modal:", await p.locator(".pause-modal").count());
  await ctx.close();
}
await browser.close();
