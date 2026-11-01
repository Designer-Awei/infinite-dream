import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const sizes = [[804, 360], [844, 390], [1280, 720], [740, 360]];
const browser = await chromium.launch();
for (const [W, H] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: W < 1000, hasTouch: W < 1000, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(200);
  await p.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tutorialSeen: true, name: "熊二", tokens: 47, chars: ["deepseek", "gpt", "grok", "claude", "doubao", "glm"], seenUnlock: ["grok", "claude", "doubao", "glm"] })));
  await p.reload(); await p.waitForTimeout(2200);
  const r = await p.evaluate(() => { const b = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; };
    const info = document.querySelector(".lb-info"); const sk = [...info.querySelectorAll(".sk-tx")].pop();
    return { topbar: b(".lb .topbar"), tiles: b(".lb-tiles"), info: b(".lb-info"), lastSkillBottom: Math.round(sk.getBoundingClientRect().bottom), infoInnerBottom: Math.round(info.getBoundingClientRect().bottom) }; });
  console.log(W + "x" + H, JSON.stringify(r));
  await p.screenshot({ path: `/home/claude/game/tmp/lb3_${W}.png` });
  if (W === 804) { await p.tap(".t-gacha"); await p.waitForTimeout(1200); await p.tap(".fcard >> nth=0"); for (const t of [700, 1300, 2200, 2700]) { await p.waitForTimeout(t === 700 ? 700 : t - [700, 1300, 2200, 2700][[700, 1300, 2200, 2700].indexOf(t) - 1]); await p.screenshot({ path: `/home/claude/game/tmp/rev_${t}.png` }); } }
  await ctx.close();
}
await browser.close();
