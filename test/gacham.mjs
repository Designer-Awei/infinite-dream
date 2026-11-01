import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const W = +(process.argv[2] || 844), H = +(process.argv[3] || 390);
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const p = await ctx.newPage(); p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(300);
await p.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tutorialSeen: true, tokens: 5000, talents: { t_dmg: 2, t_revive: 1 } })));
await p.reload(); await p.waitForTimeout(1500);
await p.tap(".t-gacha"); await p.waitForTimeout(1500);
await p.screenshot({ path: `/home/claude/game/tmp/g_main_${W}.png` });
const shot = async (n) => p.screenshot({ path: `/home/claude/game/tmp/g_${n}_${W}.png` });
if (await p.$(".gp-poolbtn")) { await p.tap(".gp-poolbtn"); await p.waitForTimeout(700); await shot("pool"); await p.evaluate(() => document.querySelector(".pool-modal .x-btn")?.click()); await p.waitForTimeout(400); }
if (await p.$(".fcard")) { await p.tap(".fcard >> nth=0"); await p.waitForTimeout(1600); await shot("prev0"); await p.waitForTimeout(1500); await shot("prev0b"); await p.evaluate(() => document.querySelector(".pv-modal")?.click()); await p.waitForTimeout(300);
  await p.tap(".fcard >> nth=1"); await p.waitForTimeout(2200); await shot("prev1"); await p.evaluate(() => document.querySelector(".pv-modal")?.click()); await p.waitForTimeout(300);
  await p.tap(".fcard >> nth=2"); await p.waitForTimeout(2200); await shot("prev2"); await p.evaluate(() => document.querySelector(".pv-modal")?.click()); await p.waitForTimeout(300); }
await p.tap(".pull-btn >> nth=0"); await p.waitForSelector(".pull-ov", { timeout: 4000 }); 
for (let i = 0; i < 14; i++) { await p.waitForTimeout(500); const ov = await p.$(".pull-ov"); if (!ov) break; await p.mouse.click(W / 2, H / 2); if (i == 5) await shot("single"); }
await browser.close();
