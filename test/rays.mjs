import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch(); const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(300);
await p.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tokens: 3000, tutorialSeen: true })));
await p.reload(); await p.waitForTimeout(1500);
await p.click(".t-gacha"); await p.waitForTimeout(500);
await p.click(".pull-btn >> nth=0"); await p.waitForTimeout(1200);
for (let i = 0; i < 4; i++) { console.log(await p.evaluate(() => { const r = document.querySelector(".pv-rays").getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)].join(","); })); await p.waitForTimeout(700); }
await browser.close();
