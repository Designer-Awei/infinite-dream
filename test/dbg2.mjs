import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch(); const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(1500);
await p.evaluate(() => __app.startSolo()); await p.waitForTimeout(800);
const b = await p.locator("button:has-text('出发！')").count(); if (b) await p.click("button:has-text('出发！')"); await p.waitForTimeout(800);
await p.evaluate(() => (__dbg.input.atk = true)); await p.waitForTimeout(400);
console.log(await p.evaluate(() => { const i = document.querySelector(".s-atk .ico"), f = document.querySelector(".s-atk"); const cs = getComputedStyle(i); return JSON.stringify({ t: cs.transform, pos: cs.position, left: cs.left, w: cs.width, anim: cs.animationName, fw: getComputedStyle(f).width, disp: getComputedStyle(f).display, cls: f.className, parent: i.parentElement.className }); }));
await browser.close();
