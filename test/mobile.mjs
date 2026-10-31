import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium, devices } = require("playwright");
const out = "/home/claude/game/tmp/mobile"; require("fs").mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto("http://localhost:8765/index.html");
await page.waitForTimeout(2500);
await page.screenshot({ path: out + "/lobby.png" });
await page.tap("text=开始冒险");
await page.waitForTimeout(600);
await page.screenshot({ path: out + "/tutorial.png" });
if (await page.locator("button:has-text('出发！')").count()) await page.tap("button:has-text('出发！')");
await page.waitForTimeout(2500);
// press attack via touch events on the attack button
const cdp = await ctx.newCDPSession(page);
const box = await page.locator(".b-atk").boundingBox();
const tp = (type, pts) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });
await tp("touchStart", [{ x: 150, y: 300, id: 1 }, { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 2 }]);
for (let i = 0; i < 10; i++) { await tp("touchMove", [{ x: 150 + i * 5, y: 290 - i * 2, id: 1 }, { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 2 }]); await page.waitForTimeout(100); }
await page.screenshot({ path: out + "/game.png" });
await tp("touchEnd", []);
await page.waitForTimeout(500);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await page.screenshot({ path: out + "/portrait.png" });
console.log(errs.join("\n"));
await browser.close();
