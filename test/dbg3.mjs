import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(300);
await p.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tokens: 300, sel: "deepseek", tutorialSeen: true })));
await p.reload(); await p.waitForTimeout(1500);
await p.evaluate(() => __app.startSolo()); await p.waitForTimeout(1200);
await p.evaluate(() => { __dbg.input.atk = true; }); await p.waitForTimeout(500);
console.log(await p.evaluate(() => { const f = document.querySelector(".s-atk"), i = f.querySelector(".ico"), fa = f.querySelector(".bface"); const r = (e) => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round).join(","); }; return JSON.stringify({ f: r(f), face: r(fa), ico: r(i), t: getComputedStyle(i).transform, an: getComputedStyle(i).animationName, cls: f.className }); }));
await browser.close();
