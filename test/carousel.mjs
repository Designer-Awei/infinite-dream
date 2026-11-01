import { createRequire } from "module"; const require = createRequire(import.meta.url); const { chromium } = require("playwright");
const b = await chromium.launch();
for (const [W, H, touch] of [[804, 360, true], [1280, 720, false], [667, 375, true]]) {
  const ctx = await b.newContext({ viewport: { width: W, height: H }, isMobile: touch, hasTouch: touch, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto("http://localhost:8765/index.html"); await p.waitForTimeout(200);
  await p.evaluate(() => localStorage.setItem("ai-girls-dungeon-v1", JSON.stringify({ tutorialSeen: true, name: "熊大", tokens: 177, chars: ["deepseek", "gpt", "grok"], seenUnlock: ["grok"], sel: "gpt", talents: { t_revive: 1 }, stats: { runs: 3, bossKills: 1, kills: 80, endlessBest: 9 }, maps: { grass: 1 }, playMode: { map: "ice" } })));
  await p.reload(); await p.waitForTimeout(2200);
  await p.screenshot({ path: `/home/claude/game/tmp/car_a_${W}.png` });
  const lobby = await p.evaluateHandle(() => document.querySelector(".lb"));
  // next via arrow, then swipe (scroll) to the last
  await p.evaluate(() => (() => { const t = document.querySelector(".lm-track"), c = t.children[[...t.children].findIndex((x) => x.classList.contains("on")) + 1]; t.scrollTo({ left: c.offsetLeft - (t.clientWidth - c.offsetWidth) / 2 }); })()); await p.waitForTimeout(800);
  let st = await p.evaluate(() => ({ sel: JSON.parse(localStorage.getItem("ai-girls-dungeon-v1")).playMode, btn: document.querySelector(".play-btn .pt").textContent, dis: document.querySelector(".play-btn").disabled, on: document.querySelector(".lm-track .mcard.on").dataset.id }));
  console.log(W, "after arrow", JSON.stringify(st));
  await p.screenshot({ path: `/home/claude/game/tmp/car_b_${W}.png` });
  await p.evaluate(() => { const t = document.querySelector(".lm-track"); t.scrollTo({ left: t.scrollWidth }); }); await p.waitForTimeout(900);
  st = await p.evaluate(() => ({ sel: JSON.parse(localStorage.getItem("ai-girls-dungeon-v1")).playMode, btn: document.querySelector(".play-btn .pt").textContent, on: document.querySelector(".lm-track .mcard.on").dataset.id }));
  console.log(W, "after swipe", JSON.stringify(st), "same lobby:", await p.evaluate((l) => l === document.querySelector(".lb"), lobby));
  await p.screenshot({ path: `/home/claude/game/tmp/car_c_${W}.png` });
  await p.evaluate(() => document.querySelector(".li-kit").click()); await p.waitForTimeout(500);
  await p.screenshot({ path: `/home/claude/game/tmp/car_kit_${W}.png` });
  console.log("errs", errs.join("|"));
  await ctx.close();
}
await b.close();
