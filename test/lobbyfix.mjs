import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const browser = await chromium.launch();
for (const [w, h, name, m] of [[1920, 898, "pc", false], [844, 390, "phone", true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: m, hasTouch: m, deviceScaleFactor: m ? 2 : 1 });
  const p = await ctx.newPage(); p.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(300);
  await p.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tokens: 170, chars: ["deepseek", "gpt"], sel: "deepseek", tutorialSeen: true, stats: { kills: 86, reactions: 19, pulls: 2, bossKills: 0, best: 4 } })));
  await p.reload(); await p.waitForTimeout(2200);
  const hs = [];
  for (const k of [1, 2, 1]) {
    await p.click(`.lb-roster .rcard:nth-child(${k})`); await p.waitForTimeout(500);
    hs.push(await p.evaluate(() => { const i = document.querySelector(".lb-info").getBoundingClientRect(), r = document.querySelector(".lb-roster").getBoundingClientRect(); return [Math.round(i.height), Math.round(i.bottom), Math.round(r.top)].join("/"); }));
    await p.screenshot({ path: `/home/claude/game/tmp/lf_${name}_${k}.png` });
  }
  console.log(name, "info height/bottom/roster top:", hs.join("  "));
  await ctx.close();
}
await browser.close();
