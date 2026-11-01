import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(200);
await p.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tutorialSeen: true, chars: ["deepseek", "gpt"], stats: { runs: 2 }, maps: { grass: 1, ice: 1 }, playMode: { map: "grass" } })));
await p.reload(); await p.waitForTimeout(2200);
const box = await p.locator(".lm-track").boundingBox();
const on = () => p.evaluate(() => document.querySelector(".lm-track .mcard.on").dataset.id);
console.log("start", await on());
for (const dx of [-120, -120, 140]) {
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down();
  for (let i = 1; i <= 8; i++) await p.mouse.move(box.x + box.width / 2 + (dx * i) / 8, box.y + box.height / 2);
  await p.mouse.up(); await p.waitForTimeout(800);
  console.log("drag", dx, "->", await on(), JSON.stringify(await p.evaluate(() => JSON.parse(localStorage.getItem("ai-girls-dungeon-v1")).playMode)));
}
await p.screenshot({ path: "/home/claude/game/tmp/drag_1280.png" });
await b.close();
