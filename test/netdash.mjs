import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 620 } });
const A = await ctx.newPage(), B = await ctx.newPage();
for (const [n, p] of [["A", A], ["B", B]]) p.on("pageerror", (e) => console.log(n, "PAGEERROR", e.message));
await A.goto("http://localhost:8765/index.html?local"); await B.goto("http://localhost:8765/index.html?local");
await A.waitForTimeout(2000);
await A.click(".t-net"); await A.waitForTimeout(300);
await A.click("button:has-text('合作闯关')"); await A.waitForTimeout(800);
const code = await A.locator(".code").textContent();
await B.click(".t-net"); await B.waitForTimeout(300);
await B.fill(".code-in", code); await B.click("button:has-text('加入')"); await B.waitForTimeout(1200);
await B.click(".mychars >> text=小龙娘"); await B.waitForTimeout(400);
await A.click("text=出发！"); await A.waitForTimeout(2500);
// client B: run in circles and dash every 0.6s
await B.evaluate(() => { const i = __dbg.input; let t = 0; setInterval(() => { t += 0.05; i.mx = Math.cos(t); i.my = Math.sin(t); if (Math.random() < 0.09) i.pressed.dash = true; }, 50); });
let worst = 0, sum = 0, n = 0;
for (let k = 0; k < 40; k++) {
  await A.waitForTimeout(250);
  const a = await A.evaluate(() => { const p = __app.game.player(2); return [p.x, p.y]; });
  const b = await B.evaluate(() => [__app.me.x, __app.me.y, __app.me.dashT > 0]);
  const d = Math.hypot(a[0] - b[0], a[1] - b[1]); worst = Math.max(worst, d); sum += d; n++;
}
console.log("host-vs-client offset avg", (sum / n).toFixed(1), "worst", worst.toFixed(1));
await browser.close();
